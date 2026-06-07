export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessageDto {
  role: ChatRole;
  content: string;
}

export interface ChatRequestDto {
  conversationId : string;
  content : string;
}

export interface ChatResponseDto {
  reply: string;
  id: string;
  created: number;
  isNewConversation? : boolean;
  generatedTitle? : string;
}

export type ReasoningEffort  = 'none' | 'minimal' | 'low' | 'medium' | 'high' |  'xhigh';

export interface LmStudioChatCompletionRequest {
  model: string;
  messages: ChatMessageDto[];
  temperature: number;
  stream: boolean;
  reasoning_effort? : ReasoningEffort; 
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

export interface RegenerateChatRequestDto {
  conversationId : string;
  messageId : string;
  regenerateContent : string;
}