import { Component, input, computed } from '@angular/core';
import { OrderStatus } from '@core/models/order.model';

const STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'PENDING', label: 'Chờ xử lý', desc: 'Đơn hàng đã được tiếp nhận' },
  { status: 'CONFIRMED', label: 'Đã xác nhận', desc: 'Đơn hàng đã xác nhận' },
  { status: 'SHIPPING', label: 'Đang giao', desc: 'Đang vận chuyển đến bạn' },
  { status: 'COMPLETED', label: 'Đã giao', desc: 'Giao hàng thành công' },
];

/** Timeline 4 bước trạng thái đơn. currentStep = index bước hiện tại. */
@Component({
  selector: 'app-order-timeline',
  standalone: true,
  template: `
    <div class="space-y-6">
      @for (step of steps; track step.status; let i = $index) {
        <div class="flex gap-3">
          <div class="flex flex-col items-center">
            <span
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
              [class]="dotClass(i)"
            >
              @if (i < currentStep()) {
                ✓
              } @else {
                {{ i + 1 }}
              }
            </span>
            @if (i < steps.length - 1) {
              <div
                class="w-px flex-1 my-1"
                [class]="i < currentStep() ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'"
              ></div>
            }
          </div>
          <div class="pb-2">
            <b class="text-sm" [class]="titleClass(i)">{{ step.label }}</b>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ step.desc }}</p>
          </div>
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
export class OrderTimelineComponent {
  // status hiện tại của đơn → map ra index trong STEPS (CANCELLED không nằm timeline).
  status = input.required<OrderStatus>();

  steps = STEPS;
  currentStep = computed(() => {
    const idx = STEPS.findIndex((s) => s.status === this.status());
    return idx === -1 ? 0 : idx;
  });

  dotClass(i: number): string {
    if (i < this.currentStep()) {
      return 'bg-green-500 text-white';
    }
    if (i === this.currentStep()) {
      return 'bg-primary-600 text-white';
    }
    return 'bg-slate-200 dark:bg-slate-700 text-slate-500';
  }

  titleClass(i: number): string {
    return i === this.currentStep()
      ? 'text-slate-800 dark:text-slate-100'
      : 'text-slate-500 dark:text-slate-400';
  }
}
