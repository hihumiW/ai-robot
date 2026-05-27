import type { ApiRequestOptions, ApiResponse } from '../types/api';
import type {
  ChatStreamChunkEvent,
  ChatStreamDoneEvent,
  ChatStreamErrorEvent,
  SendChatRequest
} from '../types/chat';

export const apiBaseUrl = '/api';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiRequest<TData, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {}
): Promise<TData> {
  const { body, headers, ...restOptions } = options;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const payload = (await response.json()) as ApiResponse<TData>;

  if (!response.ok && payload.ok) {
    throw Error( `API request failed: ${payload.message || response.status}`)
  }

  return payload.data as TData;
}

export interface StreamChatRequestOptions {
  body: SendChatRequest;
  onChunk: (payload: ChatStreamChunkEvent) => void;
  onDone: (payload: ChatStreamDoneEvent) => void;
  onError: (payload: ChatStreamErrorEvent) => void;
}

interface ParsedSseEvent {
  event: string;
  data: string;
}

const parseSseEvent = (rawEvent: string): ParsedSseEvent | null => {
  // 第一步：按行读取 SSE 事件，分别收集 event 和 data 字段。
  const lines = rawEvent.split(/\r?\n/);
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.replace(/^event:\s?/, '').trim();
      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.replace(/^data:\s?/, ''));
    }
  }

  // 第二步：没有 data 的事件没有业务内容，直接跳过。
  if (dataLines.length === 0) {
    return null;
  }

  return {
    event,
    data: dataLines.join('\n')
  };
};

export async function streamChatRequest(
  options: StreamChatRequestOptions
): Promise<void> {
  // 第一步：用 fetch 发起 POST 请求，后续通过 response.body 逐块读取 SSE。
  const response = await fetch(`${apiBaseUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(options.body)
  });

  // 第二步：如果后端还没进入流式响应，错误会以普通 JSON 返回。
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | ApiResponse<never>
      | null;
    const message = payload?.ok === false ? payload.message : `API request failed: ${response.status}`;

    options.onError({ message });
    throw new Error(message);
  }

  if (!response.body) {
    const message = '浏览器没有收到可读取的响应流。';

    options.onError({ message });
    throw new Error(message);
  }

  // 第三步：创建 reader 和 decoder，用来把二进制流逐块转为文本。
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // 第四步：SSE 事件可能被拆成半包，先拼到 buffer 再按空行切分。
      buffer += decoder.decode(value, { stream: true });
     
      const rawEvents = buffer.split(/\r?\n\r?\n/);
      buffer = rawEvents.pop() ?? '';

      for (const rawEvent of rawEvents) {
        const parsedEvent = parseSseEvent(rawEvent);

        if (!parsedEvent) {
          continue;
        }

        // 第五步：根据事件类型把 JSON 数据分发给聊天状态层。
        if (parsedEvent.event === 'chunk') {
          options.onChunk(JSON.parse(parsedEvent.data) as ChatStreamChunkEvent);
          continue;
        }

        if (parsedEvent.event === 'done') {
          options.onDone(JSON.parse(parsedEvent.data) as ChatStreamDoneEvent);
          continue;
        }

        if (parsedEvent.event === 'error') {
          const payload = JSON.parse(parsedEvent.data) as ChatStreamErrorEvent;

          options.onError(payload);
          throw new Error(payload.message);
        }
      }
    }
  } finally {
    // 第六步：请求结束后释放 reader，避免占用浏览器流资源。
    reader.releaseLock();
  }
}
