import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { OrderService } from '@core/services/order.service';
import { AuthService } from '@core/services/auth.service';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';
import {
  AdminOrderDetail,
  OrderStatus,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  PAYMENT_STATUS_LABEL,
} from '@core/models/order.model';

// Shared components
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { SkeletonCardComponent } from '@shared/components/skeleton/skeleton-card.component';
import { DetailHeaderComponent } from '@shared/components/detail-header/detail-header.component';
import { OrderTimelineComponent } from '@shared/components/order-timeline/order-timeline.component';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    SelectComponent,
    EmptyStateComponent,
    DetailHeaderComponent,
    SkeletonComponent,
    SkeletonCardComponent,
    OrderTimelineComponent,
  ],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.css',
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  canUpdateOrder = computed(() => this.authService.hasPermission('UPDATE_ORDER'));

  // Expose hằng số cho template
  readonly ORDER_STATUS_LABEL = ORDER_STATUS_LABEL;
  readonly PAYMENT_STATUS_LABEL = PAYMENT_STATUS_LABEL;

  order = signal<AdminOrderDetail | null>(null);
  isLoading = signal(false);
  permissionDenied = signal<boolean>(false);
  orderId: string | null = null;

  // Dropdown trạng thái đích — chỉ hiện các bước BE cho phép (allowedNextStatuses)
  targetStatus = signal<OrderStatus | ''>('');
  isUpdating = signal(false);

  nextStatuses = computed<SelectOption[]>(() => {
    const current = this.order();
    if (!current?.allowedNextStatuses?.length) {
      return [];
    }
    return current.allowedNextStatuses.map((s) => ({
      value: s,
      label: ORDER_STATUS_LABEL[s],
    }));
  });

  canChangeStatus = computed(() => this.canUpdateOrder() && this.nextStatuses().length > 0);

  ngOnInit() {
    this.orderId = this.route.snapshot.paramMap.get('id');
    if (this.orderId) {
      this.loadOrder(this.orderId);
    } else {
      this.router.navigate(['/admin/orders']);
    }
  }

  loadOrder(id: string) {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    this.orderService.getOrderById(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[OrderDetail] Lỗi khi tải đơn hàng:', err);
        this.isLoading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 403) {
          this.permissionDenied.set(true);
        } else {
          this.router.navigate(['/admin/orders']);
        }
      },
    });
  }

  onSelectStatus(value?: string) {
    if (value !== undefined) {
      this.targetStatus.set((value || '') as OrderStatus | '');
    }
  }

  /** Chuyển trạng thái. Hủy đơn (CANCELLED) luôn phải xác nhận vì hoàn lại
   *  tồn kho + đổi trạng thái thanh toán (PAID → REFUNDED). */
  updateStatus() {
    if (!this.targetStatus() || !this.orderId) return;
    const target = this.targetStatus() as OrderStatus;

    const doUpdate = () => {
      this.isUpdating.set(true);
      this.orderService.updateStatus(this.orderId!, target).subscribe({
        next: (updated) => {
          this.order.set(updated);
          this.targetStatus.set('');
          this.isUpdating.set(false);
          this.notification.success(`Đã chuyển đơn sang "${ORDER_STATUS_LABEL[target]}"`);
        },
        error: (error) => {
          console.error('Error updating order status:', error);
          this.isUpdating.set(false);
        },
      });
    };

    if (target === 'CANCELLED') {
      const current = this.order();
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '360px',
        data: {
          title: 'Xác nhận hủy đơn',
          message:
            `Hủy đơn ${current?.orderCode} sẽ hoàn lại tồn kho cho các sản phẩm` +
            (current?.paymentStatus === 'PAID'
              ? ' và chuyển trạng thái thanh toán sang Hoàn tiền.'
              : '.'),
        },
      });
      dialogRef.afterClosed().subscribe((result: boolean) => {
        if (result) {
          doUpdate();
        }
      });
    } else {
      doUpdate();
    }
  }

  isCancelled = computed(() => this.order()?.status === 'CANCELLED');

  statusBadge = computed(() => {
    const current = this.order();
    if (!current) return { label: '', variant: 'neutral' as const };
    return {
      label: ORDER_STATUS_LABEL[current.status] || current.status,
      variant: (ORDER_STATUS_VARIANT[current.status] || 'neutral') as
        'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary',
    };
  });

  paymentStatusBadge = computed(() => {
    const current = this.order();
    if (!current) return { label: '', variant: 'neutral' as const };
    const variantMap: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      PAID: 'success',
      REFUNDED: 'info',
      FAILED: 'danger',
      PENDING: 'warning',
    };
    return {
      label: PAYMENT_STATUS_LABEL[current.paymentStatus] || current.paymentStatus,
      variant: variantMap[current.paymentStatus] || 'neutral',
    };
  });

  goBack() {
    this.router.navigate(['/admin/orders']);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
      price || 0,
    );
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
