import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * Layout riêng cho các trang xác thực storefront (đăng nhập / đăng ký / quên
 * mật khẩu / đặt lại mật khẩu) — split-screen, KHÔNG dùng header + footer của
 * `ClientLayoutComponent`.
 *
 * Trái: brand panel gradient (ẩn dưới lg). Phải: card form bọc `<router-outlet>`
 * nên các trang con chỉ render nội dung form, không tự bọc card.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterModule, RouterOutlet, MatIconModule],
  template: `
    <div class="min-h-screen grid lg:grid-cols-2">
      <!-- Brand panel: chỉ hiện từ lg -->
      <aside
        class="hidden lg:flex flex-col justify-center gap-5 p-14 text-white relative overflow-hidden
          bg-[radial-gradient(80%_60%_at_85%_10%,rgba(255,255,255,0.16),transparent_60%),radial-gradient(60%_50%_at_10%_90%,rgba(34,211,238,0.25),transparent_60%),linear-gradient(150deg,#1d4ed8_0%,#4f46e5_48%,#7c3aed_100%)]"
      >
        <a routerLink="/" class="inline-flex items-center gap-2.5 font-extrabold text-lg">
          <span
            class="w-9 h-9 rounded-[10px] bg-white/15 backdrop-blur-sm grid place-items-center"
          >
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
              <span class="w-[22px] h-[22px] rounded-full bg-white/20 grid place-items-center shrink-0">
                <mat-icon class="!w-3 !h-3 !text-xs">check</mat-icon>
              </span>
              {{ perk }}
            </li>
          }
        </ul>

        <svg viewBox="0 0 240 160" aria-hidden="true" class="max-w-[330px] mt-2.5">
          <rect x="40" y="20" width="160" height="100" rx="9" fill="rgba(255,255,255,.14)" />
          <rect x="44" y="27" width="152" height="11" rx="5.5" fill="rgba(255,255,255,.25)" />
          <rect x="36" y="120" width="168" height="9" rx="4.5" fill="rgba(255,255,255,.18)" />
          <path d="M64 129 h112 l-7 13 h-98 z" fill="rgba(255,255,255,.12)" />
        </svg>
      </aside>

      <!-- Panel form -->
      <div class="flex items-center justify-center px-4 py-10 bg-slate-50 dark:bg-slate-950">
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
export class AuthLayoutComponent {
  readonly perks = [
    'Theo dõi đơn hàng mọi lúc',
    'Lưu giỏ hàng giữa các thiết bị',
    'Ưu đãi riêng cho thành viên',
  ];
}
