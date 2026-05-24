import { raw, type RequestHandler } from "express";
import type { ApiResponse } from "../types/api.js";
import { successResponse } from "../utils/apiResponse.js";
import { config } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

interface TestResponseDto {
  message: string;
}

export const getTest: RequestHandler<
  Record<string, never>,
  ApiResponse<TestResponseDto>
> = async (_req, res, next) => {
  //测试处理 SSE

  //准备模型参数
  const llmRequestParams = {
    model: config.lmStudioModel,
    messages: [
      {
        role: "system",
        content:
          "你是一个专业的 AI 助手。请使用中文直接输出最终的回答，绝对不要包含任何形如 <think> 的思考、推理、草稿或内心独白过程。",
      },
      {
        role: "user",
        content: "你是谁?",
      },
    ],
    stream: true, // 开启流式返回
  };
  //准备请求模型
  //请求后，模型响应成功 则代表握手成功
  const response = await fetch(`${config.lmStudioBaseUrl}/v1/chat/completions`, {
    headers: {
      "Content-Type": "application/json",
    },
    method: 'post',
    body: JSON.stringify(llmRequestParams),
  });
  console.log(response);
  if (!response.ok) {
    return next(new AppError(500, "LLM_SERVICE_ERROR", "LLM 服务错误"))
  }
  if(!response.body){
    return next(new AppError(500, "LLM_SERVICE_ERROR", "LLM 服务没有响应任何内容"));
  }
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  // 开始读取流
  const reader = response.body.getReader();
    // 用于将二进制流转换为中文的decoder
    const decoder = new TextDecoder("UTF-8");
    let fullText = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: true });
      // 使用\n\n 或者 \r\n  解析每一次event
      const events = buffer.split(/\n\n/);
      buffer = events.pop() ?? "";
      for (const event of events) {
        // 每次event 中可能会包含， 多个data
        const datas = event.split('\n')
          .filter(line => line.startsWith("data:"))
          .map(line => line.replace(/^data: /, ''))
        if(!datas.length) continue;
        const rawData = datas.join('\n').trim();
        if(rawData === "[DONE]"){
          res.write(`${JSON.stringify({ event : 'done', content : fullText })}\n`)
          return res.end()
        }
        const parsedDatas = JSON.parse(rawData);
        const content = parsedDatas.choices[0]?.delta?.content;
        if(!content) continue;
        fullText += content;
        res.write(`${JSON.stringify({ event : 'chunk',  content })}\n`)
      }
      if (done) break;
    }
    return res.end();
};
