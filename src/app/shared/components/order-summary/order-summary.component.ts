import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppliedPromotion } from '@core/models/cart.model';
import { OrderPromotionLine } from '@core/models/order.model';

/**
 * Tóm tắt tiền thanh toán: Tiền hàng / Giảm giá / Phí ship / Tổng.
 * Dùng ở giỏ hàng, checkout và chi tiết đơn.
 *
 * <p>
 * Các input breakdown (`promotionDiscount`, `voucherDiscount`, `promotions`) là
 * OPTIONAL có chủ đích (G11): trang chi tiết đơn cũ chỉ truyền 4 input gốc và
 * vẫn render y như trước, không phải sửa.
 */
@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="space-y-3">
      <div class="flex justify-between text-sm">
        <span class="text-slate-500 dark:text-slate-400">Tiền hàng</span>
        <span class="font-mono tabular-nums">{{ format(subtotal()) }}</span>
      </div>

      @if (hasBreakdown()) {
        <!-- Có breakdown: tách rõ 2 nguồn giảm (D1) thay vì gộp 1 dòng "Giảm giá" -->
        @if (promoAmount() > 0) {
          <div class="flex justify-between text-sm">
            <span class="text-slate-500 dark:text-slate-400">Giảm giá sản phẩm</span>
            <span class="font-mono tabular-nums text-green-600 dark:text-green-400"
              >- {{ format(promoAmount()) }}</span
            >
          </div>
          <!-- Tên từng chương trình đã áp — khách biết đơn giảm nhờ chương trình nào. -->
          @for (line of promoLines(); track line.promotionId) {
            <div class="flex justify-between text-xs pl-3">
              <span class="text-slate-400 dark:text-slate-500 truncate">
                {{ line.name ?? 'Chương trình đã kết thúc' }}
              </span>
              <span class="font-mono tabular-nums text-green-600/80 dark:text-green-400/80 shrink-0">
                - {{ format(line.discountAmount) }}
              </span>
            </div>
          }
        }
        @if (voucherAmount() > 0) {
          <div class="flex justify-between text-sm">
            <span class="text-slate-500 dark:text-slate-400">
              Voucher @if (voucherCode()) {<span class="font-mono">({{ voucherCode() }})</span>}
            </span>
            <span class="font-mono tabular-nums text-green-600 dark:text-green-400"
              >- {{ format(voucherAmount()) }}</span
            >
          </div>
        }
        <!-- BR-V14: voucher mệnh giá > tiền hàng → khách mất phần chênh. -->
        @if (forfeited() > 0) {
          <p
            class="flex items-start gap-1.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400"
          >
            <mat-icon class="!w-3.5 !h-3.5 !text-[14px] !leading-none shrink-0 mt-px">warning</mat-icon>
            <span>
              Voucher không dùng hết {{ format(forfeited()) }} — phần này không được hoàn lại.
            </span>
          </p>
        }
      } @else if (discount() > 0) {
        <div class="flex justify-between text-sm">
          <span class="text-slate-500 dark:text-slate-400">Giảm giá</span>
          <span class="font-mono tabular-nums text-green-600 dark:text-green-400"
            >- {{ format(discount()) }}</span
          >
        </div>
      }

      <div class="flex justify-between text-sm">
        <span class="text-slate-500 dark:text-slate-400">Phí vận chuyển</span>
        <span class="font-mono tabular-nums">
          @if (subtotal() === 0) {
            —
          } @else if (shippingFee() === 0) {
            <span class="text-green-600 dark:text-green-400">Miễn phí</span>
          } @else {
            {{ format(shippingFee()) }}
          }
        </span>
      </div>
      <div
        class="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700"
      >
        <span class="font-medium">Tổng cộng</span>
        <span
          class="font-mono font-bold text-lg text-primary-600 dark:text-primary-400 tabular-nums"
        >
          {{ format(total()) }}
        </span>
      </div>
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class OrderSummaryComponent {
  subtotal = input.required<number>();
  discount = input<number>(0);
  shippingFee = input.required<number>();
  total = input.required<number>();

  /** Tổng tiền promotion giảm — chỉ truyền khi muốn hiện breakdown (D1). */
  promotionDiscount = input<number | null | undefined>(undefined);
  /** Tiền voucher giảm — chỉ truyền khi muốn hiện breakdown. */
  voucherDiscount = input<number | null | undefined>(undefined);
  /**
   * Phần mệnh giá voucher không dùng được vì đơn nhỏ hơn mệnh giá (BR-V14).
   * Optional theo pattern G11 — trang chi tiết đơn cũ không phải sửa.
   */
  forfeitedAmount = input<number | undefined>(undefined);
  /** Mã voucher đã áp — hiện cạnh dòng "Voucher" để khách biết đã dùng mã nào. */
  voucherCode = input<string | undefined>(undefined);
  /** Tên từng chương trình khuyến mại đã áp — hiện dưới dòng "Giảm giá sản phẩm". */
  promotionLines = input<OrderPromotionLine[] | undefined>(undefined);
  /** Chương trình khuyến mại đã áp — hiện ở overlay. */
  promotions = input<AppliedPromotion[] | undefined>(undefined);

  /** Danh sách chương trình, narrow undefined về [] cho template. */
  promoLines(): OrderPromotionLine[] {
    return this.promotionLines() ?? [];
  }

  /**
   * Có breakdown riêng hay dùng dòng "Giảm giá" gộp như cũ?
   *
   * <p>
   * Phải xét {@code != null} (bắt cả null lẫn undefined): BE trả {@code null} cho
   * đơn cũ trước Sprint 1, mà {@code null !== undefined} là true → nếu chỉ so với
   * undefined thì đơn cũ sẽ vào nhánh breakdown, hai dòng đều bằng 0 nên KHÔNG
   * hiện gì — mất luôn dòng "Giảm giá" của đơn cũ.
   */
  hasBreakdown(): boolean {
    return this.promotionDiscount() != null || this.voucherDiscount() != null;
  }

  /** Hai getter này quy undefined về 0 để template không phải narrow kiểu. */
  promoAmount(): number {
    return this.promotionDiscount() ?? 0;
  }

  voucherAmount(): number {
    return this.voucherDiscount() ?? 0;
  }

  /** Phần voucher không dùng được — narrow undefined về 0 cho template. */
  forfeited(): number {
    return this.forfeitedAmount() ?? 0;
  }

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
