import { LoaderCircle, MoreVertical, Pencil, Trash2 } from "@lucide/vue";
import clsx from "clsx";
import { defineComponent, PropType, ref } from "vue";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "./DropdownMenu";

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
    collapsed ? "justify-center px-0" : "gap-1 px-3",
    active
      ? "bg-zinc-700/45 text-white hover:bg-zinc-700/60"
      : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white",
  );

export default defineComponent({
  name: "ConversationItem",
  props: {
    conversation: {
      type: Object as PropType<{ id: string; title?: string | null }>,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    collapsed: {
      type: Boolean,
      default: false,
    },
    isGenerating: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["select", "delete", "rename"],
  setup(props, { emit }) {
    const isMenuOpen = ref(false);

    return () => {
      const activeState = props.isActive || isMenuOpen.value;
      return (
        <div
          class={itemClass(props.collapsed, activeState)}
          title={props.conversation.title || "新会话"}
          onClick={() => emit("select", props.conversation.id)}
        >
          <span
            class={["truncate text-left flex-1", textClass(props.collapsed)]}
          >
            {props.conversation.title || "新会话"}
          </span>

          {/* 增加转圈动画条件渲染 */}
          {props.isGenerating && (
            <LoaderCircle
              size={14}
              class="animate-spin shrink-0 text-zinc-400"
            />
          )}
          {!props.collapsed && (
            <Dropdown
              placement="bottom-end"
              onOpen={() => {
                isMenuOpen.value = true;
              }}
              onClose={() => {
                isMenuOpen.value = false;
              }}
            >
              <DropdownTrigger>
                <button
                  type="button"
                  class={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-opacity duration-150 ml-1",
                    isMenuOpen.value
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  ]}
                  title="更多操作"
                >
                  <MoreVertical size={14} />
                </button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem
                  icon={Pencil}
                  onClick={() => emit("rename", props.conversation)}
                >
                  重命名
                </DropdownItem>
                <DropdownItem
                  icon={Trash2}
                  danger
                  onClick={() => emit("delete", props.conversation.id)}
                >
                  删除
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          )}
        </div>
      );
    };
  },
});
