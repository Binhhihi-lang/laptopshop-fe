import { Component, OnInit, computed, inject, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientCategoryService } from '@core/services/client-category.service';
import { ClientProductService } from '@core/services/client-product.service';
import { FlashSaleService } from '@core/services/flash-sale.service';
import { HomeBannerService } from '@core/services/home-banner.service';
import { CategoryResponse } from '@core/models/category.model';
import { ProductResponse } from '@core/models/product.model';
import { FlashSaleResponse } from '@core/models/flash-sale.model';
import { HomeBannerResponse } from '@core/models/home-banner.model';
import {
  CategoryTileComponent,
  EmptyStateComponent,
  FlashSaleStripComponent,
  HomeBannerCarouselComponent,
  LoadingComponent,
  ProductCardComponent,
} from '@shared/components';

/**
 * Trang chủ storefront:
 * - Carousel banner (admin cấu hình) hoặc hero mặc định khi chưa có banner.
 * - Strip flash sale + đếm ngược khi có phiên đang chạy.
 * - Trust strip 4 mục.
 * - Carousel thương hiệu (prev/next + kéo chuột).
 * - Danh mục nổi bật (nhu cầu sử dụng).
 * - Sản phẩm mới (sort createdAt DESC) + Bán chạy (sort=sold,desc).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    CategoryTileComponent,
    EmptyStateComponent,
    FlashSaleStripComponent,
    HomeBannerCarouselComponent,
    LoadingComponent,
    ProductCardComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly categoryService = inject(ClientCategoryService);
  private readonly productService = inject(ClientProductService);
  private readonly bannerService = inject(HomeBannerService);
  private readonly flashSaleService = inject(FlashSaleService);

  private readonly brandTrack = viewChild<ElementRef<HTMLDivElement>>('brandTrack');

  // Bảng màu xoay vòng cho ô danh mục (khớp mockup).
  private static readonly CATEGORY_TINTS = [
    '#7c3aed',
    '#2563eb',
    '#0891b2',
    '#0d9488',
    '#4f46e5',
    '#d97706',
  ];

  // Màu gradient cho từng thương hiệu trong carousel (xoay vòng) — khớp mockup.
  private static readonly BRAND_TINTS = [
    ['#0f172a', '#475569'],
    ['#2563eb', '#3b82f6'],
    ['#0ea5e9', '#0891b2'],
    ['#7c3aed', '#a78bfa'],
    ['#0d9488', '#2dd4bf'],
    ['#e11d48', '#f59e0b'],
    ['#16a34a', '#15803d'],
    ['#c026d3', '#a21caf'],
  ];

  // Icon Material cho ô "Nhu cầu sử dụng" — xoay vòng theo danh mục (khớp mockup).
  private static readonly CATEGORY_ICONS = [
    'local_fire_department',
    'laptop_mac',
    'auto_awesome',
    'star',
    'person',
    'devices',
  ];

  readonly trustItems = [
    {
      icon: 'verified_user',
      label: 'Chính hãng 100%',
      note: 'Hóa đơn VAT đầy đủ',
      tint: 'bg-primary-50 text-primary-600',
    },
    {
      icon: 'local_shipping',
      label: 'Giao hàng toàn quốc',
      note: 'Miễn phí từ 2 triệu',
      tint: 'bg-teal-50 text-teal-600',
    },
    {
      icon: 'autorenew',
      label: 'Đổi trả 30 ngày',
      note: '1 đổi 1 nhanh chóng',
      tint: 'bg-amber-50 text-amber-600',
    },
    {
      icon: 'shield',
      label: 'Bảo hành 12–24 tháng',
      note: 'Chính hãng, dài hạn',
      tint: 'bg-violet-50 text-violet-600',
    },
  ];

  readonly isLoading = signal(true);
  readonly categories = signal<CategoryResponse[]>([]);
  readonly newProducts = signal<ProductResponse[]>([]);
  readonly bestSellers = signal<ProductResponse[]>([]);
  readonly brands = signal<string[]>([]);

  /** Banner admin cấu hình — rỗng thì home rơi về hero mặc định. */
  readonly banners = signal<HomeBannerResponse[]>([]);
  /** Phiên flash đang chạy — null thì ẩn strip. */
  readonly activeFlashSale = signal<FlashSaleResponse | null>(null);

  /** Sản phẩm bán chạy nhất — hiện trong hero chip. */
  readonly topSeller = computed(() => this.bestSellers()[0] ?? null);

  ngOnInit(): void {
    this.load();
    this.loadBanners();
    this.loadFlashSale();
  }

  /**
   * Banner + flash sale gọi RIÊNG, không gộp vào `load()`: 2 API này lỗi thì chỉ
   * ẩn khối tương ứng, home vẫn hiện đủ phần còn lại (R20 — không
   * forkJoin-blocking).
   */
  private loadBanners(): void {
    this.bannerService.getActiveBanners().subscribe({
      next: (banners) => this.banners.set(banners),
      error: () => this.banners.set([]),
    });
  }

  private loadFlashSale(): void {
    this.flashSaleService.getActive().subscribe({
      next: (sale) => this.activeFlashSale.set(sale),
      error: () => this.activeFlashSale.set(null),
    });
  }

  /** Phiên vừa kết thúc → nạp lại để strip ẩn và giá về thường. */
  onFlashSaleExpired(): void {
    this.loadFlashSale();
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    // Gọi 4 API song song. Lỗi ở 1 cái không chặn các cái còn lại.
    Promise.all([
      this.categoryService
        .list()
        .toPromise()
        .catch(() => [] as CategoryResponse[]),
      this.productService
        .list({ page: 0, size: 8, sort: 'createdAt,desc' })
        .toPromise()
        .then((p) => p?.content ?? []),
      this.productService
        .list({ page: 0, size: 8, sort: 'sold,desc' })
        .toPromise()
        .then((p) => p?.content ?? []),
      this.productService
        .getBrands()
        .toPromise()
        .catch(() => [] as string[]),
    ]).then(([cats, news, bests, brandList]) => {
      this.categories.set(cats ?? []);
      this.newProducts.set(news ?? []);
      this.bestSellers.set(bests ?? []);
      this.brands.set(brandList ?? []);
      this.isLoading.set(false);
    });
  }

  /** Màu nền cho ô danh mục thứ i — xoay vòng theo bảng màu cố định. */
  categoryTint(index: number): string {
    const tints = HomeComponent.CATEGORY_TINTS;
    return tints[index % tints.length];
  }

  /** Gradient cho ô thương hiệu thứ i. */
  brandGradient(index: number): string {
    const [from, to] = HomeComponent.BRAND_TINTS[index % HomeComponent.BRAND_TINTS.length];
    return `linear-gradient(140deg, ${from}, ${to})`;
  }

  /** Dòng phụ dưới tên hãng — gợi ý dòng máy (mockup: "ROG · Vivobook"). */
  brandNote(brand: string): string {
    const notes: Record<string, string> = {
      apple: 'MacBook Air · Pro',
      asus: 'ROG · Vivobook',
      dell: 'XPS · Inspiron',
      hp: 'Spectre · Pavilion',
      lenovo: 'ThinkPad · IdeaPad',
      msi: 'Katana · Modern',
      acer: 'Aspire · Nitro',
    };
    return notes[brand.toLowerCase()] ?? 'Laptop chính hãng';
  }

  /** Icon cho ô nhu cầu thứ i — xoay vòng theo bảng icon cố định. */
  categoryIcon(index: number): string {
    const icons = HomeComponent.CATEGORY_ICONS;
    return icons[index % icons.length];
  }

  goCategory(cat: CategoryResponse): void {
    this.router.navigate(['/products'], { queryParams: { categoryId: cat.id } });
  }

  goBrand(brand: string): void {
    this.router.navigate(['/products'], { queryParams: { factory: brand } });
  }

  /** Cuộn carousel thương hiệu theo hướng — 80% bề rộng khung nhìn như mockup. */
  scrollBrands(direction: -1 | 1): void {
    const el = this.brandTrack()?.nativeElement;
    if (!el) {
      return;
    }
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  // --- Kéo chuột để cuộn carousel ---
  private dragging = false;
  private dragStartX = 0;
  private dragStartScroll = 0;

  onDragStart(event: PointerEvent): void {
    const el = this.brandTrack()?.nativeElement;
    if (!el) {
      return;
    }
    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartScroll = el.scrollLeft;
    el.setPointerCapture(event.pointerId);
  }

  onDragMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    const el = this.brandTrack()?.nativeElement;
    if (!el) {
      return;
    }
    el.scrollLeft = this.dragStartScroll - (event.clientX - this.dragStartX);
  }

  onDragEnd(): void {
    this.dragging = false;
  }
}
