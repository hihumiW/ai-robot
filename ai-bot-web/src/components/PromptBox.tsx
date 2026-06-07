import {
  Check,
  ChevronDown,
  Mic,
  Plus,
  SendHorizontal,
  Square,
} from "@lucide/vue";
import { defineComponent, nextTick, ref } from "vue";
import { useChatContext } from "../composition/useChat";
import Button from "./Button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "./DropdownMenu";
import { Option } from "../types/shared";
import { ChatReasoningEffort } from "../types/chat";

type PromptBoxProps = {
  compact?: boolean;
};

const maxTextareaHeight = 120;

const CHAT_THINKING_OPTIONS: Option<ChatReasoningEffort>[] = [
  {
    label: "低",
    value: "low",
  },
  {
    label: "中",
    value: "medium",
  },
  {
    label: "高",
    value: "high",
  },
];

export default defineComponent<PromptBoxProps>({
  name: "PromptBox",
  props: {
    compact: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const {
      isGenerating,
      thinkingIntensity,
      sendMessage,
      stopGenerating,
      setThinkingIntensity,
    } = useChatContext();
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
          "flex w-full items-center gap-3 rounded-[28px] bg-[#1f1f20] px-4 py-3 text-sm text-zinc-400 transition-colors ",
          props.compact ? "min-h-14" : "min-h-16",
        ]}
      >
        <Button variant="ghost" size="icon-md" shape="pill">
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

        {/* 思考强度选择下拉菜单静态 UI */}
        <Dropdown placement="bottom-end" offset={16}>
          <DropdownTrigger>
            <Button
              variant="ghost"
              shape="pill"
              class=" hover:bg-zinc-700/80 text-zinc-300 hover:text-white"
            >
              <div class="flex gap-x-2 items-center ">
                <span>Thinking</span>
                <ChevronDown size={14} class="text-zinc-400" />
              </div>
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <div class="px-3 py-2 text-sm text-zinc-300">思考强度</div>
            <DropdownSeparator />
            {CHAT_THINKING_OPTIONS.map((option) => (
              <DropdownItem
                key={option.value}
                onClick={() => setThinkingIntensity(option.value)}
              >
                <div class="flex justify-between items-center">
                  {option.label}
                  {option.value === thinkingIntensity.value && (
                    <Check size={14} />
                  )}
                </div>
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>

        <div class="flex shrink-0 items-center gap-1.5 text-zinc-300">
          <Button variant="ghost" size="icon-md" shape="pill">
            <Mic size={18} />
          </Button>
          <Button
            onClick={isGenerating.value ? stopGenerating : triggerMessageSend}
            variant="primary"
            size="icon-md"
            shape="pill"
            title={isGenerating.value ? "停止生成" : "发送"}
          >
            {isGenerating.value ? (
              <Square size={16} />
            ) : (
              <SendHorizontal size={16} />
            )}
          </Button>
        </div>
      </div>
    );
  },
});
