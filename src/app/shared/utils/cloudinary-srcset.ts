/**
 * Cloudinary trả ảnh gốc rất nặng (110 KB cho ảnh demo). Sinh `srcset` theo bề
 * rộng để mobile chỉ tải bản ~480px. Host khác Cloudinary trả null → dùng `src`.
 */
const WIDTHS = [480, 800, 1080, 1342];

export function cloudinarySrcset(url: string | null | undefined): string | null {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return null;
  }
  return WIDTHS.map((w) => `${url.replace('/upload/', `/upload/w_${w},q_auto:eco,f_auto/`)} ${w}w`).join(
    ', ',
  );
}
