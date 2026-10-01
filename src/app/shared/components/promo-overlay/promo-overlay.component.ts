import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AppliedPromotion } from '@core/models/cart.model';
import { UserVoucherResponse } from '@core/models/voucher.model';
import { ButtonComponent } from '@shared/components/button/button.component';

/**
 * Overlay "Khuyến mại và ưu đãi" (mục 3.5) — dùng CHUNG cho trang giỏ và
 * trang thanh toán (G8), nên chỉ có một luồng chọn ưu đãi duy nhất.
 *
 * <p>
 * Component thuần hiển thị: mọi con số đều do BE trả (D6/D14). Nó không tự
 * tính tiền — chọn voucher chỉ phát sự kiện ra ngoài để trang gọi lại API.
 */
@Component({
  selector: 'app-promo-overlay',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, FormsModule, ButtonComponent],
  template: `
    <div
      class="fixed inset-0 z-[100] bg-slate-900/55 backdrop-blur-sm grid items-end sm:items-center justify-center"
      (click)="onBackdropClick($event)"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-overlay-title"
    >
      <div
        class="w-full sm:max-w-[520px] max-h-[88vh] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl flex flex-col shadow-xl"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0"
        >
          <b id="promo-overlay-title" class="font-bold">Khuyến mại và ưu đãi</b>
          <button
            type="button"
            class="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Đóng"
            (click)="closed.emit()"
          >
            <mat-icon class="!w-5 !h-5 !text-[20px] !leading-none">close</mat-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="overflow-y-auto px-4 py-4 flex flex-col gap-6">
          <!-- Nhập mã gõ tay -->
          <section>
            <h3
              class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3"
            >
              <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none">sell</mat-icon>
              Voucher
            </h3>
            <div class="flex gap-2">
              <input
                type="text"
                [ngModel]="voucherCode()"
                (ngModelChange)="voucherCodeChange.emit($event.toUpperCase())"
                placeholder="Nhập voucher"
                class="flex-1 h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-mono uppercase tracking-wide focus:outline-none focus:border-primary-500"
              />
              <app-button
                label="Áp dụng"
                variant="outline"
                [loading]="applyingVoucher()"
                (click)="applyVoucher.emit()"
              />
            </div>
            @if (voucherNote()) {
              <p
                class="text-xs font-semibold mt-2 flex items-center gap-1.5"
                [class]="voucherValid() ? 'text-green-600 dark:text-green-400' : 'text-rose-500'"
              >
                <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none">{{
                  voucherValid() ? 'check_circle' : 'error'
                }}</mat-icon>
                {{ voucherNote() }}
              </p>
            }
            <!-- BR-V14: mệnh giá > tiền hàng → voucher vẫn dùng được nhưng kẹp mức
                 giảm, khách mất phần chênh và KHÔNG được hoàn. -->
            @if (forfeitedAmount() > 0) {
              <div
                class="mt-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 flex gap-2"
                role="status"
              >
                <mat-icon
                  class="!w-4 !h-4 !text-[18px] !leading-none shrink-0 text-amber-600 dark:text-amber-400"
                  >warning</mat-icon
                >
                <p class="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                  Voucher mệnh giá
                  <b class="font-mono">{{ format(nominalAmount()) }}</b> nhưng chỉ giảm được
                  <b class="font-mono">{{ format(voucherDiscount()) }}</b> cho đơn này. Phần chênh
                  <b class="font-mono">{{ format(forfeitedAmount()) }}</b> <b> không được hoàn lại</b>,
                  và voucher vẫn tính là đã dùng.
                </p>
              </div>
            }
          </section>

          <!-- Khuyến mại tự động (D5: mỗi dòng 1 chương trình thắng) -->
          @if (promotions().length > 0) {
            <section>
              <h3
                class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3"
              >
                <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none">local_offer</mat-icon>
                Khuyến mại đang áp dụng
              </h3>
              @for (p of promotions(); track p.id) {
                <div
                  class="flex items-stretch border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-2"
                >
                  <div
                    class="shrink-0 w-[86px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex flex-col items-center justify-center gap-0.5 border-r border-dashed border-amber-300 px-1.5 py-2.5 text-center"
                  >
                    <b class="font-mono font-extrabold text-sm leading-tight">-{{ format(p.discountAmount) }}</b>
                  </div>
                  <div class="flex-1 min-w-0 px-3 py-2.5 flex flex-col gap-1">
                    <b class="text-sm font-bold truncate">{{ p.name }}</b>
                    <span class="text-xs text-slate-500 dark:text-slate-400">{{ p.title }}</span>
                  </div>
                  <div class="shrink-0 flex items-center px-3">
                    <span
                      class="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400"
                    >
                      <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none">check_circle</mat-icon>
                      Tự động
                    </span>
                  </div>
                </div>
              }
              <p class="text-xs text-slate-400 mt-1">
                Khuyến mại tự động áp theo sản phẩm trong giỏ, không bỏ chọn được.
              </p>
            </section>
          }

          <!-- Voucher trong ví -->
          <section>
            <h3
              class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3"
            >
              <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none">confirmation_number</mat-icon>
              Voucher của tôi
            </h3>

            @if (vouchers().length === 0) {
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Ví của bạn chưa có voucher nào.
                <a routerLink="/vouchers" class="text-primary-600 dark:text-primary-400 font-semibold">
                  Xem kho voucher
                </a>
              </p>
            }

            @for (v of vouchers(); track v.id) {
              <button
                type="button"
                class="w-full text-left flex items-stretch border rounded-lg overflow-hidden mb-2.5 transition"
                [class]="
                  selectedVoucherId() === v.id
                    ? 'border-primary-500 ring-2 ring-primary-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                "
                (click)="toggleVoucher(v)"
              >
                <div
                  class="shrink-0 w-[86px] bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 flex flex-col items-center justify-center gap-0.5 border-r border-dashed border-primary-300 px-1.5 py-2.5 text-center"
                >
                  <b class="font-mono font-extrabold text-sm leading-tight">{{ voucherLabel(v) }}</b>
                  <span class="text-[10px] font-bold uppercase tracking-wide">giảm</span>
                </div>
                <div class="flex-1 min-w-0 px-3 py-2.5 flex flex-col gap-1">
                  <b class="text-sm font-bold truncate">{{ v.code }}</b>
                  <span class="text-xs text-slate-500 dark:text-slate-400">
                    {{ voucherCondition(v) }}
                  </span>
                  @if (v.expiresAt) {
                    <span class="text-xs text-slate-400">HSD: {{ formatDate(v.expiresAt) }}</span>
                  }
                </div>
                <div class="shrink-0 flex items-center px-3">
                  <span
                    class="w-5 h-5 rounded-full border-2 grid place-items-center"
                    [class]="
                      selectedVoucherId() === v.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-slate-300 dark:border-slate-600'
                    "
                  >
                    @if (selectedVoucherId() === v.id) {
                      <mat-icon class="!w-3 !h-3 !text-[12px] !leading-none !text-white">check</mat-icon>
                    }
                  </span>
                </div>
              </button>
            }

            <p class="text-xs text-slate-400 mt-1">
              Mỗi đơn chỉ dùng <b>1 voucher</b>. Voucher tính <b>sau</b> khi đã trừ khuyến mại sản phẩm.
            </p>
          </section>
        </div>

        <!-- Footer: số tiết kiệm -->
        <div
          class="px-4 py-3.5 border-t border-slate-200 dark:border-slate-700 shrink-0 flex items-center gap-3"
        >
          <div class="flex-1 text-sm">
            <span class="text-slate-500 dark:text-slate-400">Tiết kiệm được</span>
            <b class="block font-mono text-lg font-extrabold text-green-600 dark:text-green-400">
              {{ format(totalSaving()) }}
            </b>
          </div>
          <app-button label="Xong" (click)="closed.emit()" />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class PromoOverlayComponent {
  promotions = input<AppliedPromotion[]>([]);
  vouchers = input<UserVoucherResponse[]>([]);
  selectedVoucherId = input<string | null>(null);
  voucherCode = input<string>('');
  voucherNote = input<string>('');
  voucherValid = input<boolean>(false);
  applyingVoucher = input<boolean>(false);
  /** Tổng tiền khuyến mại + voucher đang giảm — hiện ở footer. */
  totalSaving = input<number>(0);
  /** Số tiền voucher đang chọn giảm — dùng cho cảnh báo BR-V14. */
  voucherDiscount = input<number>(0);
  /**
   * Phần mệnh giá voucher không dùng được vì đơn nhỏ hơn mệnh giá (BR-V14).
   * `> 0` = hiện cảnh báo "mất tiền, không hoàn lại".
   */
  forfeitedAmount = input<number>(0);

  /** Mệnh giá gốc = số thực giảm + phần bị mất — chỉ dùng để hiện cảnh báo. */
  nominalAmount(): number {
    return this.voucherDiscount() + this.forfeitedAmount();
  }

  closed = output<void>();
  voucherCodeChange = output<string>();
  applyVoucher = output<void>();
  /** Chọn/bỏ voucher: phát id mới, hoặc null khi bỏ chọn. */
  voucherChange = output<string | null>();

  /** Chọn lại voucher đang chọn = bỏ chọn (toggle). */
  toggleVoucher(v: UserVoucherResponse): void {
    this.voucherChange.emit(this.selectedVoucherId() === v.id ? null : v.id);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  /** Nhãn ngắn trên "vé": % hoặc số tiền. */
  voucherLabel(v: UserVoucherResponse): string {
    if (v.discountPercent) {
      return `${v.discountPercent}%`;
    }
    return this.format(v.discountAmount ?? 0);
  }

  /** Điều kiện dùng — FE hiển thị để khách biết vì sao chưa áp được (D22). */
  voucherCondition(v: UserVoucherResponse): string {
    const parts: string[] = [];
    if (v.minOrderValue) {
      parts.push(`Đơn từ ${this.format(v.minOrderValue)}`);
    }
    if (v.maxDiscountAmount) {
      parts.push(`Giảm tối đa ${this.format(v.maxDiscountAmount)}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Không điều kiện';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN');
  }

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
