import { defineComponent, provide } from 'vue';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import WelcomePanel from './components/WelcomePanel';
import { CHAT_CONTEXT_INJECT_KEY, useChat } from './composition/useChat';

export default defineComponent({
  name: 'App',
  setup() {
    const defaultView: 'chat' | 'welcome' = 'chat';

      const chat = useChat();
      provide(CHAT_CONTEXT_INJECT_KEY, chat);

    return () => (
      <main class="flex min-h-screen overflow-hidden bg-[#0d0d0e] text-zinc-100">
        <Sidebar />
        {defaultView === 'chat' ? <ChatPanel /> : <WelcomePanel />}
      </main>
    );
  }
});
