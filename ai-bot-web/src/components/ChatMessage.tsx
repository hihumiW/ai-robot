import { LoaderCircle } from "@lucide/vue";
import type { PropType, VNodeChild } from "vue";
import { defineComponent } from "vue";
import MarkdownIt from "markdown-it";
import type { ChatMessageStatus, ChatRole } from "../types/chat";

import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css"; // Vite 会自动把这个 CSS 注入到页面中

const md : MarkdownIt = new MarkdownIt({
  html: true, // 允许解析原生的 HTML 标签
  linkify: true, // 自动把文本中的 URL 转为可点击的 <a> 链接
  breaks: true, // 允许识别换行符为 <br>
  highlight(str, lang) : string {
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

export default defineComponent({
  name: "ChatMessage",
  props: {
    role: {
      type: String as PropType<ChatRole>,
      required: true,
    },
    content: {
      type: String,
      required: true,
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
  },
  setup(props) {
    const renderLoading = () => (
      <div class="mt-5 flex w-fit items-center gap-3 rounded-2xl bg-[#1d1d1f] px-4 py-3 text-sm text-zinc-400">
        <LoaderCircle size={16} class="animate-spin text-zinc-300" />
        <span>{props.hint || "AI 正在整理回答..."}</span>
      </div>
    );

    const renderError = () => (
      <div class="flex w-full items-start gap-3">
        <article class="min-w-0 flex-1 rounded-[26px] border border-red-500/30 bg-red-500/10 px-6 py-5 text-[15px] leading-7 text-red-100 shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
          {props.errorMessage || "消息发送失败，请稍后再试。"}
        </article>
      </div>
    );

    const renderAssistantMessage = (content: string) => {
      const htmlContent = md.render(content);
      return (
        <div class="flex w-full items-start gap-3 assistant-message">
          <article class="min-w-0 flex-1 px-6 py-5 text-[15px] leading-7 text-zinc-300 shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
            <div
              class="prose prose-invert prose-zinc max-w-none text-zinc-300"
              v-html={htmlContent}
            />
          </article>
        </div>
      );
    };

    return () => {
      const content = props.content;

      // 第一步：每次渲染时重新读取 contetn，保证流式内容可以逐字更新。
      if (props.role === "user") {
        return (
          <div class="flex w-full justify-end user-message scroll-mt-8">
            <div class="max-w-[76%] whitespace-pre-wrap rounded-[22px] bg-zinc-100 px-5 py-3 text-[15px] leading-7 text-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
              {content}
            </div>
          </div>
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

      // 第四步：其他 assistant 状态正常渲染文本内容。
      return renderAssistantMessage(content);
    };
  },
});
