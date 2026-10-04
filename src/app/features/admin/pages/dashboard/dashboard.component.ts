import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  NgApexchartsModule,
  ApexChart,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexFill,
  ApexGrid,
  ApexTooltip,
  ApexDataLabels,
  ApexLegend,
  ApexPlotOptions,
  ApexNonAxisChartSeries,
  ApexResponsive,
} from 'ng-apexcharts';

import {
  PageHeaderComponent,
  CardComponent,
  CardHeaderComponent,
  BadgeComponent,
  ButtonComponent,
  LoadingComponent,
  EmptyStateComponent,
  StatCardComponent,
} from '@shared/components';

import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { DashboardService } from '@core/services/dashboard.service';
import {
  DashboardRange,
  DashboardStats,
  DailyPoint,
  TopProduct,
} from '@core/models/dashboard.model';
import { formatVnd, readChartTheme, shortVnd } from '@core/utils/chart-theme.util';

interface RangeOption {
  value: DashboardRange;
  label: string;
}

/** Màu semantic cho 5 trạng thái đơn — dùng chung cho donut và danh sách chú giải. */
const STATUS_META: { key: string; label: string; cssVar: string; fallback: string }[] = [
  { key: 'COMPLETED', label: 'Hoàn thành', cssVar: '--color-success', fallback: '#22c55e' },
  { key: 'CONFIRMED', label: 'Đã xác nhận', cssVar: '--color-primary', fallback: '#3b82f6' },
  { key: 'SHIPPING', label: 'Đang giao', cssVar: '--color-indigo', fallback: '#6366f1' },
  { key: 'CANCELLED', label: 'Đã hủy', cssVar: '--color-danger', fallback: '#ef4444' },
  { key: 'PENDING', label: 'Chờ xác nhận', cssVar: '--color-warning', fallback: '#f59e0b' },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    NgApexchartsModule,
    PageHeaderComponent,
    CardComponent,
    CardHeaderComponent,
    BadgeComponent,
    ButtonComponent,
    LoadingComponent,
    EmptyStateComponent,
    StatCardComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  // ---- State ----
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly permissionDenied = signal(false);
  readonly stats = signal<DashboardStats | null>(null);
  readonly range = signal<DashboardRange>('LAST_30_DAYS');

  /** Phiên bản theme — bump mỗi khi đổi sáng/tối để vẽ lại biểu đồ đúng màu. */
  private readonly themeVersion = signal(0);

  readonly ranges: RangeOption[] = [
    { value: 'TODAY', label: 'Hôm nay' },
    { value: 'LAST_7_DAYS', label: '7 ngày' },
    { value: 'LAST_30_DAYS', label: '30 ngày' },
    { value: 'THIS_MONTH', label: 'Tháng này' },
  ];

  /** STAFF không có READ_USER → ẩn thẻ Khách hàng + nút Xuất báo cáo (BR-D07). */
  readonly canViewCustomers = computed(() => this.authService.hasPermission('READ_USER'));

  constructor() {
    // Đổi sáng/tối → tăng phiên bản để các computed bên dưới tính lại màu.
    effect(() => {
      this.themeService.isDark();
      this.themeVersion.update((v) => v + 1);
    });
  }

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.dashboardService.getStats(this.range()).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 403) {
          this.permissionDenied.set(true);
        } else {
          this.errorMessage.set('Không thể tải thống kê bảng điều khiển');
        }
        this.loading.set(false);
      },
    });
  }

  selectRange(range: DashboardRange): void {
    if (this.range() === range) return;
    this.range.set(range);
    this.loadStatistics();
  }

  // ===== Định dạng =====

  formatPrice(value: number | null | undefined): string {
    return formatVnd(value ?? 0);
  }

  /** Nhãn % so kỳ trước; kỳ trước = 0 → "—" (không chia 0). */
  changeText(): string {
    const pct = this.stats()?.revenueChangePercent;
    if (pct === null || pct === undefined) return '—';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1).replace('.', ',')}%`;
  }

  changeUp(): boolean {
    return (this.stats()?.revenueChangePercent ?? 0) >= 0;
  }

  changeNeutral(): boolean {
    return this.stats()?.revenueChangePercent === null;
  }

  // ===== Biểu đồ doanh thu (area) =====

  readonly revenueSeries = computed<ApexAxisChartSeries>(() => {
    this.themeVersion();
    const s = this.stats();
    if (!s) return [];
    return [
      { name: 'Kỳ này', data: s.revenueSeries.map((p) => p.revenue) },
      { name: 'Kỳ trước', data: s.previousRevenueSeries.map((p) => p.revenue) },
    ];
  });

  readonly revenueChart = computed<ApexChart>(() => {
    this.themeVersion();
    const t = readChartTheme();
    return {
      type: 'area',
      height: 300,
      fontFamily: 'Inter, system-ui, sans-serif',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: !this.prefersReducedMotion() },
      foreColor: t.textMuted,
    };
  });

  readonly revenueXAxis = computed<ApexXAxis>(() => {
    const s = this.stats();
    return {
      categories: (s?.revenueSeries ?? []).map((p) => this.shortDate(p)),
      tickAmount: 6,
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    };
  });

  readonly revenueYAxis = computed<ApexYAxis>(() => ({
    labels: { formatter: (v: number) => shortVnd(v), style: { fontSize: '11px' } },
  }));

  readonly revenueStroke = computed<ApexStroke>(() => {
    this.themeVersion();
    const t = readChartTheme();
    return { curve: 'smooth', width: [2.5, 1.5], dashArray: [0, 5], colors: [t.primary, t.textMuted] };
  });

  readonly revenueFill = computed<ApexFill>(() => {
    this.themeVersion();
    const t = readChartTheme();
    return {
      type: ['gradient', 'solid'],
      gradient: { shadeIntensity: 1, opacityFrom: 0.28, opacityTo: 0, stops: [0, 100] },
      opacity: [1, 0],
      colors: [t.primary, t.textMuted],
    };
  });

  readonly revenueGrid = computed<ApexGrid>(() => {
    this.themeVersion();
    const t = readChartTheme();
    return { borderColor: t.border, strokeDashArray: 4, xaxis: { lines: { show: false } } };
  });

  readonly revenueTooltip = computed<ApexTooltip>(() => {
    this.themeVersion();
    const t = readChartTheme();
    const s = this.stats();
    return {
      theme: t.isDark ? 'dark' : 'light',
      x: { show: true },
      y: {
        formatter: (v: number, opts) => {
          const orders = s?.revenueSeries[opts?.dataPointIndex ?? 0]?.orderCount ?? 0;
          const orderInfo = opts?.seriesIndex === 0 ? ` · ${orders} đơn` : '';
          return formatVnd(v) + orderInfo;
        },
      },
    };
  });

  readonly revenueDataLabels = computed<ApexDataLabels>(() => ({ enabled: false }));

  readonly revenueLegend = computed<ApexLegend>(() => ({
    position: 'bottom',
    horizontalAlign: 'left',
    fontSize: '13px',
    markers: { size: 6 },
  }));

  // ===== Biểu đồ tròn trạng thái đơn =====

  readonly statusMeta = computed(() => {
    this.themeVersion();
    return STATUS_META.map((m) => ({
      ...m,
      count: this.stats()?.ordersByStatus?.[m.key] ?? 0,
    }));
  });

  readonly statusSeries = computed<ApexNonAxisChartSeries>(() =>
    this.statusMeta().map((m) => m.count),
  );

  readonly statusLabels = computed<string[]>(() => this.statusMeta().map((m) => m.label));

  readonly statusColors = computed<string[]>(() => {
    this.themeVersion();
    return STATUS_META.map((m) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(m.cssVar).trim();
      return v || m.fallback;
    });
  });

  readonly donutChart = computed<ApexChart>(() => ({
    type: 'donut',
    height: 240,
    fontFamily: 'Inter, system-ui, sans-serif',
    animations: { enabled: !this.prefersReducedMotion() },
  }));

  readonly donutPlotOptions = computed<ApexPlotOptions>(() => ({
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          name: { show: false },
          value: {
            show: true,
            fontSize: '22px',
            fontWeight: 700,
            formatter: () => String(this.stats()?.totalOrderCount ?? 0),
          },
          total: {
            show: true,
            showAlways: true,
            label: 'tổng đơn',
            fontSize: '12px',
            formatter: () => String(this.stats()?.totalOrderCount ?? 0),
          },
        },
      },
    },
  }));

  readonly donutLegend = computed<ApexLegend>(() => ({ show: false }));

  readonly donutResponsive = computed<ApexResponsive[]>(() => [
    { breakpoint: 480, options: { chart: { height: 200 } } },
  ]);

  readonly statusTotal = computed(() => this.stats()?.totalOrderCount ?? 0);

  percentOfTotal(count: number): string {
    const total = this.statusTotal();
    if (!total) return '0%';
    return `${((count / total) * 100).toFixed(1).replace('.', ',')}%`;
  }

  // ===== Danh sách =====

  readonly topProducts = computed<TopProduct[]>(() => this.stats()?.topSellingProducts ?? []);
  readonly lowStock = computed(() => this.stats()?.lowStockProducts ?? []);

  stockBadgeVariant(quantity: number): 'danger' | 'warning' {
    return quantity < 2 ? 'danger' : 'warning';
  }

  goToOrders(): void {
    this.router.navigate(['/admin/orders'], { queryParams: { status: 'PENDING' } });
  }

  goToProducts(): void {
    this.router.navigate(['/admin/products']);
  }

  // ===== Khối khuyến mại (BR-BL14) =====

  readonly promotionEffect = computed(() => this.stats()?.promotionEffect ?? null);

  /** Tỉ lệ đơn có khuyến mại; null → "—". */
  discountedRateText(): string {
    const rate = this.promotionEffect()?.discountedRate;
    return rate === null || rate === undefined ? '—' : `${rate.toFixed(1).replace('.', ',')}%`;
  }

  // ===== Xuất báo cáo Excel =====

  readonly exporting = signal(false);

  exportReport(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.dashboardService.exportReport(this.range()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        this.saveBlob(blob);
      },
      error: () => {
        this.exporting.set(false);
        this.errorMessage.set('Không xuất được báo cáo. Vui lòng thử lại.');
      },
    });
  }

  private saveBlob(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `bao-cao-${stamp}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private shortDate(point: DailyPoint): string {
    const [, month, day] = point.date.split('-');
    return `${Number(day)}/${Number(month)}`;
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
