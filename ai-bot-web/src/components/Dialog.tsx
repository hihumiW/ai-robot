import {
  defineComponent,
  type PropType,
  onBeforeUnmount,
  Teleport,
  Transition,
  watch,
} from "vue";
import Button from "./Button";

export default defineComponent({
  name: "Dialog",
  props: {
    show: {
      type: Boolean,
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    closeOnOverlayClick: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["close", "confirm"],
  setup(props, { slots, emit }) {
    const handleClose = () => {
      emit("close");
    };

    const handleConfirm = () => {
      emit("confirm");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    watch(
      () => props.show,
      (show) => {
        if (show) {
          window.addEventListener("keydown", handleKeyDown);
        } else {
          window.removeEventListener("keydown", handleKeyDown);
        }
      },
      { immediate: true },
    );

    onBeforeUnmount(() => {
      window.removeEventListener("keydown", handleKeyDown);
    });

    return () => (
      <Teleport to="body">
        <Transition
          // 遮罩层淡入淡出动画
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          {props.show && (
            <div
              class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                if (props.closeOnOverlayClick) handleClose();
              }}
            >
              <Transition
                // 对话框缩放淡入淡出动画（配合出现）
                appear
                enter-active-class="transition duration-200 ease-out delay-75 transform"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition duration-150 ease-in transform"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
              >
                <div
                  class="bg-[#1e1e1f] border border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header 区域：支持 title 属性或 title 插槽 */}
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-zinc-100">
                      {slots.title ? slots.title() : props.title}
                    </h3>
                  </div>

                  {/* Body 区域：通过默认插槽自由扩展内容 */}
                  <div class="text-sm text-zinc-400">{slots.default?.()}</div>

                  {/* Footer 按钮区域：支持默认按钮或完全自定义的 footer 插槽 */}
                  <div class="flex justify-end gap-3 mt-2">
                    {slots.footer ? (
                      slots.footer()
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          shape="pill"
                          onClick={handleClose}
                        >
                          取消
                        </Button>
                        <Button
                          variant="primary"
                          shape="pill"
                          onClick={handleConfirm}
                        >
                          确认
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Transition>
            </div>
          )}
        </Transition>
      </Teleport>
    );
  },
});
