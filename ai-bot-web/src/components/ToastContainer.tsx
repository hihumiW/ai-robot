import { defineComponent } from "vue";
import { useToast } from "../composition/useToast";
import { AlertCircle, CheckCircle, Info } from "@lucide/vue";
import clsx from "clsx";

export default defineComponent({
  name: "ToastContainer",
  setup() {
    const { toasts } = useToast();

    const icons = {
      success: <CheckCircle class="text-emerald-400 shrink-0" size={18} />,
      error: <AlertCircle class="text-rose-400 shrink-0" size={18} />,
      info: <Info class="text-sky-400 shrink-0" size={18} />,
    };

    return () => {
      return (
        <div class="fixed right-4 top-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.value.map((toast) => (
            <div
              key={toast.id}
              class={clsx(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md transition-all duration-300 pointer-events-auto",
                toast.type === "success" &&
                  "border-emerald-500/30 bg-zinc-900/90 text-emerald-300",
                toast.type === "error" &&
                  "border-rose-500/30 bg-zinc-900/90 text-rose-300",
                toast.type === "info" &&
                  "border-sky-500/30 bg-zinc-900/90 text-sky-300",
              )}
            >
              {icons[toast.type]}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      );
    };
  },
});
