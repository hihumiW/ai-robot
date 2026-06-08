import { config } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export interface TavilySearchResponse {
  response_time: number;
  query: string;
  request_id: string;
  results: TavilySearchResult[];
}

export interface TavilySearchResult {
  title: string;
  content: string;
  favicon: string;
  url: string;
  score: number;
}

// 驱动器选择：'tavily' 或 'searxng'
const CURRENT_PROVIDER = "tavily";

const webSearch = async (query: string) : Promise<string> => {
  if (CURRENT_PROVIDER === "tavily") {
    return await searchWithTavily(query);
  }else{
    return '联网工具咱不可用。'
  }
};

const searchWithTavily = async (query: string): Promise<string> => {
  const apiKey = config.tavilyApiKey;
  if (!apiKey) {
    throw new AppError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Tavily API 密钥未配置，请检查环境变量或 .env 文件。",
    );
  }
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
      }),
    });

    if (!response.ok) {
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "请求Tavily失败");
    }
    const responseData = (await response.json()) as TavilySearchResponse;
    const formattedResults = responseData.results
      .map(
        (r, idx) =>
          `[搜索结果 ${idx + 1}]\n标题: ${r.title}\n链接: ${r.url}\n内容摘要: ${r.content}\n---`,
      )
      .join("\n\n");

    return formattedResults || "没有找到相关的联网搜索结果。";
  } catch (error) {
    console.error("请求Tavily失败", error);
    throw new AppError(500, "INTERNAL_SERVER_ERROR", "请求Tavily失败");
  }
};

export default webSearch;
