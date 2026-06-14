export interface CompressOptions {
  /** 触发压缩的文件大小阀值（单位：字节），默认 5MB (5 * 1024 * 1024) */
  maxSizeInBytes?: number;
  /** 压缩后的最大宽度，默认 1200 */
  maxWidth?: number;
  /** 压缩后的最大高度，默认 1200 */
  maxHeight?: number;
  /** 压缩图片质量 (0-1)，默认 0.8 */
  quality?: number;
  /** 压缩输出类型，默认 'image/jpeg' */
  type?: string;
}

/**
 * 压缩图片文件并转换为 Base64 格式
 * - 如果文件大小未超过阈值，则使用 FileReader 直接转换为原始 Base64（无损且保留透明通道或动图等特性）。
 * - 如果文件大小超过阈值，则使用 Canvas 缩放并重新编码为指定质量的 JPEG。
 */
export const compressImageFile = (
  file: File,
  options: CompressOptions = {}
): Promise<string> => {
  const {
    maxSizeInBytes = 5 * 1024 * 1024, // 默认 5MB
    maxWidth = 1200,                  // 默认最高限宽 1200px
    maxHeight = 1200,                 // 默认最高限高 1200px
    quality = 0.8,                    // 默认压缩质量 80%
    type = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    // 1. 文件大小未达阈值，直接进行 Base64 转换返回
    if (file.size <= maxSizeInBytes) {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    // 2. 超限，启动 Canvas 压缩流程
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // 按比例缩放尺寸
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get 2d context for image compression."));
          return;
        }

        // 绘制图像并压缩
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // 输出压缩后的 Base64
        const dataUrl = canvas.toDataURL(type, quality);
        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
