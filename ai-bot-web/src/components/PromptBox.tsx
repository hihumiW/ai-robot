import { ChevronDown, Mic, Plus, SendHorizontal, Square } from "@lucide/vue";
import { defineComponent, nextTick, ref } from "vue";
import { useChatContext } from "../composition/useChat";
import Button from "./Button";

type PromptBoxProps = {
  compact?: boolean;
};

const maxTextareaHeight = 120;

export default defineComponent<PromptBoxProps>({
  name: "PromptBox",
  props: {
    compact: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { isGenerating, sendMessage, stopGenerating } = useChatContext();
    const textareaRef = ref<HTMLTextAreaElement | null>(null);
    const chatBoxContent = ref("");

    const resizeTextarea = () => {
      // 第一步：根据输入内容自动调整文本框高度。
      const textarea = textareaRef.value;

      if (!textarea) {
        return;
      }

      textarea.style.height = "auto";
      const nextHeight = Math.min(textarea.scrollHeight, maxTextareaHeight);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > maxTextareaHeight ? "auto" : "hidden";
    };

    const updateChatBoxContent = (event: Event) => {
      // 第二步：同步输入框内容，并刷新文本框高度。
      chatBoxContent.value = (event.target as HTMLTextAreaElement).value;
      resizeTextarea();
    };

    const triggerMessageSend = () => {
      // 第三步：生成中禁止重复发送，空输入也不触发请求。
      const content = chatBoxContent.value.trim();

      if (!content || isGenerating.value) {
        return;
      }

      // 第四步：先发起流式聊天，再清空输入框。
      sendMessage(content);
      chatBoxContent.value = "";
      nextTick(resizeTextarea);
    };

    const handleChatBoxKeypress = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        triggerMessageSend();
        return false;
      }
    };

    return () => (
      <div
        class={[
          "flex w-full items-center gap-3 rounded-[28px] bg-[#1f1f20] px-4 py-3 text-sm text-zinc-400 shadow-[0_18px_60px_rgba(0,0,0,0.34)] transition-colors hover:bg-[#252526]",
          props.compact ? "min-h-14" : "min-h-16",
        ]}
      >
        <Button class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-200 transition-colors hover:bg-zinc-700/70 hover:text-white">
          <Plus size={20} strokeWidth={2.2} />
        </Button>

        <textarea
          ref={textareaRef}
          value={chatBoxContent.value}
          rows={1}
          placeholder="询问 AI Bot"
          onInput={updateChatBoxContent}
          onKeypress={handleChatBoxKeypress}
          disabled={isGenerating.value}
          class="min-h-8 min-w-0 flex-1 resize-none overflow-y-hidden border-0 bg-transparent py-1 text-left leading-6 text-zinc-100 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ maxHeight: `${maxTextareaHeight}px` }}
        />

        <div class="flex shrink-0 items-center gap-1.5 text-zinc-300">
          <Button class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-zinc-700/70 hover:text-white">
            <Mic size={18} />
          </Button>
          <Button
            onClick={isGenerating.value ? stopGenerating : triggerMessageSend}
            class={[
              "flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 transition-colors hover:bg-white",
            ]}
          >
            {isGenerating.value ? (
              <Square size={16} fill="currentColor" />
            ) : (
              <SendHorizontal size={16} />
            )}
          </Button>
        </div>
      </div>
    );
  },
});
