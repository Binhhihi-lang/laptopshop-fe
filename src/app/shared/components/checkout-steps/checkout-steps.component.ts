import { Component, input } from '@angular/core';

/** Thanh tiến trình 3 bước: Giỏ hàng → Thông tin giao hàng → Thanh toán. */
@Component({
  selector: 'app-checkout-steps',
  standalone: true,
  template: `
    <div class="flex items-center" aria-label="Tiến trình thanh toán">
      @for (step of steps(); track step; let i = $index) {
        <div class="flex items-center" [class.flex-1]="i < steps().length - 1">
          <div class="flex items-center gap-2">
            <span
              class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
              [class]="stepClass(i)"
            >
              @if (i < current()) {
                <span class="text-white">✓</span>
              } @else {
                {{ i + 1 }}
              }
            </span>
            <span class="hidden sm:inline text-sm" [class]="labelClass(i)">{{ step }}</span>
          </div>
          @if (i < steps().length - 1) {
            <div
              class="flex-1 h-px mx-3"
              [class]="i < current() ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'"
            ></div>
          }
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
export class CheckoutStepsComponent {
  steps = input<string[]>(['Giỏ hàng', 'Thông tin giao hàng', 'Thanh toán']);
  current = input<number>(0);

  stepClass(i: number): string {
    if (i < this.current()) {
      return 'bg-green-500 text-white';
    }
    if (i === this.current()) {
      return 'bg-primary-600 text-white';
    }
    return 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
  }

  labelClass(i: number): string {
    if (i === this.current()) {
      return 'text-slate-800 dark:text-slate-100 font-medium';
    }
    return 'text-slate-500 dark:text-slate-400';
  }
}
