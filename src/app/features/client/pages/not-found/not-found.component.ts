import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

/** 404 trong layout storefront — vẫn giữ header/footer. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-20 text-center">
      <h1
        class="text-[120px] leading-none font-bold bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent"
      >
        404
      </h1>
      <h2 class="text-2xl font-bold mt-4 mb-3">Không tìm thấy trang</h2>
      <p class="text-slate-500 dark:text-slate-400 mb-8">
        Trang bạn tìm không tồn tại hoặc đã bị di chuyển.
      </p>
      <a
        routerLink="/"
        class="inline-flex px-5 py-2.5 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700"
      >Về trang chủ</a>
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
export class NotFoundComponent {}
