import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ClientOrderService } from '@core/services/client-order.service';
import { NotificationService } from '@core/services/notification.service';
import { OrderSummary } from '@core/models/order.model';
import {
  BreadcrumbComponent,
  EmptyStateComponent,
  LoadingComponent,
  OrderCardComponent,
  PaginationComponent,
} from '@shared/components';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BreadcrumbComponent,
    EmptyStateComponent,
    LoadingComponent,
    OrderCardComponent,
    PaginationComponent,
  ],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.css',
})
export class OrderListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly orderService = inject(ClientOrderService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly orders = signal<OrderSummary[]>([]);
  readonly page = signal(0);
  readonly totalPages = signal(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.orderService.getMyOrders(this.page(), 10).subscribe({
      next: (res) => {
        this.orders.set(res.content);
        this.totalPages.set(res.totalPages);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notification.error(this.notification.extractError(err));
        this.isLoading.set(false);
      },
    });
  }

  changePage(p: number): void {
    this.page.set(p);
    this.load();
  }

  openDetail(order: OrderSummary): void {
    this.router.navigate(['/orders', order.id]);
  }

  goShop(): void {
    this.router.navigate(['/products']);
  }
}
