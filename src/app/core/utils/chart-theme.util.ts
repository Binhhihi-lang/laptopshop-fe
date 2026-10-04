/**
 * Cấu hình theme cho ApexCharts — đọc token màu từ CSS custom properties
 * (`--color-*` trong src/styles.css) tại THỜI ĐIỂM GỌI, nên tự đúng theo chế độ
 * sáng/tối hiện hành. Không hardcode hex trong component (DESIGN.md).
 */

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export interface ChartTheme {
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  indigo: string;
  isDark: boolean;
}

export function readChartTheme(): ChartTheme {
  return {
    text: cssVar('--color-text-secondary', '#334155'),
    textMuted: cssVar('--color-text-tertiary', '#64748b'),
    border: cssVar('--color-border-primary', '#e2e8f0'),
    primary: cssVar('--color-primary', '#3b82f6'),
    success: cssVar('--color-success', '#22c55e'),
    warning: cssVar('--color-warning', '#f59e0b'),
    danger: cssVar('--color-danger', '#ef4444'),
    indigo: '#6366f1',
    isDark: document.documentElement.classList.contains('dark'),
  };
}

/** Rút gọn số tiền cho nhãn trục: 12_500_000 → "12,5tr". */
export function shortVnd(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')}tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

/** Định dạng tiền Việt Nam: 1299000 → "1.299.000 ₫". */
export function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
}
