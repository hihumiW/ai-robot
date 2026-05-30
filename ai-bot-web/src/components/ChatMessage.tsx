import { LoaderCircle } from '@lucide/vue';
import type { PropType, VNodeChild } from 'vue';
import { defineComponent } from 'vue';
import type { ChatMessageStatus, ChatRole } from '../types/chat';

export default defineComponent({
  name: 'ChatMessage',
  props: {
    role: {
      type: String as PropType<ChatRole>,
      required: true
    },
    status: {
      type: String as PropType<ChatMessageStatus>,
      default: 'done'
    },
    loading: {
      type: Boolean,
      default: false
    },
    hint: {
      type: String,
      default: ''
    },
    errorMessage: {
      type: String,
      default: ''
    }
  },
  setup(props, { slots }) {
    const renderLoading = () => (
      <div class="mt-5 flex w-fit items-center gap-3 rounded-2xl bg-[#1d1d1f] px-4 py-3 text-sm text-zinc-400">
        <LoaderCircle size={16} class="animate-spin text-zinc-300" />
        <span>{props.hint || 'AI 正在整理回答...'}</span>
      </div>
    );

    const renderError = () => (
      <div class="flex w-full items-start gap-3">
        <article class="min-w-0 flex-1 rounded-[26px] border border-red-500/30 bg-red-500/10 px-6 py-5 text-[15px] leading-7 text-red-100 shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
          {props.errorMessage || '消息发送失败，请稍后再试。'}
        </article>
      </div>
    );

    const renderAssistantMessage = (content: VNodeChild) => (
      <div class="flex w-full items-start gap-3">
        <article class="min-w-0 flex-1 px-6 py-5 text-[15px] leading-7 text-zinc-300 shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
          <div class="space-y-5 whitespace-pre-wrap">{content}</div>
        </article>
      </div>
    );

    return () => {
      // 第一步：每次渲染时重新读取 slot，保证流式内容可以逐字更新。
      const content = slots.default?.() as VNodeChild;

      if (props.role === 'user') {
        return (
          <div class="flex w-full justify-end">
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
      if (props.status === 'error') {
        return renderError();
      }

      // 第四步：其他 assistant 状态正常渲染文本内容。
      return renderAssistantMessage(content);
    };
  }
});
