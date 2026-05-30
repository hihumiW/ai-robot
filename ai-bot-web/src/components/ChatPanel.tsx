import { MoreVertical } from "@lucide/vue";
import { defineComponent, nextTick, ref, watch, computed } from "vue";
import ChatConversation from "./ChatConversation";
import PromptBox from "./PromptBox";
import { useChatContext } from "../composition/useChat";
import { useChatScroll } from "../composition/useChatScroll";

export default defineComponent({
  name: "ChatPanel",
  setup() {
    const chat = useChatContext();
    const scrollContainerRef = ref<HTMLDivElement | null>(null);
    useChatScroll(scrollContainerRef, chat.chatMessages);

    return () => (
      <section class="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#0d0d0e] text-zinc-100">
        <header class="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400">
          <MoreVertical size={20} />
        </header>

        <div
          class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-36 pt-16 sm:px-8 lg:px-12"
          ref={scrollContainerRef}
        >
          <ChatConversation />
        </div>

        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#0d0d0e] via-[#0d0d0e]/96 to-transparent" />
        <div class="absolute inset-x-0 bottom-7 px-5 sm:px-8 lg:px-12">
          <div class="mx-auto max-w-4xl">
            <PromptBox compact />
            <p class="mt-3 text-center text-xs text-zinc-500">
              AI Bot 目前是静态聊天界面，后续会接入本地模型和流式响应。
            </p>
          </div>
        </div>
      </section>
    );
  },
});
