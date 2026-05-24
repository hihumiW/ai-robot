import { defineComponent } from 'vue';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import WelcomePanel from './components/WelcomePanel';

export default defineComponent({
  name: 'App',
  setup() {
    const defaultView: 'chat' | 'welcome' = 'chat';

    return () => (
      <main class="flex min-h-screen overflow-hidden bg-[#0d0d0e] text-zinc-100">
        <Sidebar />
        {defaultView === 'chat' ? <ChatPanel /> : <WelcomePanel />}
      </main>
    );
  }
});
