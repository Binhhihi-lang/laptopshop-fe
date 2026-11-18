/** Ô trong dãy phân trang: số trang (0-based) hoặc dấu lược "…". */
export type PageSlot = number | 'gap';

/**
 * Dãy ô phân trang rút gọn: luôn có trang đầu, trang cuối và lân cận trang
 * hiện tại, khoảng cách ở giữa thay bằng "…".
 *
 * Shop có thể tới hàng nghìn trang (2.475 trang với 50.000 sản phẩm); bày đủ
 * số thì tràn ngang và treo UI, nên chỉ hiện tối đa 11 ô.
 */
export function buildPageSlots(totalPages: number, currentPage: number): PageSlot[] {
  const total = Math.max(0, Math.floor(totalPages));
  if (total <= 1) {
    return [];
  }
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const last = total - 1;
  const current = Math.min(Math.max(Math.floor(currentPage), 0), last);
  const nums = new Set<number>([0, last, current]);
  if (current > 0) nums.add(current - 1);
  if (current < last) nums.add(current + 1);
  for (let i = 1; i < Math.min(3, last); i++) nums.add(i);
  for (let i = Math.max(0, last - 2); i < last; i++) nums.add(i);

  const sorted = [...nums].sort((a, b) => a - b);
  const result: PageSlot[] = [];
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1] > 1) {
      result.push('gap');
    }
    result.push(n);
  });
  return result;
}
