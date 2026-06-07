import {
  defineComponent,
  ref,
  provide,
  inject,
  type InjectionKey,
  type Ref,
  type PropType,
  cloneVNode,
  watch,
  onMounted,
  onBeforeUnmount,
  type Component,
  h,
  Teleport,
  nextTick,
} from "vue";

// 定义共享状态上下文接口
export interface DropdownContext {
  visible: Ref<boolean>;
  triggerEl: Ref<HTMLElement | null>;
  placement: string;
  offset: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const DROPDOWN_KEY: InjectionKey<DropdownContext> = Symbol("DropdownKey");

// 1. Dropdown 根容器组件
export const Dropdown = defineComponent({
  name: "Dropdown",
  props: {
    placement: {
      type: String as PropType<"bottom-start" | "bottom-end">,
      default: "bottom-end",
    },
    offset: {
      type: Number,
      default: 4,
    },
  },
  emits: ["open", "close"],
  setup(props, { slots, emit }) {
    const visible = ref(false);
    const triggerEl = ref<HTMLElement | null>(null);

    const open = () => {
      visible.value = true;
      emit("open");
    };
    const close = () => {
      visible.value = false;
      emit("close");
    };
    const toggle = () => {
      if (visible.value) {
        close();
      } else {
        open();
      }
    };

    provide(DROPDOWN_KEY, {
      visible,
      triggerEl,
      placement: props.placement,
      offset: props.offset,
      open,
      close,
      toggle,
    });

    return () => {
      return slots.default?.();
    };
  },
});

// 2. DropdownTrigger 触发器包装组件
export const DropdownTrigger = defineComponent({
  name: "DropdownTrigger",
  setup(_, { slots }) {
    const context = inject(DROPDOWN_KEY);
    if (!context) {
      throw new Error("DropdownTrigger must be used inside Dropdown");
    }

    return () => {
      const children = slots.default?.();
      if (!children || children.length === 0) return null;

      // 取得第一个子节点，并动态附加 ref 和点击事件
      const vnode = children[0];
      return cloneVNode(vnode, {
        ref: (el: any) => {
          context.triggerEl.value = el ? (el.$el || el) : null;
        },
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          context.toggle();
        },
      });
    };
  },
});

// 3. DropdownContent 下拉面板容器组件
export const DropdownContent = defineComponent({
  name: "DropdownContent",
  setup(_, { slots }) {
    const context = inject(DROPDOWN_KEY);
    if (!context) {
      throw new Error("DropdownContent must be used inside Dropdown");
    }

    const contentRef = ref<HTMLElement | null>(null);
    const coords = ref({ top: 0, left: 0 });
    const isPositioned = ref(false);

    // 定位逻辑计算
    const updatePosition = () => {
      const trigger = context.triggerEl.value;
      const content = contentRef.value;
      if (!trigger || !content) return;

      const triggerRect = trigger.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const offset = context.offset ?? 4;

      let top = triggerRect.bottom + window.scrollY + offset;
      let left = triggerRect.left + window.scrollX;

      // 如果靠左对齐时，菜单右侧超出了屏幕右边界
      if (left + contentRect.width > window.innerWidth + window.scrollX - 10) {
        // 则改为靠右对齐：菜单右侧与触发器右侧对齐
        left = triggerRect.right + window.scrollX - contentRect.width;
      }

      // 屏幕左边界安全防护
      if (left < 10) {
        left = 10;
      }

      // 屏幕下边界安全防护
      if (top + contentRect.height > window.innerHeight + window.scrollY) {
        // 如果下方空间不足，则向上弹出
        top = triggerRect.top + window.scrollY - contentRect.height - offset;
      }

      coords.value = { top, left };
      isPositioned.value = true;
    };

    const handleOutsideClick = (e: MouseEvent) => {
      if (!context.visible.value) return;
      const target = e.target as Node;
      // 如果点击了内容区域外部，且点击的不是触发器按钮本身，则关闭菜单
      if (
        contentRef.value &&
        !contentRef.value.contains(target) &&
        context.triggerEl.value &&
        !context.triggerEl.value.contains(target)
      ) {
        context.close();
      }
    };

    const handleScrollOrResize = () => {
      context.close();
    };

    watch(context.visible, (val) => {
      if (val) {
        isPositioned.value = false;
        // 只有在菜单打开时才监听全局事件
        document.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("resize", handleScrollOrResize);
        window.addEventListener("scroll", handleScrollOrResize, true);
        // 使用 nextTick 确保 DOM 挂载完成后执行定位计算
        nextTick(updatePosition);
      } else {
        // 关闭时立即移出，避免常驻后台
        document.removeEventListener("mousedown", handleOutsideClick);
        window.removeEventListener("resize", handleScrollOrResize);
        window.removeEventListener("scroll", handleScrollOrResize, true);
      }
    });

    onBeforeUnmount(() => {
      // 卸载组件时做安全清理
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    });

    return () => {
      if (!context.visible.value) return null;

      return (
        <Teleport to="body">
          <div
            ref={contentRef}
            style={{
              position: "absolute",
              top: `${coords.value.top}px`,
              left: `${coords.value.left}px`,
              visibility: isPositioned.value ? "visible" : "hidden",
            }}
            class={[
              "z-50 min-w-[170px] rounded-xl border border-zinc-800 bg-[#1e1e1f]/95 p-1.5 shadow-2xl backdrop-blur-md origin-top-left",
              isPositioned.value
                ? "transition-[opacity,transform] duration-100 ease-out transform scale-100 opacity-100"
                : "transform scale-95 opacity-0",
            ]}
            onClick={(e) => e.stopPropagation()}
          >
            {slots.default?.()}
          </div>
        </Teleport>
      );
    };
  },
});

// 4. DropdownItem 单个菜单操作项组件
export const DropdownItem = defineComponent({
  name: "DropdownItem",
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    danger: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: [Object, Function] as PropType<Component>,
      default: null,
    },
  },
  emits: ["click"],
  setup(props, { slots, emit }) {
    const context = inject(DROPDOWN_KEY);

    const handleClick = (e: MouseEvent) => {
      if (props.disabled) return;
      e.stopPropagation();
      emit("click", e);
      context?.close();
    };

    return () => {
      const Icon = props.icon;
      return (
        <button
          type="button"
          disabled={props.disabled}
          onClick={handleClick}
          class={[
            "flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium transition-colors duration-150 rounded-lg outline-none",
            props.disabled
              ? "text-zinc-600 cursor-not-allowed opacity-50"
              : props.danger
              ? "text-rose-400 hover:bg-rose-950/20 hover:text-rose-300"
              : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white",
          ]}
        >
          {Icon && h(Icon, { size: 16, class: "shrink-0" })}
          <span class="flex-1 truncate">{slots.default?.()}</span>
        </button>
      );
    };
  },
});

// 5. DropdownSeparator 分割线组件
export const DropdownSeparator = defineComponent({
  name: "DropdownSeparator",
  render() {
    return <div class="my-1 h-[1px] bg-zinc-850/60 border-t border-zinc-800/80" />;
  },
});
