import { config } from "../config/env.js";
import type {
  ChatCompletionFunctionTool,
  ChatMessageDto,
  LmStudioChatCompletionRequest,
  LmStudioChatCompletionResponse,
  LmStudioChatCompletionStreamChunk,
  ReasoningEffort,
} from "../types/chat.js";
import { AppError } from "../utils/AppError.js";
import { getSystemPrompt } from "../utils/prompt.js";
import webSearch from "./searchService.js";

const tools: ChatCompletionFunctionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "当用户询问最新消息、时事、天气、产品发布或你不知道的实时信息时，调用此工具检索互联网。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "精炼的搜索引擎关键词",
          },
        },
        required: ["query"],
      },
    },
  },
];

const systemMessage: ChatMessageDto = {
  role: "system",
  content: getSystemPrompt(),
};

//将包含图片的ChatMessageDto 转换为 OpenAI标准的Message
const mapToLmStudioMessage = (msg: ChatMessageDto) => {
  if (msg.images && msg.images.length > 0) {
    //将图片和文字转换为对多模态的格式
    const contentPart: any[] = [
      {
        type: "text",
        text: msg.content,
      },
    ];
    for (const imgBase64 of msg.images) {
      contentPart.push({
        type: "image_url",
        image_url: {
          url: imgBase64,
        },
      });
    }

    return {
      role: msg.role,
      content: contentPart,
    };
  }
  return {
    role: msg.role,
    content: msg.content,
  };
};

export interface ChatCompletionStreamDelta {
  id?: string;
  created?: number;
  content: string;
  reasoning_content?: string;
}

export interface ChatCompletionCreateParams {
  reasoning_effort?: ReasoningEffort;
}

