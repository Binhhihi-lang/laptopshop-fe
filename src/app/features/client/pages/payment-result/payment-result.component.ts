import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import * as QRCode from 'qrcode';
import { ClientOrderService } from '@core/services/client-order.service';
import { NotificationService } from '@core/services/notification.service';
import { ButtonComponent } from '@shared/components';

/** Tên ngân hàng theo BIN — payOS trả `bin` trong dữ liệu link. */
const BANK_NAMES: Record<string, string> = {
  '970418': 'BIDV',
  '970436': 'Vietcombank',
  '970415': 'VietinBank',
  '970405': 'Agribank',
  '970422': 'MB Bank',
  '970407': 'Techcombank',
  '970416': 'ACB',
  '970432': 'VPBank',
  '970423': 'TPBank',
  '970426': 'MSB',
  '970448': 'OCB',
  '970441': 'VIB',
  '970403': 'Sacombank',
};

/**
 * Trang kết quả thanh toán.
 *
 * - VNPay: BE /return verify chữ ký rồi redirect về đây kèm orderCode + status.
 * - payOS: dựng khung chuyển khoản gọn ngay trong trang (QR + thông tin),
 *   không nhúng nguyên trang checkout để khách không phải cuộn. Trạng thái lấy
 *   bằng cách hỏi lại BE mỗi 3 giây.
 */
