import { Component } from '@angular/core';

/**
 * Khung xương cho trang chi tiết sản phẩm.
 *
 * Giữ đúng bố cục thật (cột ảnh + cột thông tin + khối mô tả) để khi dữ liệu về
 * không bị nhảy layout. Dùng thay spinner vì spinner không giữ chỗ.
 */
@Component({
  selector: 'app-product-detail-skeleton',
  standalone: true,
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse" aria-hidden="true">
      <!-- breadcrumb -->
      <div class="h-4 w-56 rounded bg-slate-200 dark:bg-slate-700 mb-6"></div>

      <div class="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
        <!-- Ảnh chính + dải thumbnail -->
        <div class="space-y-3">
          <div
            class="aspect-square w-full rounded-xl bg-slate-200 dark:bg-slate-700 max-h-[520px]"
          ></div>
          <div class="flex gap-2.5">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
            }
          </div>
        </div>

        <!-- Cột thông tin mua -->
        <div class="space-y-4">
          <div class="h-6 w-24 rounded bg-slate-200 dark:bg-slate-700"></div>
          <div class="h-8 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
          <div class="h-8 w-3/4 rounded bg-slate-200 dark:bg-slate-700"></div>

          <div class="h-10 w-48 rounded bg-slate-200 dark:bg-slate-700"></div>

          <!-- chip cấu hình -->
          <div class="flex flex-wrap gap-2 pt-1">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="h-7 w-24 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            }
          </div>

          <!-- khối số lượng + nút mua -->
          <div class="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div class="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700"></div>
            <div class="h-11 w-36 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
            <div class="h-12 w-full rounded-lg bg-slate-200 dark:bg-slate-700"></div>
            <div class="h-12 w-full rounded-lg bg-slate-200 dark:bg-slate-700"></div>
          </div>

          <!-- cam kết -->
          <div class="space-y-2 pt-1">
            @for (i of [1, 2, 3]; track i) {
              <div class="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700"></div>
            }
          </div>
        </div>
      </div>

      <!-- Khối mô tả / thông số -->
      <div class="mt-10 space-y-3">
        <div class="h-6 w-40 rounded bg-slate-200 dark:bg-slate-700"></div>
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <div class="h-4 rounded bg-slate-200 dark:bg-slate-700" [style.width.%]="i % 2 ? 100 : 88"></div>
        }
      </div>
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
export class ProductDetailSkeletonComponent {}