export const createChatCompletion = async (
  history: ChatMessageDto[],
  completionParams?: ChatCompletionCreateParams,
): Promise<LmStudioChatCompletionResponse> => {
  // 第一步：组装非流式请求体，保留给后续调试或兼容场景使用。
  const requestBody: LmStudioChatCompletionRequest = {
    model: config.lmStudioModel,
    messages: [systemMessage, ...history].map(message => mapToLmStudioMessage(message)),
    temperature: 1,
    stream: false,
    reasoning_effort: completionParams?.reasoning_effort || "medium",
    tools,
  };

  // 第二步：调用 LM Studio 的 OpenAI-compatible chat completions 接口。
  const response = await fetch(
    `${config.lmStudioBaseUrl}/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  // 第三步：把模型服务错误转换成统一的业务错误。
  if (!response.ok) {
    throw new AppError(
      502,
      "LLM_SERVICE_ERROR",
      `LM Studio API error: ${response.status} ${response.statusText}`,
    );
  }

  // 第四步：返回完整的非流式模型响应。
  const responseData =
    (await response.json()) as LmStudioChatCompletionResponse;

  // 第五步： 判断LLM 是否想要调用工具
  const choice = responseData.choices?.[0];
  const toolCalls = choice?.message?.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    const toolCall = toolCalls[0];
    const { name: toolCallName, arguments: toolCallArguments } =
      toolCall.function;
    if (toolCallName === "web_search") {
      let searchQuery = "";
      try {
        searchQuery = JSON.parse(toolCallArguments).query || "";
      } catch (error) {
        console.error("解析web_search toolCall参数失败", error);
      }

      console.log(`[非流式联网搜索] 触发 web_search，关键词: "${searchQuery}"`);
      const searchResult = await webSearch(searchQuery);

      console.log(`[非流式检索结果] ${searchResult}...`);
      const toolCallMessage: ChatMessageDto = choice.message;
      const toolResultMessage: ChatMessageDto = {
        role: "tool",
        content: searchResult,
        tool_call_id: toolCall.id,
      };
      console.log(
        `[非流式检索成功] 已抓取数据且合并上下文，发起第二次模型调用...`,
      );

      const nextHistory = [...history, toolCallMessage, toolResultMessage];
      return createChatCompletion(nextHistory, completionParams);
    }
  }

  return responseData;
};

const parseLmStudioStreamData = (
  rawData: string,
): LmStudioChatCompletionStreamChunk | null => {
  // 第一步：LM Studio 会用 [DONE] 标记流结束，这一段不需要再解析 JSON。
  if (rawData === "[DONE]") {
    return null;
  }

  // 第二步：把 OpenAI-compatible 的 data JSON 解析成类型化对象。
  return JSON.parse(rawData) as LmStudioChatCompletionStreamChunk;
};

export const openChatCompletionStream = async (
  history: ChatMessageDto[],
  completionParams?: ChatCompletionCreateParams,
  depth = 0,
): Promise<AsyncGenerator<ChatCompletionStreamDelta>> => {
  // 第一步：组装开启 stream 的 LM Studio 请求体。
  const requestBody: LmStudioChatCompletionRequest = {
    model: config.lmStudioModel,
    messages: [systemMessage, ...history].map(message => mapToLmStudioMessage(message)),
    temperature: 1,
    stream: true,
    reasoning_effort: completionParams?.reasoning_effort || "medium",
    tools,
  };

  // 第二步：先发起模型请求，确保模型连接成功后再让控制器写 SSE 响应头。
  const response = await fetch(
    `${config.lmStudioBaseUrl}/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  // 第三步：模型服务异常时抛出错误，让控制器在未写入 SSE 前返回 JSON 错误。
  if (!response.ok) {
    throw new AppError(
      502,
      "LLM_SERVICE_ERROR",
      `LM Studio API error: ${response.status} ${response.statusText}`,
    );
  }

  // 第四步：没有响应体就无法流式读取，需要明确报错。
  if (!response.body) {
    throw new AppError(
      502,
      "LLM_SERVICE_ERROR",
      "LM Studio returned an empty stream body.",
    );
  }

  async function* readStream(): AsyncGenerator<ChatCompletionStreamDelta> {
    // 第五步：用 TextDecoder 逐块解码模型返回的 Uint8Array。
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    // buffer用于存储未接受完的响应内容
    let buffer = "";

    const toolCalls: any[] = [];

    try {
      outerLoop: while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        // 第六步：把半包内容暂存在 buffer 中，按 SSE 空行边界切分完整事件。
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const eventText of events) {
          // 第七步：只读取 data 行，兼容一个 SSE 事件包含多行 data 的情况。
          const dataLines = eventText
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""));

          if (dataLines.length === 0) {
            continue;
          }

          const rawData = dataLines.join("\n").trim();

          if (rawData === "[DONE]") {
            break outerLoop;
          }

          // 第八步：提取本次增量文本，没有内容的心跳或元数据块直接跳过。
          const parsedData = parseLmStudioStreamData(rawData);
          // 收集流式的 tool_calls
          const deltaToolCalls = parsedData?.choices?.[0]?.delta?.tool_calls;
          if (deltaToolCalls && Array.isArray(deltaToolCalls)) {
            for (const tc of deltaToolCalls) {
              const idx = tc.index ?? 0;
              if (!toolCalls[idx]) {
                toolCalls[idx] = {
                  id: tc.id || "",
                  type: tc.type || "function",
                  name: tc.function?.name || "",
                  arguments: "",
                };
              }
              if (tc.id) toolCalls[idx].id = tc.id;
              if (tc.type) toolCalls[idx].type = tc.type;
              if (tc.function?.name) toolCalls[idx].name = tc.function.name;
              // 拼接arguments
              if (tc.function?.arguments) {
                toolCalls[idx].arguments += tc.function.arguments;
              }
            }
          }

          const content = parsedData?.choices?.[0]?.delta?.content;
          const reasoningContent = parsedData?.choices?.[0]?.delta?.reasoning_content 
            || (parsedData?.choices?.[0]?.delta as any)?.reasoning
            || (parsedData?.choices?.[0]?.delta as any)?.thinking;

          if (reasoningContent || content) {
            yield {
              id: parsedData?.id,
              created: parsedData?.created,
              content: content ?? "",
              reasoning_content: reasoningContent ?? "",
            };
          }
        }
      }
    } finally {
      try {
        // 主动通知底层流：消费者已经不想要数据了，立即关闭与大模型的 HTTP 连接！
        await reader.cancel();
      } catch (error) {
        console.error("取消下游大模型流失败:", error);
      }
      // 第九步：无论正常结束还是异常中断，都释放底层 reader。
      reader.releaseLock();
    }

    // 第十步：读取完毕后检查是否有工具调用
    if (toolCalls.length > 0) {
      if (depth >= 3) {
        console.warn(
          `[流式联网搜索警告] 连续流式工具调用已达 3 次上限，强制终止。`,
        );
        return;
      }

      const toolCall = toolCalls[0];
      if (toolCall.name === "web_search") {
        let searchQuery = "";
        try {
          searchQuery = JSON.parse(toolCall.arguments).query || "";
        } catch (error) {
          console.error("流式解析web_search参数失败", error);
        }

        console.log(`[流式联网搜索] 触发 web_search，关键词: "${searchQuery}"`);
        const searchResult = await webSearch(searchQuery);

        const toolCallMessage: ChatMessageDto = {
          role: "assistant",
          content: "",
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: tc.arguments,
            },
          })),
        };

        const toolResultMessage: ChatMessageDto = {
          role: "tool",
          content: searchResult,
          tool_call_id: toolCall.id,
        };

        console.log(
          `[流式检索成功] 已抓取数据（${searchResult.length}字符），发起二次模型流式生成...`,
        );
        const nextHistory = [...history, toolCallMessage, toolResultMessage];

        // 递归发起二次流
        const secondStream = await openChatCompletionStream(
          nextHistory,
          completionParams,
          depth + 1,
        );

        // 转发流
        for await (const chunk of secondStream) {
          yield chunk;
        }
      }
    }
  }

  // 返回异步生成器，由控制器决定如何转发给浏览器。
  return readStream();
};
