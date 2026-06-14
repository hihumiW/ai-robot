import {
  Check,
  ChevronDown,
  Mic,
  Plus,
  SendHorizontal,
  Square,
  X,
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
import { compressImageFile } from "../utils";

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
      openPreview,
    } = useChatContext();
    const textareaRef = ref<HTMLTextAreaElement | null>(null);
    const fileInputRef = ref<HTMLInputElement | null>(null);
    const chatBoxContent = ref("");
    const selectedImages = ref<string[]>([]); // 存储多个图片的 Base64 字符串数组

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

    const handleFileChange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // 调用通用的图片压缩工具，超过 5MB 自动压缩
          const base64 = await compressImageFile(file, {
            maxSizeInBytes: 5 * 1024 * 1024, // 5MB 阈值，可配置
          });
          selectedImages.value.push(base64);
        } catch (error) {
          console.error("图片读取或压缩失败:", error);
        }
      }

      // 清空 input 的 value，以允许重复选择同一张图片
      target.value = "";
    };

    const removeSelectedImage = (index: number) => {
      selectedImages.value.splice(index, 1); // 根据索引移除图片
    };

    const triggerMessageSend = () => {
      // 第三步：生成中禁止重复发送，空输入和无图片也不触发请求。
      const content = chatBoxContent.value.trim();

      if ((!content && selectedImages.value.length === 0) || isGenerating.value) {
        return;
      }

      // 第四步：先发起流式聊天，再清空输入和图片。
      const images = selectedImages.value.length > 0 ? [...selectedImages.value] : undefined;
      sendMessage(content, images);
      chatBoxContent.value = "";
      selectedImages.value = [];
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
      <div class="flex flex-col w-full gap-3">
        {/* 图片预览区域 */}
        {selectedImages.value.length > 0 && (
          <div class="flex flex-wrap items-center gap-3 self-start bg-zinc-800/50  rounded-xl border border-zinc-700/40">
            {selectedImages.value.map((img, index) => (
              <div key={index} class="relative w-20 h-20">
                <div class="w-full h-full rounded-lg overflow-hidden cursor-zoom-in">
                  <img
                    src={img}
                    class="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    onClick={() => openPreview(img)}
                    title="点击预览大图"
                  />
                </div>
                <button
                  onClick={() => removeSelectedImage(index)}
                  class="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-red-400 transition-colors shadow-md"
                  title="删除图片"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          class={[
            "flex w-full items-center gap-3 rounded-[28px] bg-[#1f1f20] px-4 py-3 text-sm text-zinc-400 transition-colors ",
            props.compact ? "min-h-14" : "min-h-16",
          ]}
        >
          {/* 隐藏的图片输入框：支持多选 */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            class="hidden"
            onChange={handleFileChange}
          />

          <Button
            variant="ghost"
            size="icon-md"
            shape="pill"
            onClick={() => fileInputRef.value?.click()}
            disabled={isGenerating.value}
            title="上传图片"
          >
            <Plus size={20} strokeWidth={2.2} />
          </Button>

          <textarea
            ref={textareaRef}
            value={chatBoxContent.value}
            rows={1}
            placeholder={selectedImages.value.length > 0 ? "对已选图片进行提问..." : "询问 AI Bot"}
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
      </div>
    );
  },
});
