import { computed, nextTick, onMounted, Ref, watch } from "vue";
import { ChatMessage } from "../types/chat";

export const useChatScroll = (
  containerRef: Ref<HTMLDivElement | null>,
  chatMessages: Ref<readonly ChatMessage[]>,
) => {
  let isSwitching = false;

  // ==========================================
  // 策略一：滚动定位到用户最后一条消息 (历史回显)
  // ==========================================
  const scrollToLastUserMessage = () => {
    nextTick(() => {
      const container = containerRef.value;
      if (!container) return;

      const userMessages = container.querySelectorAll(".user-message");
      //如果有最后一条用户消息， 那么滚动到用户发送的最后一条消息的位置
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[
          userMessages.length - 1
        ] as HTMLDivElement;
        lastUserMessage.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      } else {
        //兜底， 滚动到最底部
        container.scrollTop = container.scrollHeight;
      }
    });
  };

  //当整个chat messages 数组发生引用变化时，说明切换了会话，则触发scrollToLastUserMessage
  watch(
    () => chatMessages.value,
    (newVal) => {
      isSwitching = true;
      if (newVal.length > 0) {
        scrollToLastUserMessage();
      }
      nextTick(() => {
        isSwitching = false;
      });
    },
  );


  // 避免从welcome页面，切换到会话页面时， watch来没来得及加载，导致无法滚动到用户的最后一条消息
  onMounted(() => {
    if(chatMessages.value.length > 0){
        scrollToLastUserMessage();
    }
  })

  // ==========================================
  // 策略二：发送了新的消息， 自动滚到最底部
  // ==========================================

  const scrollToBottom = () => {
    const container = containerRef.value;
    if (!container) return;
    nextTick(() => {
      container.scrollTop = container.scrollHeight;
    });
  };

  //监听是否发了新的消息
  watch(
    () => chatMessages.value.length,
    () => {
      if (isSwitching) return;
      scrollToBottom();
    },
  );

  // ==========================================
  // 策略三：AI吐字时，自动滚动
  // ==========================================
  const handleStreamingScroll = () => {
    if (isSwitching) return;
    const container = containerRef.value;
    if (!container) return;

    // 判断当前用户是否滚动到底了
    const wasAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      50;
    if (wasAtBottom) {
      nextTick(() => {
        // 滚动到最底部
        container.scrollTop = container.scrollHeight;
      });
    }
  };

  //监听最后一条消息变化
  const lastMessageContent = computed(() => {
    const msgs = chatMessages.value || [];
    return msgs[msgs.length - 1]?.content || "";
  });

  watch(
    () => lastMessageContent.value,
    () => {
      handleStreamingScroll();
    },
  );

  return {
    scrollToLastUserMessage,
    scrollToBottom,
  };
};
