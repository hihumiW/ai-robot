import { computed, defineComponent, provide, unref } from 'vue';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import WelcomePanel from './components/WelcomePanel';
import { CHAT_CONTEXT_INJECT_KEY, useChat } from './composition/useChat';
import ToastContainer from './components/ToastContainer';

export default defineComponent({
  name: 'App',
  setup() {
  
    const chat = useChat();
    provide(CHAT_CONTEXT_INJECT_KEY, chat);

    const messageView = computed(() => {
      return unref(chat.currentConversationId) ? 'chat' : 'welcome';
    })

    return () => (
      <main class="flex min-h-screen overflow-hidden bg-[#0d0d0e] text-zinc-100">
        <Sidebar />
        {messageView.value === 'chat' ? <ChatPanel /> : <WelcomePanel />}
        <ToastContainer />
      </main>
    );
  }
});
