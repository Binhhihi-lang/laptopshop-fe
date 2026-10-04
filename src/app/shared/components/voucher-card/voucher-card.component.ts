import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

/**
 * Card voucher kiểu "vé" — dùng chung cho ví khách, kho voucher và overlay ưu đãi.
 *
 * <p>
 * Mệnh giá hiển thị ở cột trái dạng THU GỌN (500K, 1,5TR) thay vì số đầy đủ
 * "1.500.000 ₫" — số đầy đủ tràn khỏi cột hẹp khi giá trị lớn. Con số đầy đủ vẫn
 * nằm trong `title` để rê chuột xem.
 *
 * <p>
 * Hai chế độ:
 * <ul>
 *   <li>{@code selectable = true} → cả card là nút, hiện radio chọn/bỏ (overlay ưu đãi).</li>
 *   <li>{@code selectable = false} → card tĩnh, phần hành động chiếu vào qua ng-content
 *       (nút "Lưu mã", nhãn trạng thái…).</li>
 * </ul>
 */
@Component({
  selector: 'app-voucher-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (selectable()) {
      <button
        type="button"
        class="w-full text-left flex items-stretch rounded-xl overflow-hidden border transition"
        [class]="
          selected()
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'border-slate-200 dark:border-slate-700 hover:border-primary-400'
        "
        [attr.aria-pressed]="selected()"
        (click)="select.emit()"
      >
        <ng-container *ngTemplateOutlet="stub" />
        <ng-container *ngTemplateOutlet="body" />
        <span class="shrink-0 flex items-center px-3.5">
          <span
            class="w-5 h-5 rounded-full border-2 grid place-items-center"
            [class]="
              selected()
                ? 'border-primary-500 bg-primary-500'
                : 'border-slate-300 dark:border-slate-600'
            "
          >
            @if (selected()) {
              <mat-icon class="!w-3 !h-3 !text-[12px] !leading-none !text-white">check</mat-icon>
            }
          </span>
        </span>
      </button>
    } @else {
      <div
        class="w-full flex items-stretch rounded-xl overflow-hidden border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
        [class.opacity-60]="muted()"
      >
        <ng-container *ngTemplateOutlet="stub" />
        <ng-container *ngTemplateOutlet="body" />
        <div class="shrink-0 flex items-center px-3.5">
          <ng-content />
        </div>
      </div>
    }

    <!-- Cột trái: mệnh giá thu gọn -->
    <ng-template #stub>
      <span
        class="shrink-0 w-[92px] flex flex-col items-center justify-center gap-0.5 border-r border-dashed px-1.5 py-3 text-center"
        [class]="
          muted()
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600'
            : 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 border-primary-300 dark:border-primary-800'
        "
      >
        <b
          class="font-mono font-extrabold text-base leading-none tracking-tight tabular-nums"
          [title]="fullAmountTitle()"
        >
          {{ stubLabel() }}
        </b>
        <span class="text-[10px] font-bold uppercase tracking-wide">giảm</span>
      </span>
    </ng-template>

    <!-- Cột giữa: mã + điều kiện + hạn dùng -->
    <ng-template #body>
      <span class="flex-1 min-w-0 px-3.5 py-2.5 flex flex-col gap-1">
        <b class="text-sm font-bold truncate">{{ code() }}</b>
        <span class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ condition() }}</span>
        <!-- Giới hạn lượt: mỗi khách + tổng hệ thống -->
        <span class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
          <span class="inline-flex items-center gap-1">
            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none">person</mat-icon>
            {{ perUserText() }}
          </span>
          <span class="inline-flex items-center gap-1">
            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none">groups</mat-icon>
            {{ usageText() }}
          </span>
        </span>
        @if (metaText()) {
          <span class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ metaText() }}</span>
        }
      </span>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class VoucherCardComponent {
  code = input.required<string>();
  discountPercent = input<number | null>(null);
  discountAmount = input<number | null>(null);
  minOrderValue = input<number | null>(null);
  maxDiscountAmount = input<number | null>(null);
  /** Số lượt tối đa MỖI KHÁCH; null/≤0 = không giới hạn. */
  perUserLimit = input<number | null>(null);
  /** Tổng lượt dùng tối đa toàn hệ thống; null/0 = không giới hạn. */
  usageLimit = input<number | null>(null);
  /** Dòng phụ cuối card (hạn dùng / ngày dùng). Rỗng thì ẩn. */
  metaText = input<string>('');
  /** Làm mờ card (đã dùng / hết hạn). */
  muted = input<boolean>(false);
  /** Chế độ chọn: cả card là nút + hiện radio. */
  selectable = input<boolean>(false);
  selected = input<boolean>(false);

  select = output<void>();

  /** Nhãn cột trái: % hoặc số tiền THU GỌN (500K / 1,5TR) để không tràn cột hẹp. */
  stubLabel = computed(() => {
    const percent = this.discountPercent();
    if (percent) {
      return `${percent}%`;
    }
    return this.compact(this.discountAmount() ?? 0);
  });

  /** Con số đầy đủ cho tooltip — cột hẹp chỉ đủ chỗ cho bản thu gọn. */
  fullAmountTitle = computed(() => {
    const percent = this.discountPercent();
    if (percent) {
      return `Giảm ${percent}%`;
    }
    return `Giảm ${this.format(this.discountAmount() ?? 0)}`;
  });

  /** Điều kiện áp dụng — gộp đơn tối thiểu + trần giảm, hoặc "Không điều kiện". */
  condition = computed(() => {
    const parts: string[] = [];
    const min = this.minOrderValue();
    const cap = this.maxDiscountAmount();
    if (min) {
      parts.push(`Đơn từ ${this.format(min)}`);
    }
    if (cap) {
      parts.push(`Giảm tối đa ${this.format(cap)}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Không điều kiện';
  });

  /** Giới hạn mỗi khách — luôn nêu rõ, "Không giới hạn" khi trần trống. */
  perUserText = computed(() => {
    const limit = this.perUserLimit();
    return limit && limit > 0 ? `Tối đa ${limit} lượt/khách` : 'Không giới hạn/khách';
  });

  /** Tổng lượt dùng cho phép — luôn nêu rõ, "Không giới hạn" khi trống/0. */
  usageText = computed(() => {
    const limit = this.usageLimit();
    return limit && limit > 0 ? `Tổng ${limit} lượt` : 'Không giới hạn lượt';
  });

  /** Thu gọn số tiền: ≥1 triệu → "1,5TR"; ≥1 nghìn → "500K"; còn lại giữ nguyên. */
  private compact(value: number): string {
    if (value >= 1_000_000) {
      const millions = value / 1_000_000;
      const text = Number.isInteger(millions) ? `${millions}` : millions.toFixed(1).replace('.', ',');
      return `${text}TR`;
    }
    if (value >= 1_000) {
      return `${Math.round(value / 1_000)}K`;
    }
    return `${value}`;
  }

  private format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
