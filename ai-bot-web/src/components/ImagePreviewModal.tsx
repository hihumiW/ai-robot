import { defineComponent, Teleport, Transition, watch, onUnmounted } from "vue";
import { useChatContext } from "../composition/useChat";
import { X } from "@lucide/vue";

export default defineComponent({
  name: "ImagePreviewModal",
  setup() {
    const { previewImageUrl, closePreview } = useChatContext();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePreview();
      }
    };

    watch(
      () => previewImageUrl.value,
      (newUrl) => {
        if (newUrl) {
          window.addEventListener("keydown", handleKeyDown);
          // 预览时禁用页面滚动
          document.body.style.overflow = "hidden";
        } else {
          window.removeEventListener("keydown", handleKeyDown);
          document.body.style.overflow = "";
        }
      }
    );

    onUnmounted(() => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    });

    return () => (
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          {previewImageUrl.value && (
            <div
              class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md cursor-zoom-out p-4 select-none"
              onClick={closePreview}
            >
              {/* 关闭按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closePreview();
                }}
                class="absolute top-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/95 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                title="关闭"
              >
                <X size={20} />
              </button>

              {/* 大图容器 */}
              <div
                class="relative max-w-full max-h-full flex items-center justify-center overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={previewImageUrl.value}
                  class="max-w-[95vw] max-h-[90vh] rounded-lg shadow-2xl object-contain border border-zinc-800 bg-zinc-950/20"
                  alt="图片预览"
                />
              </div>
            </div>
          )}
        </Transition>
      </Teleport>
    );
  },
});
