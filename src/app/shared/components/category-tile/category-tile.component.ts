import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CategoryResponse } from '@core/models/category.model';

const TINT = ['#7c3aed', '#2563eb', '#0891b2', '#0d9488', '#4f46e5', '#d97706'];

/** Ô danh mục (Gaming / Văn phòng / ...) ở trang chủ. */
@Component({
  selector: 'app-category-tile',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <button
      type="button"
      class="cat-tile w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-col items-center gap-2.5 hover:shadow-md hover:border-primary-500 hover:-translate-y-0.5 transition-all"
      (click)="select.emit()"
    >
      <span
        class="w-[42px] h-[42px] rounded-lg flex items-center justify-center text-white"
        [style.background]="tint()"
      >
        <mat-icon class="!w-6 !h-6 !text-[22px] !leading-none">{{ icon() }}</mat-icon>
      </span>
      <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center leading-snug">{{
        category().name
      }}</span>
    </button>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class CategoryTileComponent {
  category = input.required<CategoryResponse>();
  tint = input<string>('#2563eb');
  /** Icon Material hiển thị trong ô màu (mockup dùng icon theo nhu cầu). */
  icon = input<string>('laptop_mac');
  select = output<void>();
}