@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  template: `
    <div class="max-w-3xl mx-auto px-4 py-8 text-center">
      @if (status() === 'success') {
        <div
          class="w-[84px] h-[84px] mx-auto mb-5 rounded-full flex items-center justify-center bg-green-50 dark:bg-green-900/30"
        >
          <span class="text-4xl text-green-600 dark:text-green-400">✓</span>
        </div>
        <h1 class="text-2xl font-bold mb-2">Thanh toán thành công!</h1>
        @if (orderCode()) {
          <p class="font-mono text-lg text-primary-600 dark:text-primary-400 mb-3">
            #{{ orderCode() }}
          </p>
        }
        <p class="text-slate-500 dark:text-slate-400 mb-8">
          Cổng thanh toán đã xác nhận. Chúng tôi sẽ liên hệ xác nhận đơn trong thời gian sớm
          nhất.
        </p>
        <div class="flex flex-wrap gap-3 justify-center">
          <a
            routerLink="/orders"
            class="px-5 py-2.5 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700"
            >Theo dõi đơn hàng</a
          >
          <a
            routerLink="/products"
            class="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
            >Tiếp tục mua sắm</a
          >
        </div>
      } @else if (payosMode()) {
        <div class="text-center mb-5">
          <h1 class="text-xl sm:text-2xl font-bold mb-1">Thanh toán đơn hàng</h1>
          @if (orderCode()) {
            <p class="font-mono text-sm text-primary-600 dark:text-primary-400">
              #{{ orderCode() }}
            </p>
          }
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quét VietQR bằng app ngân hàng — đơn tự xác nhận khi tiền về.
          </p>
        </div>

        @if (payosError()) {
          <p class="text-red-600 dark:text-red-400 mb-4">{{ payosError() }}</p>
          <app-button
            label="Thử lại"
            variant="primary"
            [loading]="isRetrying()"
            (click)="loadPayos()"
          />
        } @else if (payosQr()) {
          <div
            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6 grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center text-left"
          >
            <div class="flex flex-col items-center">
              <img
                [src]="payosQr()"
                alt="Mã VietQR thanh toán đơn hàng"
                class="w-[200px] h-[200px] sm:w-[210px] sm:h-[210px]"
              />
              <span class="text-[11px] text-slate-500 mt-2">Quét bằng app ngân hàng</span>
            </div>

            <div class="space-y-2.5 text-sm min-w-0">
              <div>
                <p class="text-xs text-slate-500">Ngân hàng</p>
                <p class="font-semibold">{{ payosBankName() }}</p>
              </div>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs text-slate-500">Số tài khoản</p>
                  <p class="font-mono font-semibold break-all">{{ payosAccountNumber() }}</p>
                </div>
                <button
                  type="button"
                  class="text-xs text-primary-600 dark:text-primary-400 font-semibold shrink-0"
                  (click)="copy(payosAccountNumber(), 'số tài khoản')"
                >
                  Sao chép
                </button>
              </div>
              <div>
                <p class="text-xs text-slate-500">Chủ tài khoản</p>
                <p class="font-semibold">{{ payosAccountName() }}</p>
              </div>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-slate-500">Số tiền</p>
                  <p class="font-semibold">{{ payosAmountText() }}</p>
                </div>
                <button
                  type="button"
                  class="text-xs text-primary-600 dark:text-primary-400 font-semibold shrink-0"
                  (click)="copy(payosAmountRaw(), 'số tiền')"
                >
                  Sao chép
                </button>
              </div>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs text-slate-500">Nội dung chuyển khoản</p>
                  <p class="font-mono font-semibold break-all">{{ orderCode() }}</p>
                </div>
                <button
                  type="button"
                  class="text-xs text-primary-600 dark:text-primary-400 font-semibold shrink-0"
                  (click)="copy(orderCode(), 'nội dung')"
                >
                  Sao chép
                </button>
              </div>
              <p class="text-[11px] text-amber-600 dark:text-amber-400">
                Giữ nguyên số tiền và nội dung để đơn được xác nhận tự động.
              </p>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              (click)="syncPayos()"
              [disabled]="isRetrying()"
              class="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60"
            >
              Tôi đã chuyển khoản — kiểm tra lại
            </button>
            @if (payosHostedUrl()) {
              <a
                [href]="payosHostedUrl()"
                target="_blank"
                rel="noopener"
                class="text-sm font-semibold text-primary-600 dark:text-primary-400 underline"
                >Mở trang thanh toán payOS</a
              >
            }
          </div>
        } @else {
          <p class="text-slate-500 dark:text-slate-400">Đang tạo mã thanh toán…</p>
        }
      } @else {
        <div
          class="w-[84px] h-[84px] mx-auto mb-5 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/30"
        >
          <span class="text-4xl text-red-600 dark:text-red-400">✕</span>
        </div>
        <h1 class="text-2xl font-bold mb-2">Thanh toán chưa hoàn tất</h1>
        @if (orderCode()) {
          <p class="font-mono text-lg text-slate-500 mb-3">#{{ orderCode() }}</p>
        }
        <p class="text-slate-500 dark:text-slate-400 mb-8">
          @if (code()) {
            Giao dịch không thành công hoặc đã bị hủy (mã {{ code() }}).
          } @else {
            Giao dịch không thành công hoặc đã bị hủy.
          }
          Bạn có thể thanh toán lại ngay — đơn hàng vẫn đang được giữ.
        </p>
        <div class="flex flex-wrap gap-3 justify-center">
          <app-button
            label="Thanh toán lại"
            variant="primary"
            [loading]="isRetrying()"
            (click)="retry()"
          />
          <a
            routerLink="/cart"
            class="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
            >Về giỏ hàng</a
          >
        </div>
      }
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
export class PaymentResultComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(ClientOrderService);
  private readonly notification = inject(NotificationService);

  readonly orderCode = signal('');
  readonly status = signal<'success' | 'failed'>('failed');
  readonly code = signal('');
  readonly isRetrying = signal(false);

  private readonly paymentMethod = signal('');
  /** true khi đang dở thanh toán payOS (chưa có kết quả cuối). */
  readonly payosMode = signal(false);
  readonly payosQr = signal('');
  readonly payosBankName = signal('Theo mã QR');
  readonly payosAccountName = signal('');
  readonly payosAccountNumber = signal('');
  readonly payosAmountText = signal('');
  readonly payosAmountRaw = signal('');
  readonly payosHostedUrl = signal('');
  readonly payosError = signal('');

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private syncing = false;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    // payOS có thể nối thêm orderCode (số) vào redirect_uri, nên trang kết quả
    // dùng khóa riêng shopOrder để không bị ghi đè.
    this.orderCode.set(params.get('shopOrder') ?? params.get('orderCode') ?? '');
    this.paymentMethod.set(params.get('method') ?? '');
    this.status.set(params.get('status') === 'success' ? 'success' : 'failed');
    this.code.set(params.get('code') ?? '');

    const statusParam = params.get('status');
    if (this.paymentMethod() === 'payos') {
      if (!statusParam) {
        // Vừa đặt hàng, chưa qua cổng → hiện mã QR.
        this.payosMode.set(true);
        this.loadPayos();
        return;
      }
      // payOS redirect về sau khi thanh toán: xác nhận lại với BE.
      if (statusParam.toUpperCase() === 'PAID' && this.orderCode()) {
        this.syncPayos();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  /** Tạo (hoặc dùng lại) link payOS rồi dựng khung QR gọn. */
  loadPayos(): void {
    if (!this.orderCode()) {
      return;
    }
    this.isRetrying.set(true);
    this.payosError.set('');
    this.orderService.createPayosPayment({ orderCode: this.orderCode() }).subscribe({
      next: (res) => {
        this.isRetrying.set(false);
        this.payosHostedUrl.set(res.checkoutUrl ?? '');
        this.payosAccountName.set(res.accountName ?? '—');
        this.payosAccountNumber.set(res.accountNumber ?? '—');
        this.payosBankName.set(
          (res.bin ? BANK_NAMES[res.bin] : undefined) ?? 'Theo mã QR',
        );
        this.payosAmountText.set(
          `${(res.amount ?? 0).toLocaleString('vi-VN')} vnđ`,
        );
        this.payosAmountRaw.set(String(res.amount ?? 0));

        if (!res.qrCode) {
          this.payosError.set('Không nhận được mã QR từ payOS.');
          return;
        }
        // VietQR là chuỗi EMV — vẽ thành ảnh vuông, không phụ thuộc iframe.
        QRCode.toDataURL(res.qrCode, { margin: 1, width: 420 })
          .then((dataUrl) => {
            this.payosQr.set(dataUrl);
            this.startPolling();
          })
          .catch(() => this.payosError.set('Không tạo được mã QR, vui lòng thử lại.'));
      },
      error: (err) => {
        this.isRetrying.set(false);
        this.payosError.set(this.notification.extractError(err));
      },
    });
  }

  /** Kiểm tra lại với payOS rồi cập nhật giao diện nếu đơn đã thanh toán. */
  syncPayos(silent = false): void {
    if (!this.orderCode() || this.syncing) {
      return;
    }
    this.syncing = true;
    if (!silent) {
      this.isRetrying.set(true);
    }
    this.orderService.syncPayosPayment({ orderCode: this.orderCode() }).subscribe({
      next: (res) => {
        this.syncing = false;
        if (!silent) {
          this.isRetrying.set(false);
        }
        if (res.paid) {
          this.stopPolling();
          this.payosMode.set(false);
          this.payosQr.set('');
          this.status.set('success');
        } else if (!silent) {
          this.notification.warn(
            'Chưa thấy giao dịch. Nếu vừa chuyển khoản, đợi vài giây rồi bấm kiểm tra lại.',
          );
        }
      },
      error: (err) => {
        this.syncing = false;
        if (!silent) {
          this.isRetrying.set(false);
          this.notification.error(this.notification.extractError(err));
        }
      },
    });
  }

  /** Hỏi payOS mỗi 3 giây trong lúc khách quét mã. */
  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.syncPayos(true), 3000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  copy(value: string, label: string): void {
    if (!value || !navigator.clipboard) {
      return;
    }
    navigator.clipboard
      .writeText(value)
      .then(() => this.notification.success(`Đã sao chép ${label}`))
      .catch(() => undefined);
  }

  /** Thanh toán lại — đơn đã tồn tại, chỉ cần mở lại cổng. */
  retry(): void {
    if (!this.orderCode()) {
      return;
    }
    if (this.paymentMethod() === 'payos') {
      this.loadPayos();
      return;
    }
    this.isRetrying.set(true);
    this.orderService.createVnpayPayment({ orderCode: this.orderCode() }).subscribe({
      next: (res) => {
        window.location.href = res.paymentUrl;
      },
      error: (err) => {
        this.isRetrying.set(false);
        this.notification.error(this.notification.extractError(err));
      },
    });
  }
}
