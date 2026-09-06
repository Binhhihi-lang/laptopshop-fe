import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientCategoryService } from '@core/services/client-category.service';
import { ClientProductService } from '@core/services/client-product.service';
import { CategoryResponse } from '@core/models/category.model';
import { ProductResponse } from '@core/models/product.model';
import {
  ButtonComponent,
  CardComponent,
  EmptyStateComponent,
  FormFieldComponent,
  InputComponent,
  LoadingComponent,
  SelectComponent,
  SelectOption,
} from '@shared/components';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    FormFieldComponent,
    InputComponent,
    LoadingComponent,
    SelectComponent,
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ClientProductService);
  private readonly categoryService = inject(ClientCategoryService);

  readonly isLoading = signal(true);
  readonly products = signal<ProductResponse[]>([]);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly categories = signal<CategoryResponse[]>([]);
  readonly brands = signal<string[]>([]);

  // Filter form
  readonly form: FormGroup = this.fb.group({
    keyword: [''],
    categoryId: [''],
    factory: [''],
    minPrice: [null as number | null],
    maxPrice: [null as number | null],
    sort: ['createdAt,desc'],
  });

  readonly sortOptions: SelectOption[] = [
    { value: 'createdAt,desc', label: 'Mới nhất' },
    { value: 'sold,desc', label: 'Bán chạy nhất' },
    { value: 'price,asc', label: 'Giá tăng dần' },
    { value: 'price,desc', label: 'Giá giảm dần' },
  ];

  ngOnInit(): void {
    // Load categories + brands song song
    Promise.all([
      this.categoryService
        .list()
        .toPromise()
        .catch(() => [] as CategoryResponse[]),
      this.productService
        .getBrands()
        .toPromise()
        .catch(() => [] as string[]),
    ]).then(([cats, brs]) => {
      this.categories.set(cats ?? []);
      this.brands.set(brs ?? []);
    });

    // Subscribe query params thay đổi → reload + patch form
    this.route.queryParamMap.subscribe((params) => {
      const page = +(params.get('page') ?? '0');
      const keyword = params.get('keyword') ?? '';
      const categoryId = params.get('categoryId') ?? '';
      const factory = params.get('factory') ?? '';
      const minPrice = params.get('minPrice');
      const maxPrice = params.get('maxPrice');
      const sort = params.get('sort') ?? 'createdAt,desc';

      this.form.patchValue(
        {
          keyword,
          categoryId,
          factory,
          minPrice: minPrice ? +minPrice : null,
          maxPrice: maxPrice ? +maxPrice : null,
          sort,
        },
        { emitEvent: false },
      );
      this.load(page);
    });
  }

  load(page: number): void {
    this.isLoading.set(true);
    const v = this.form.value;
    this.productService
      .list({
        page,
        size: PAGE_SIZE,
        sort: v.sort,
        keyword: v.keyword || undefined,
        categoryId: v.categoryId || undefined,
        factory: v.factory || undefined,
        minPrice: v.minPrice ?? undefined,
        maxPrice: v.maxPrice ?? undefined,
      })
      .subscribe({
        next: (p) => {
          this.products.set(p.content);
          this.totalPages.set(p.totalPages);
          this.totalElements.set(p.totalElements);
          this.currentPage.set(p.number);
          this.isLoading.set(false);
        },
        error: () => {
          this.products.set([]);
          this.isLoading.set(false);
        },
      });
  }

  onApplyFilter(): void {
    const v = this.form.value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: 0,
        keyword: v.keyword || null,
        categoryId: v.categoryId || null,
        factory: v.factory || null,
        minPrice: v.minPrice ?? null,
        maxPrice: v.maxPrice ?? null,
        sort: v.sort,
      },
      queryParamsHandling: 'merge',
    });
  }

  onResetFilter(): void {
    this.form.reset({
      keyword: '',
      categoryId: '',
      factory: '',
      minPrice: null,
      maxPrice: null,
      sort: 'createdAt,desc',
    });
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  onPageChange(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Build category select options dynamically
  get categoryOptions(): SelectOption[] {
    return [
      { value: '', label: 'Tất cả danh mục' },
      ...this.categories().map((c) => ({ value: c.id, label: c.name })),
    ];
  }

  get brandOptions(): SelectOption[] {
    return [
      { value: '', label: 'Tất cả hãng' },
      ...this.brands().map((b) => ({ value: b, label: b })),
    ];
  }

  // Tính mảng số trang cho pagination
  get pageNumbers(): number[] {
    const total = this.totalPages();
    const cur = this.currentPage();
    const start = Math.max(0, cur - 2);
    const end = Math.min(total - 1, cur + 2);
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
