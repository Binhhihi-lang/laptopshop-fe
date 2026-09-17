import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryResponse } from '@core/models/category.model';

const TINT = ['#7c3aed', '#2563eb', '#0891b2', '#0d9488', '#4f46e5', '#d97706'];

/** Ô danh mục (Gaming / Văn phòng / ...) ở trang chủ. */
@Component({
  selector: 'app-category-tile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="cat-tile w-full rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col items-center gap-2 hover:shadow-md hover:border-primary-500 transition-all"
      (click)="select.emit()"
    >
      <span
        class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
        [style.background]="tint()"
      >
        {{ category().name.charAt(0) }}
      </span>
      <span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{
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
  select = output<void>();
}
