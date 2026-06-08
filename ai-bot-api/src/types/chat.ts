export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessageDto {
  role: ChatRole;
  content: string;
  tool_call_id?: string;
  tool_calls?: ChatCompletionToolCall[];
}

export interface ChatRequestDto {
  conversationId: string;
  content: string;
}

export interface ChatResponseDto {
  reply: string;
  id: string;
  created: number;
  isNewConversation?: boolean;
  generatedTitle?: string;
}

export type ReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export interface LmStudioChatCompletionRequest {
  model: string;
  messages: ChatMessageDto[];
  temperature: number;
  stream: boolean;
  reasoning_effort?: ReasoningEffort;
  tools?: ChatCompletionFunctionTool[];
}

export interface LmStudioChatCompletionResponse {
  id: string;
  created: number;
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
      tool_calls?: ChatCompletionToolCall[];
    };
  }>;
}

export interface LmStudioChatCompletionStreamChunk {
  id?: string;
  created?: number;
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: any[];
    };
  }>;
}

export interface RegenerateChatRequestDto {
  conversationId: string;
  messageId: string;
  regenerateContent: string;
}

//给LLM 提供的工具列表
export interface ChatCompletionFunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
    required?: string[];
  };
}

// LLM 返回的工具调用
export interface ChatCompletionToolCall {
  type: "function";
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}
