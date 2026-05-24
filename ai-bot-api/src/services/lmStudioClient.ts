import { config } from "../config/env.js";
import type {
  ChatMessageDto,
  LmStudioChatCompletionRequest,
  LmStudioChatCompletionResponse,
  LmStudioChatCompletionStreamChunk,
} from "../types/chat.js";
import { AppError } from "../utils/AppError.js";

const systemMessage: ChatMessageDto = {
  role: "system",
  content:
    "你是一个专业的 AI 助手。请使用中文直接输出最终的回答，绝对不要包含任何形如 <think> 的思考、推理、草稿或内心独白过程。",
};

export interface ChatCompletionStreamDelta {
  id?: string;
  created?: number;
  content: string;
}

export const createChatCompletion = async (
  history: ChatMessageDto[],
): Promise<LmStudioChatCompletionResponse> => {
  // 第一步：组装非流式请求体，保留给后续调试或兼容场景使用。
  const requestBody: LmStudioChatCompletionRequest = {
    model: config.lmStudioModel,
    messages: [systemMessage, ...history],
    temperature: 1,
    stream: false,
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
  return response.json() as Promise<LmStudioChatCompletionResponse>;
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
): Promise<AsyncGenerator<ChatCompletionStreamDelta>> => {
  // 第一步：组装开启 stream 的 LM Studio 请求体。
  const requestBody: LmStudioChatCompletionRequest = {
    model: config.lmStudioModel,
    messages: [systemMessage, ...history],
    temperature: 1,
    stream: true,
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

    try {
      while (true) {
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
            return;
          }

          // 第八步：提取本次增量文本，没有内容的心跳或元数据块直接跳过。
          const parsedData = parseLmStudioStreamData(rawData);
          const content = parsedData?.choices?.[0]?.delta?.content;

          if (!content) {
            continue;
          }

          yield {
            id: parsedData?.id,
            created: parsedData?.created,
            content,
          };
        }
      }
    } finally {
      // 第九步：无论正常结束还是异常中断，都释放底层 reader。
      reader.releaseLock();
    }
  }

  // 第十步：返回异步生成器，由控制器决定如何转发给浏览器。
  return readStream();
};
