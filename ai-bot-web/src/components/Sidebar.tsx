import {
  LoaderCircle,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserRound,
} from "@lucide/vue";
import clsx from "clsx";
import { defineComponent, ref, unref } from "vue";
import Button from "./Button";
import { useQuery } from "@tanstack/vue-query";
import { fetchConversations } from "../api/conversations";
import { useChatContext } from "../composition/useChat";

const textTransition =
  "overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200 ease-out";

export default defineComponent({
  name: "Sidebar",
  setup() {
    const collapsed = ref(false);

    const { currentConversationId, setNewChat } = useChatContext();

    const conversationsQr = useQuery({
      queryKey: [fetchConversations.queryKey],
      queryFn: fetchConversations,
    });

    const textClass = () =>
      clsx(
        textTransition,
        collapsed.value ? "max-w-0 opacity-0" : "max-w-[190px] opacity-100",
      );

    const itemClass = (active = false) =>
      clsx(
        "group flex h-8 w-full items-center rounded-full text-sm font-medium transition-colors duration-150",
        collapsed.value ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "bg-zinc-700/45 text-white hover:bg-zinc-700/60"
          : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white",
      );

    const renderLoading = () => {
      return (
        <div class="flex mt-16 justify-center">
          <LoaderCircle size={24} class="animate-spin text-zinc-300" />
        </div>
      );
    };

    const renderConversations = () => {
      const { conversations = [] } = conversationsQr.data.value || {};

      return (
        <>
          {conversations.map((conversation, index) => (
            <Button
              key={conversation.id}
              class={itemClass(conversation.id === unref(currentConversationId))}
              title={conversation.title!}
            >
              <span class={["truncate text-left", textClass()]}>
                {conversation.title!}
              </span>
            </Button>
          ))}
        </>
      );
    };

    return () => {
      const isConversationsLoading = conversationsQr.isLoading.value;

      return (
        <aside
          class={[
            "hidden h-screen shrink-0 flex-col overflow-hidden bg-[#1f1f20] text-zinc-100 transition-[width] duration-300 ease-out md:flex",
            collapsed.value ? "w-[76px]" : "w-[290px]",
          ]}
        >
          <header
            class={clsx(
              "flex h-16 items-center px-4",
              collapsed.value ? "justify-center" : "justify-between",
            )}
          >
            {!collapsed.value && (
              <div class={["flex min-w-0 items-center gap-2"]}>
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold tracking-wide">
                    AI Bot
                  </div>
                </div>
              </div>
            )}

            <Button
              aria-label={collapsed.value ? "展开侧边栏" : "收起侧边栏"}
              onClick={() => {
                collapsed.value = !collapsed.value;
              }}
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              {collapsed.value ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </Button>
          </header>

          <nav class="space-y-1 px-3">
            <Button class={itemClass(false)} title="新增会话" onClick={setNewChat}>
              <MessageSquarePlus size={17} class="shrink-0" />
              <span class={textClass()}>新增会话</span>
            </Button>
            <Button class={itemClass(false)} title="搜索会话内容">
              <Search size={17} class="shrink-0" />
              <span class={textClass()}>搜索会话内容</span>
            </Button>
          </nav>

          <section
            class={clsx(
              "mt-5 flex min-h-0 flex-1 flex-col px-3",
              collapsed.value ? "opacity-0" : "opacity-100",
            )}
          >
            <div class="mb-2 px-1 text-xs font-medium text-zinc-500 transition-opacity duration-150">
              会话历史
            </div>
            <div class="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {isConversationsLoading ? renderLoading() : renderConversations()}
            </div>
          </section>

          <footer class="p-3">
            <div
              class={[
                "group flex items-center rounded-xl py-2 transition-colors hover:bg-zinc-800/70",
                collapsed.value ? "justify-center px-0" : "gap-3 px-2",
              ]}
            >
              <div class="flex h-9 w-9 shrink-0 items-center justify-center text-zinc-100 transition-colors ">
                <UserRound size={22} />
              </div>
              <div class={["min-w-0 flex-1", textClass()]}>
                <div class="truncate text-sm font-medium">Mai Ku</div>
              </div>
              <Settings
                size={17}
                class={[
                  "shrink-0 text-zinc-500 transition-[opacity,color] duration-150 group-hover:text-zinc-300",
                  collapsed.value ? "w-0 opacity-0" : "opacity-100",
                ]}
              />
            </div>
          </footer>
        </aside>
      );
    };
  },
});
