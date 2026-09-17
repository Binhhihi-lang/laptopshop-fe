import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClientOrderService } from '@core/services/client-order.service';
import { NotificationService } from '@core/services/notification.service';
import { OrderDetail } from '@core/models/order.model';
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

  format(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
