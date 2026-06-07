import { defineComponent } from 'vue';
import blurBg from '../assets/chat_blur_bg.png';
import PromptBox from './PromptBox';

export default defineComponent({
  name: 'WelcomePanel',
  setup() {
    return () => (
      <section class="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-[#0d0d0e] px-6 text-zinc-100">
        <div
          class="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[920px] -translate-x-1/2 -translate-y-[28%] bg-contain bg-center bg-no-repeat opacity-85"
        />

        <div class="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8">
          <h1 class="text-center text-3xl font-medium tracking-normal text-zinc-200 sm:text-4xl">
            Mai，我们开始吧
          </h1>
          <PromptBox />
        </div>
      </section>
    );
  }
});
