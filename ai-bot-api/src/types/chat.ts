export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessageDto {
  role: ChatRole;
  content: string;
}

export interface ChatRequestDto {
  history: ChatMessageDto[];
}

export interface ChatResponseDto {
  reply: string;
  id: string;
  created: number;
}

export interface LmStudioChatCompletionRequest {
  model: string;
  messages: ChatMessageDto[];
  temperature: number;
  stream: boolean;
}

export interface LmStudioChatCompletionResponse {
  id: string;
  created: number;
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
    };
  }>;
}

export interface LmStudioChatCompletionStreamChunk {
  id?: string;
  created?: number;
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}
