import { Copy, Edit, LoaderCircle } from "@lucide/vue";
import type { PropType, VNodeChild } from "vue";
import { defineComponent, ref, watch, nextTick } from "vue";
import MarkdownIt from "markdown-it";
import type { ChatMessageStatus, ChatRole } from "../types/chat";

import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css"; // Vite 会自动把这个 CSS 注入到页面中
import clsx from "clsx";
import Button from "./Button";
import { useToast } from "../composition/useToast";
import { useChatContext } from "../composition/useChat";

const md: MarkdownIt = new MarkdownIt({
  html: true, // 允许解析原生的 HTML 标签
  linkify: true, // 自动把文本中的 URL 转为可点击的 <a> 链接
  breaks: true, // 允许识别换行符为 <br>
  highlight(str, lang): string {
    if (str && hljs.getLanguage(lang)) {
      try {
        return `<pre><code class="hljs language-${lang}">${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`;
      } catch (e) {
        console.error("代码高亮失败:", e);
      }
    }
    // 兜底：如果模型没写语言或者语言不支持，进行安全的 HTML 转义后原样渲染
    return `<pre><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

const MessageAction = defineComponent({
  name: "MessageAction",
  props: {
    align: {
      type: String as PropType<"left" | "right">,
      required: true,
    },
    disabled: {
      type: Boolean,
    },
    actions: {
      type: Array as PropType<string[]>,
    },
  },
  emits: ["actionClick"],
  setup(props, { slots, emit }) {
    const showButton = (action: string) => props.actions?.includes(action);
    const buttonsConfig = [
      {
        title: "复制",
        icon: Copy,
        action: "copy",
      },
      {
        title: "编辑",
        icon: Edit,
        action: "edit",
      },
    ];
    return () => {
      const showActions = Boolean(props.actions?.length) && !props.disabled;
      return (
        <div class="flex flex-col w-full gap-y-3 group">
          {slots?.default?.()}
          <div
            class={clsx("flex gap-x-2 invisible", {
              "justify-start": props.align === "left",
              "justify-end": props.align === "right",
              "group-hover:visible": showActions,
            })}
          >
            {buttonsConfig.map((config) => {
              return (
                showButton(config.action) && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    shape="rounded"
                    title={config.title}
                    onClick={() => emit("actionClick", config.action)}
                  >
                    <config.icon size={16} />
                  </Button>
                )
              );
            })}
          </div>
        </div>
      );
    };
  },
});

export default defineComponent({
  name: "ChatMessage",
  props: {
    id: {
      type: String,
      required: true,
    },
    role: {
      type: String as PropType<ChatRole>,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    images: {
      type: Array as PropType<readonly string[]>,
      default: () => [],
    },
    status: {
      type: String as PropType<ChatMessageStatus>,
      default: "done",
    },
    loading: {
      type: Boolean,
      default: false,
    },
    hint: {
      type: String,
      default: "",
    },
    errorMessage: {
      type: String,
      default: "",
    },
    isLastUserMessage: {
      type: Boolean,
    },
    thinkingContent: {
      type: String,
      default: "",
    },
    isThinking: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["regenerateContent"],
  setup(props, { emit }) {
    const toast = useToast();
    const { openPreview } = useChatContext();
    const isEditing = ref(false);
    const editContent = ref<string>(props.content);
    const thinkingContainerRef = ref<HTMLDivElement | null>(null);

    watch(
      () => props.thinkingContent,
      (newVal) => {
        if (newVal) {
          nextTick(() => {
            if (thinkingContainerRef.value) {
              thinkingContainerRef.value.scrollTop =
                thinkingContainerRef.value.scrollHeight;
            }
          });
        }
      },
    );

    const handleMessageAction = (action: string) => {
      if (action === "copy") {
        navigator.clipboard
          .writeText(props.content)
          .then(() => toast.success("复制成功"))
          .catch(() => toast.error("复制失败"));
      }
      if (action === "edit") {
        isEditing.value = true;
        editContent.value = props.content;
      }
    };

    const handleEditCancel = () => {
      isEditing.value = false;
    };

    const handleEditConfirm = () => {
      isEditing.value = false;
      const trimedContent = editContent.value.trim();
      if (props.content === trimedContent) return;
      emit("regenerateContent", trimedContent);
    };

    const renderLoading = () => (
      <div class="mt-5 flex w-fit items-center gap-3 rounded-2xl bg-[#1d1d1f] px-4 py-3 text-sm text-zinc-400">
        <LoaderCircle size={16} class="animate-spin text-zinc-300" />
        <span>{props.hint || "AI 正在整理回答..."}</span>
      </div>
    );

    const renderError = () => (
      <div class="mt-5 flex w-full items-start gap-3">
        <article class="min-w-0 flex-1 rounded-[26px] border border-red-500/30 bg-red-500/10 px-6 py-5 text-[15px] leading-7 text-red-100 shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
          {props.errorMessage || "消息发送失败，请稍后再试。"}
        </article>
      </div>
    );

    const renderThinking = () => {
      return (
        <div class="mt-5 flex w-full flex-col gap-2 assistant-message">
          <div class="flex items-center gap-2 px-6 text-xs text-zinc-500 font-medium">
            <LoaderCircle size={14} class="animate-spin text-zinc-400" />
            <span>AI 正在思考...</span>
          </div>
          <div class="flex w-full items-start gap-3">
            <article class="min-w-0 flex-1 px-6">
              <div
                ref={thinkingContainerRef}
                class="w-full h-32 overflow-y-auto rounded-2xl bg-[#131314]/80 border border-zinc-800/80 px-5 py-4 text-xs leading-relaxed text-zinc-400 font-mono scrollbar-thin select-text"
              >
                {props.thinkingContent}
              </div>
            </article>
          </div>
        </div>
      );
    };

    const renderAssistantMessage = (content: string) => {
      const htmlContent = md.render(content);
      return (
        <MessageAction
          align="left"
          actions={["copy"]}
          disabled={props.status !== 'done'}
          onActionClick={handleMessageAction}
        >
          <div class="flex w-full items-start gap-3 assistant-message">
            <article class="min-w-0 flex-1 px-6 py-5 text-[15px] leading-7 text-zinc-300 ">
              <div
                class="prose prose-invert prose-zinc max-w-none text-zinc-300"
                v-html={htmlContent}
              />
            </article>
          </div>
        </MessageAction>
      );
    };

    return () => {
      const content = props.content;

      // 第一步：每次渲染时重新读取 contetn，保证流式内容可以逐字更新。
      if (props.role === "user") {
        return (
          <MessageAction
            align="right"
            actions={
              ["copy", props.isLastUserMessage ? "edit" : null].filter(
                Boolean,
              ) as string[]
            }
            disabled={props.status !== 'done' || isEditing.value}
            onActionClick={handleMessageAction}
          >
            <div class="flex w-full justify-end user-message scroll-mt-8">
              {isEditing.value ? (
                <div class="flex flex-col gap-y-3 w-full max-w-[500px]">
                  <textarea
                    class="w-full min-h-24 px-4 py-3 text-[15px] leading-7 bg-[#131314] text-zinc-100 rounded-[18px] border border-zinc-800 outline-none resize-none focus:border-zinc-700 transition-colors"
                    value={editContent.value}
                    onInput={(e) =>
                      (editContent.value = (e.target as HTMLTextAreaElement).value)
                    }
                    ref={(el) => el && (el as HTMLTextAreaElement).focus()}
                  />
                  <div class="flex gap-x-2 justify-end text-sm">
                    <Button
                      variant="text"
                      size="sm"
                      shape="pill"
                      onClick={handleEditCancel}
                    >
                      取消
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      shape="pill"
                      onClick={handleEditConfirm}
                    >
                      更新
                    </Button>
                  </div>
                </div>
              ) : (
                <div class="flex flex-col items-end gap-2 max-w-[76%]">
                  {props.images && props.images.map((img) => (
                    <img
                      key={img.slice(0, 30)}
                      src={img}
                      class="max-w-xs max-h-60 rounded-xl object-contain border border-zinc-700/50 shadow-md cursor-zoom-in hover:brightness-95 active:scale-[0.98] transition-all"
                      onClick={() => openPreview(img)}
                      title="点击预览大图"
                    />
                  ))}
                  {content && (
                    <div class="w-full whitespace-pre-wrap rounded-[22px] bg-zinc-100 px-5 py-3 text-[15px] leading-7 text-zinc-950">
                      {content}
                    </div>
                  )}
                </div>
              )}
            </div>
          </MessageAction>
        );
      }

      // 第二步：assistant 处于 sending 时显示 loading。
      if (props.loading) {
        return renderLoading();
      }

      // 第三步：assistant 失败时显示错误提示，避免界面静默。
      if (props.status === "error") {
        return renderError();
      }

      // 正在思考中且有思考内容，则渲染思考容器
      if (props.isThinking) {
        return renderThinking();
      }

      // 第四步：其他 assistant 状态正常渲染文本内容。
      return renderAssistantMessage(content);
    };
  },
});
