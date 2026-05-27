import dayjs from "dayjs"

// 将日期统一转换为 yyyy-MM-dd的格式
export const formatDateToString = (date? : Date) : string => {
    return date ? dayjs(date).format('YYYY-MM-DD') : '';
}