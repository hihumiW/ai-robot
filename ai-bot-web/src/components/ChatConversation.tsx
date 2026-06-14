import { defineComponent, unref } from "vue";
import ChatMessage from "./ChatMessage";
import { useChatContext } from "../composition/useChat";

export default defineComponent({
  name: "ChatConversation",
  setup() {
    const { chatMessages, lastUserMessageId, isGenerating, regenerateContent } =
      useChatContext();

    return () => (
      <div class="mx-auto flex w-full max-w-4xl flex-col">
        {chatMessages.value.map((message) => {
          // 第一步：assistant 的 sending 状态负责驱动消息级 loading。
          const loading =
            message.role === "assistant" && message.status === "sending";

          return (
            <ChatMessage
              key={message.id}
              id={message.id}
              role={message.role}
              content={message.content}
              images={message.images}
              status={message.status}
              isLastUserMessage={
                !isGenerating.value && message.id === lastUserMessageId.value
              }
              loading={loading}
              hint="AI 正在思考..."
              errorMessage={message.errorMessage}
              onRegenerateContent={(content) =>
                regenerateContent(message.id, content)
              }
            />
          );
        })}
      </div>
    );
  },
});
