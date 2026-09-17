import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string;
  // Query param kèm theo link (vd: /products?categoryId=...) — bỏ trống nếu không cần.
  queryParams?: Record<string, unknown>;
}

/** Điều hướng phân cấp (Trang chủ / Sản phẩm / Tên). Item cuối không link. */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav
      class="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400"
      aria-label="Breadcrumb"
    >
      @for (item of items(); track item.label; let last = $last) {
        @if (last) {
          <span class="text-slate-700 dark:text-slate-200">{{ item.label }}</span>
        } @else {
          <a
            [routerLink]="item.link"
            [queryParams]="item.queryParams ?? {}"
            class="hover:text-primary-600 dark:hover:text-primary-400"
          >
            {{ item.label }}
          </a>
          <span class="text-slate-400">/</span>
        }
      }
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class BreadcrumbComponent {
  items = input.required<BreadcrumbItem[]>();
}
