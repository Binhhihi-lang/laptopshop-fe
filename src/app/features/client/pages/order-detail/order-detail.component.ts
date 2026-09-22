import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientOrderService } from '@core/services/client-order.service';
import { NotificationService } from '@core/services/notification.service';
import {
  OrderDetail,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  PaymentStatus,
} from '@core/models/order.model';
import {
  BadgeComponent,
  BreadcrumbComponent,
  ButtonComponent,
  EmptyStateComponent,
  LoadingComponent,
  OrderSummaryComponent,
  OrderTimelineComponent,
} from '@shared/components';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    BadgeComponent,
    BreadcrumbComponent,
    ButtonComponent,
    EmptyStateComponent,
    LoadingComponent,
    OrderSummaryComponent,
    OrderTimelineComponent,
  ],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.css',
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(ClientOrderService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly order = signal<OrderDetail | null>(null);
  readonly isCancelling = signal(false);
  readonly isRetrying = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }
    this.load(id);
  }

  load(id: string): void {
    this.isLoading.set(true);
    this.orderService.getOrderById(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(this.notification.extractError(err));
        this.isLoading.set(false);
      },
    });
  }

  /** Chỉ hủy được khi đơn chưa giao — khớp rule BE (PENDING/CONFIRMED). */
  canCancel(): boolean {
    const status = this.order()?.status;
    return status === 'PENDING' || status === 'CONFIRMED';
  }

  /**
   * Đơn VNPay chưa trả tiền và còn trong hạn — BE quyết qua canRetryPayment,
   * FE chỉ hiển thị. Mở tab trống ngay trong sự kiện click để không bị chặn popup.
   */
  retryPayment(): void {
    const order = this.order();
    if (!order?.canRetryPayment) {
      return;
    }
    const tab = window.open('about:blank', '_blank');
    this.isRetrying.set(true);
    this.orderService.createVnpayPayment({ orderCode: order.orderCode }).subscribe({
      next: (res) => {
        this.isRetrying.set(false);
        if (tab) {
          tab.opener = null;
          tab.location.href = res.paymentUrl;
        } else {
          window.location.href = res.paymentUrl;
        }
      },
      error: (err) => {
        tab?.close();
        this.isRetrying.set(false);
        this.notification.error(this.notification.extractError(err));
        // Rule có thể đã đổi ở BE (quá hạn / vượt số lần) — nạp lại cho khớp.
        this.load(order.id);
      },
    });
  }

  cancel(): void {
    const order = this.order();
    if (!order) {
      return;
    }
    this.isCancelling.set(true);
    this.orderService.cancelOrder(order.id).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.notification.success('Đã hủy đơn hàng');
        this.isCancelling.set(false);
      },
      error: (err) => {
        this.notification.error(this.notification.extractError(err));
        this.isCancelling.set(false);
      },
    });
  }

  goOrders(): void {
    this.router.navigate(['/orders']);
  }

  paymentLabel(status: PaymentStatus): string {
    return PAYMENT_STATUS_LABEL[status];
  }

  paymentVariant(status: PaymentStatus) {
    return PAYMENT_STATUS_VARIANT[status];
  }

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
