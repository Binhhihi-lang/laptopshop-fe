import { Component, input, output } from '@angular/core';

/** Tăng/giảm số lượng với nút +/-. min mặc định 1, max chặn theo tồn kho. */
@Component({
  selector: 'app-qty-stepper',
  standalone: true,
  template: `
    <div
      class="inline-flex items-center border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden"
    >
      <button
        type="button"
        class="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
        [disabled]="value() <= min()"
        (click)="change(-1)"
        [attr.aria-label]="'Giảm số lượng'"
      >
        −
      </button>
      <span class="w-10 text-center font-medium tabular-nums">{{ value() }}</span>
      <button
        type="button"
        class="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
        [disabled]="value() >= max()"
        (click)="change(1)"
        [attr.aria-label]="'Tăng số lượng'"
      >
        +
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
    `,
  ],
})
export class QtyStepperComponent {
  value = input.required<number>();
  min = input<number>(1);
  max = input<number>(99);
  changeValue = output<number>();

  change(delta: number): void {
    this.changeValue.emit(this.value() + delta);
  }
}
