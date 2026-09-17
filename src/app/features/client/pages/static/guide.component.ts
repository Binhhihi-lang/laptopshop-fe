import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/** Trang tĩnh "Hướng dẫn mua hàng". */
@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-[760px] mx-auto px-4 py-10">
      <h1 class="text-2xl font-bold mb-4">Hướng dẫn mua hàng</h1>
      <p>Mua sắm tại LaptopShop đơn giản qua 4 bước.</p>

      <h2 class="text-lg font-semibold mt-6 mb-2">Bước 1: Chọn sản phẩm</h2>
      <p>Tìm kiếm hoặc duyệt theo danh mục, thương hiệu. Bấm vào sản phẩm để xem chi tiết cấu hình.</p>

      <h2 class="text-lg font-semibold mt-6 mb-2">Bước 2: Thêm vào giỏ hàng</h2>
      <p>Chọn số lượng và bấm "Thêm vào giỏ" hoặc "Mua ngay" để đến thẳng trang thanh toán.</p>

      <h2 class="text-lg font-semibold mt-6 mb-2">Bước 3: Điền thông tin giao hàng</h2>
      <p>Nhập đầy đủ họ tên, số điện thoại, địa chỉ nhận hàng và chọn phương thức thanh toán.</p>

      <h2 class="text-lg font-semibold mt-6 mb-2">Bước 4: Nhận hàng</h2>
      <p>Đơn hàng được giao trong 1–3 ngày. Kiểm tra hàng trước khi thanh toán (với COD).</p>

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
export class GuideComponent {}
