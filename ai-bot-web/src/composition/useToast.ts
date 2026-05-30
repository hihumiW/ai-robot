import { ref } from "vue";
import { getRamdomId } from "../utils";

export interface ToastItem{
    id : string;
    message : string;
    type : "success" | "error" | "info"
}

// 管理全局的toast单例
const toasts = ref<ToastItem[]>([]);

export const useToast = () => {

    const show = (message : string, type : ToastItem["type"] = 'info', duration = 3000) => {
        // 生成一个唯一id
        const id = getRamdomId();

        toasts.value.push({
            id, message, type
        });

        // 时间到后移除该弹窗
        setTimeout(() => {
            toasts.value = toasts.value.filter(toast => toast.id !== id);
        }, duration);
        
    }


    //提供一些快捷方法
    const success = (message : string, duration? : number) => show(message, 'success', duration);
    const info = (message : string, duration? : number) => show(message, 'info', duration);
    const error = (message : string, duration? : number) => show(message, 'error', duration);

    return {
        toasts,
        show,
        success,
        info,
        error
    }

}

