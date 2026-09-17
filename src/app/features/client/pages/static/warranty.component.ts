import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

/** Trang tĩnh "Chính sách bảo hành". */
@Component({
  selector: 'app-warranty',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-[760px] mx-auto px-4 py-10 prose prose-slate dark:prose-invert">
      <h1 class="text-2xl font-bold mb-4">Chính sách bảo hành</h1>
      <p>LaptopShop cam kết mọi sản phẩm được phân phối chính hãng với đầy đủ hóa đơn VAT và phiếu bảo hành.</p>

      <h2 class="text-lg font-semibold mt-6 mb-2">Thời hạn bảo hành</h2>
      <ul class="list-disc pl-5 space-y-1">
        <li>Laptop chính hãng: bảo hành từ 12 đến 24 tháng tùy hãng.</li>
        <li>Phụ kiện đi kèm: bảo hành 6 tháng.</li>
      </ul>

      <h2 class="text-lg font-semibold mt-6 mb-2">Điều kiện bảo hành</h2>
      <ul class="list-disc pl-5 space-y-1">
        <li>Sản phẩm còn trong thời hạn bảo hành.</li>
        <li>Không hư hỏng do tác động vật lý, vào nước, cháy nổ.</li>
        <li>Còn nguyên tem bảo hành của hãng.</li>
      </ul>

      <h2 class="text-lg font-semibold mt-6 mb-2">Quy trình bảo hành</h2>
      <p>Mang sản phẩm đến cửa hàng hoặc liên hệ hotline để được hỗ trợ. Thời gian xử lý từ 3–7 ngày làm việc.</p>

      <a routerLink="/" class="inline-block mt-8 text-primary-600 dark:text-primary-400 font-medium">
        ← Về trang chủ
      </a>
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
export class WarrantyComponent {}
