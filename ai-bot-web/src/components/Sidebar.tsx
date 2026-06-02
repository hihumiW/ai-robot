import {
  BookOpen,
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
import Dialog from "./Dialog";
import ConversationItem from "./ConversationItem";

const textTransition =
  "overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200 ease-out";

const textClass = (collapsed: boolean) =>
  clsx(
    textTransition,
    collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100",
  );

const itemClass = (collapsed: boolean, active = false) =>
  clsx(
    "group flex h-8 w-full items-center rounded-full text-sm font-medium transition-colors duration-150 cursor-pointer select-none",
    collapsed ? "justify-center px-0" : "gap-3 pl-3",
    active
      ? "bg-zinc-700/45 text-white hover:bg-zinc-700/60"
      : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white",
  );

export default defineComponent({
  name: "Sidebar",
  setup() {
    const collapsed = ref(false);
    const isDeleteDialogOpen = ref(false);
    const conversationToDelete = ref<string | null>(null);
    const isRenameDialogOpen = ref(false);
    const conversationToRename = ref<{
      id: string;
      title?: string | null;
    } | null>(null);
    const renameTitle = ref("");

    const {
      currentConversationId,
      generatingConversationIds,
      setNewChat,
      selectConversation,
      deleteConversation,
      renameConversation,
    } = useChatContext();

    const conversationsQr = useQuery({
      queryKey: [fetchConversations.queryKey],
      queryFn: fetchConversations,
    });

    const handleConversationClick = (conversationId: string) => {
      selectConversation(conversationId);
    };

    const handleConversationDeleteClick = (deleteConversationId: string) => {
      conversationToDelete.value = deleteConversationId;
      isDeleteDialogOpen.value = true;
    };

    const handleConversationRenameClick = (conversation: any) => {
      conversationToRename.value = conversation;
      renameTitle.value = conversation.title || "";
      isRenameDialogOpen.value = true;
    };

    const handleConversationRenameDialogAction = async (
      action: "confirm" | "close",
    ) => {
      if (
        action === "confirm" &&
        conversationToRename.value &&
        renameTitle.value.trim()
      ) {
        await renameConversation(
          conversationToRename.value.id,
          renameTitle.value.trim(),
        );
      }
      conversationToRename.value = null;
      renameTitle.value = "";
      isRenameDialogOpen.value = false;
    };

    const handleConversationDialogAction = async (
      action: "confirm" | "close",
    ) => {
      if (action === "confirm" && conversationToDelete.value) {
        await deleteConversation(conversationToDelete.value);
      }
      conversationToDelete.value = null;
      isDeleteDialogOpen.value = false;
    };

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
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              isGenerating={generatingConversationIds.value.includes(conversation.id)}
              conversation={conversation}
              isActive={conversation.id === unref(currentConversationId)}
              collapsed={collapsed.value}
              onSelect={handleConversationClick}
              onDelete={handleConversationDeleteClick}
              onRename={handleConversationRenameClick}
            />
          ))}
        </>
      );
    };

    return () => {
      const isConversationsLoading = conversationsQr.isLoading.value;

      return (
        <>
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
              <Button
                class={itemClass(collapsed.value, false)}
                title="新增会话"
                onClick={setNewChat}
              >
                <MessageSquarePlus size={17} class="shrink-0" />
                <span class={textClass(collapsed.value)}>新增会话</span>
              </Button>
              <Button
                class={itemClass(collapsed.value, false)}
                title="搜索会话内容"
              >
                <Search size={17} class="shrink-0" />
                <span class={textClass(collapsed.value)}>搜索会话内容</span>
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
                {isConversationsLoading
                  ? renderLoading()
                  : renderConversations()}
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
                <div class={["min-w-0 flex-1", textClass(collapsed.value)]}>
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

          <Dialog
            show={isDeleteDialogOpen.value}
            title="删除会话"
            onClose={() => handleConversationDialogAction("close")}
            onConfirm={() => handleConversationDialogAction("confirm")}
          >
            <div class="flex flex-col gap-3">
              <p class="text-zinc-300">
                确定要删除这个历史会话吗？删除后此会话下的所有内容将无法恢复。
              </p>
            </div>
          </Dialog>

          <Dialog
            show={isRenameDialogOpen.value}
            title="重命名会话"
            onClose={() => handleConversationRenameDialogAction("close")}
            onConfirm={() => handleConversationRenameDialogAction("confirm")}
          >
            {{
              default: () => (
                <div class="flex flex-col gap-3">
                  <input
                    type="text"
                    class="w-full bg-[#131314] hover:bg-[#181819] focus:bg-[#181819] text-zinc-100 text-sm px-4 py-3 rounded-[24px] border-0 outline-none placeholder:text-zinc-500 transition-colors"
                    value={renameTitle.value}
                    onInput={(e) =>
                      (renameTitle.value = (e.target as HTMLInputElement).value)
                    }
                    placeholder="请输入新的会话名称"
                    ref={(el) => el && (el as HTMLInputElement).focus()}
                    onKeydown={(e) => {
                      if (e.key === "Enter")
                        handleConversationRenameDialogAction("confirm");
                    }}
                  />
                </div>
              ),
              footer: () => (
                <>
                  <Button
                  shape="pill"
                    variant="secondary"
                    onClick={() =>
                      handleConversationRenameDialogAction("close")
                    }
                  >
                    取消
                  </Button>
                  <Button
                   shape="pill"
                    variant="primary"
                    onClick={() =>
                      handleConversationRenameDialogAction("confirm")
                    }
                  >
                    保存
                  </Button>
                </>
              ),
            }}
          </Dialog>
        </>
      );
    };
  },
});
