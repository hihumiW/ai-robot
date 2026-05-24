import { defineComponent } from 'vue';
import ChatMessage from './ChatMessage';
import { useChatContext } from '../composition/useChat';

export default defineComponent({
  name: 'ChatConversation',
  setup() {
    const { chatMessages } = useChatContext();

    return () => (
      <div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {chatMessages.value.map((message) => {
          // 第一步：assistant 的 sending 状态负责驱动消息级 loading。
          const loading =
            message.role === 'assistant' && message.status === 'sending';

          return (
            <ChatMessage
              key={message.id}
              role={message.role}
              status={message.status}
              loading={loading}
              hint="AI 正在思考..."
              errorMessage={message.errorMessage}
            >
              {message.content}
            </ChatMessage>
          );
        })}
      </div>
    );
  }
});
