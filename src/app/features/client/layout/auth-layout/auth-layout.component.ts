import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * Layout riêng cho các trang xác thực storefront (đăng nhập / đăng ký / quên
 * mật khẩu / đặt lại mật khẩu) — split-screen, KHÔNG dùng header + footer của
 * `ClientLayoutComponent`.
 *
 * Trái: brand panel ảnh laptop thật + lớp phủ tối (ẩn dưới lg). Phải: card form
 * bọc `<router-outlet>` nên các trang con chỉ render nội dung form.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterModule, RouterOutlet, MatIconModule],
  template: `
    <div class="min-h-screen grid lg:grid-cols-2">
      <!-- Brand panel: ảnh thật + overlay tối để chữ trắng đạt tương phản AA -->
      <aside class="hidden lg:block relative overflow-hidden">
        <img
          src="https://res.cloudinary.com/dbtbj5s8w/image/upload/w_1200,q_auto:eco,f_auto/v1789435492/product/onte7itapxpccpkuf769.webp"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 w-full h-full object-cover"
        />
        <!-- Lớp tối 2 chiều: đảm bảo chữ trắng ≥ 4.5:1 ở mọi vùng ảnh -->
        <div
          class="absolute inset-0 bg-[linear-gradient(155deg,rgba(15,23,42,0.88)_0%,rgba(30,41,59,0.7)_45%,rgba(15,23,42,0.92)_100%)]"
        ></div>

        <div class="relative h-full flex flex-col justify-center gap-5 p-14 text-white">
          <a routerLink="/" class="inline-flex items-center gap-2.5 font-extrabold text-lg">
            <span class="w-9 h-9 rounded-[10px] bg-white/15 backdrop-blur-sm grid place-items-center">
              <mat-icon class="!w-5 !h-5 !text-xl">laptop_chromebook</mat-icon>
            </span>
            LaptopShop
          </a>

          <h2 class="text-3xl font-extrabold tracking-tight leading-tight">
            Mua sắm laptop<br />dễ dàng hơn bao giờ hết
          </h2>
          <p class="text-base text-white/85 max-w-[42ch]">
            Đăng nhập để theo dõi đơn hàng, lưu giỏ hàng và nhận ưu đãi riêng cho thành viên.
          </p>

          <ul class="flex flex-col gap-2.5 text-sm text-white/90">
            @for (perk of perks; track perk) {
              <li class="flex items-center gap-2.5">
                <span
                  class="w-[22px] h-[22px] rounded-full bg-white/20 grid place-items-center shrink-0"
                >
                  <mat-icon class="!w-3 !h-3 !text-xs">check</mat-icon>
                </span>
                {{ perk }}
              </li>
            }
          </ul>
        </div>
      </aside>

      <!-- Panel form: <main> để mọi trang auth có landmark chính. -->
      <main class="flex items-center justify-center px-4 py-10 bg-slate-50 dark:bg-slate-950">
        <div class="w-full max-w-[424px]">
          <a routerLink="/" class="lg:hidden inline-flex items-center gap-2 mb-6">
            <mat-icon class="!w-7 !h-7 !text-3xl text-primary-600">laptop_chromebook</mat-icon>
            <span class="text-lg font-bold text-slate-900 dark:text-white">LaptopShop</span>
          </a>

          <div
            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-7"
          >
            <router-outlet />
          </div>
        </div>
      </main>
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
export class AuthLayoutComponent {
  readonly perks = [
    'Theo dõi đơn hàng mọi lúc',
    'Lưu giỏ hàng giữa các thiết bị',
    'Ưu đãi riêng cho thành viên',
  ];
}
