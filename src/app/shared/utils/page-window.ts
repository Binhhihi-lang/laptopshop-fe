/** Ô trong dãy phân trang: số trang (0-based) hoặc dấu lược "…". */
export type PageSlot = number | 'gap';

/**
 * Dãy ô phân trang rút gọn: luôn có trang đầu, trang cuối và lân cận trang
 * hiện tại; vùng giữa bị lược thay bằng một dấu "…". Tối đa 7 phần tử.
 *
 * Dùng chung cho `app-pagination` (storefront) và `app-table` (quản trị) để
 * hai nơi hiển thị giống nhau, không phải chép logic.
 */
export function buildPageSlots(
  totalPages: number,
  currentPage: number,
  maxNumeric = 5,
): PageSlot[] {
  const total = Math.max(0, Math.floor(totalPages));
  if (total <= 1) {
    return [];
  }
  const last = total - 1;
  const current = Math.min(Math.max(Math.floor(currentPage), 0), last);

  // Ít trang thì hiện đủ, không cần lược.
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }

  // Số ô số mỗi bên mép khi đang ở gần đầu/cuối (mặc định 5).
  const edge = Math.max(1, Math.min(maxNumeric, last + 1));
  const nums = new Set<number>();
  nums.add(0);
  nums.add(last);
  if (current < edge) {
    for (let i = 0; i < edge; i++) {
      nums.add(i);
    }
  } else if (current > last - edge) {
    for (let i = last - edge + 1; i <= last; i++) {
      nums.add(i);
    }
  } else {
    nums.add(current - 1);
    nums.add(current);
    nums.add(current + 1);
  }

  const sorted = [...nums].filter((n) => n >= 0 && n <= last).sort((a, b) => a - b);
  const result: PageSlot[] = [];
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1] > 1) {
      result.push('gap');
    }
    result.push(n);
  });
  return result;
}
