import {
  Component,
  DestroyRef,
  OnInit,
  signal,
  computed,
  inject,
  ViewChild,
  TemplateRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, forkJoin } from 'rxjs';
import { ProductService } from '@core/services/product.service';
import { CategoryService } from '@core/services/category.service';
import { AuthService } from '@core/services/auth.service';
import { ProductResponse } from '@core/models/product.model';
import { CategoryResponse } from '@core/models/category.model';
import { Page } from '@core/models/page.model';
import { NotificationService } from '@core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';
import {
  PageHeaderComponent,
  ColumnPickerComponent,
  FilterPresetsComponent,
  FilterPreset,
  BulkToolbarComponent,
  BulkToolbarButton,
} from '@shared/components';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    TableComponent,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    ColumnPickerComponent,
    FilterPresetsComponent,
    BulkToolbarComponent,
  ],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsComponent implements OnInit, AfterViewInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  protected readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  canDeleteProduct = computed(() => this.authService.hasPermission('DELETE_PRODUCT'));

  // Data signals
  products = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);

  // Loading states
  isLoading = signal(false);
  isLoadingCategories = signal(false);
  permissionDenied = signal<boolean>(false);

  // Filter signals
  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  categoryFilter = signal('');
  stockFilter = signal<'all' | 'out' | 'low' | 'in'>('all');

  // UI state signals
  selectedProductIds = signal<string[]>([]);
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  deletingProductId = signal<string | null>(null);

  // Column definitions for shared table
  columns = signal<Column<ProductResponse>[]>([
    { key: 'image', label: 'Ảnh', visible: true, width: '60px', align: 'center' },
    { key: 'code', label: 'Mã SKU', visible: true, width: '120px', align: 'left' },
    { key: 'name', label: 'Tên sản phẩm', visible: true, sortable: true },
    { key: 'price', label: 'Giá', visible: true, width: '130px', align: 'right', sortable: true },
    { key: 'quantity', label: 'Tồn kho', visible: true, width: '140px', align: 'left' },
    {
      key: 'sold',
      label: 'Đã bán',
      visible: true,
      width: '100px',
      align: 'center',
      sortable: true,
    },
    { key: 'category', label: 'Danh mục', visible: true, width: '150px', align: 'left' },
    { key: 'status', label: 'Trạng thái', visible: true, width: '130px', align: 'center' },
    { key: 'createdAt', label: 'Ngày tạo', visible: false, sortable: true, align: 'center' },
    { key: 'updatedAt', label: 'Ngày sửa', visible: false, sortable: true, align: 'center' },
  ]);

  // Category options for select
  categoryOptions = computed<SelectOption[]>(() =>
    this.categories().map((c) => ({ value: c.id, label: c.name })),
  );

  // Pagination — trạng thái trang do server trả về, 0-based như Page.number
  readonly pageSize = 20;
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);

  // Ô tìm kiếm gõ liên tục: gộp 300ms mới gọi API để không bắn request mỗi ký tự
  private readonly searchInput$ = new Subject<string>();

  // Table column templates
  @ViewChild('imageColumn') imageColumn!: TemplateRef<any>;
  @ViewChild('codeColumn') codeColumn!: TemplateRef<any>;
  @ViewChild('nameColumn') nameColumn!: TemplateRef<any>;
  @ViewChild('priceColumn') priceColumn!: TemplateRef<any>;
  @ViewChild('quantityColumn') quantityColumn!: TemplateRef<any>;
  @ViewChild('soldColumn') soldColumn!: TemplateRef<any>;
  @ViewChild('categoryColumn') categoryColumn!: TemplateRef<any>;
  @ViewChild('statusColumn') statusColumn!: TemplateRef<any>;
  @ViewChild('createdAtColumn') createdAtColumn!: TemplateRef<any>;
  @ViewChild('updatedAtColumn') updatedAtColumn!: TemplateRef<any>;

  // Table actions
  actions: TableAction<ProductResponse>[] = [
    {
      label: 'Xem chi tiết',
      icon: 'visibility',
      handler: (row) => this.viewProduct(row),
      variant: 'ghost',
    },
    {
      label: 'Chỉnh sửa',
      icon: 'edit',
      handler: (row) => this.editProduct(row),
      variant: 'ghost',
    },
    ...(this.authService.hasPermission('DELETE_PRODUCT')
      ? [
          {
            label: 'Xóa',
            icon: 'delete',
            handler: (row) => this.deleteProduct(row),
            variant: 'danger',
          } as TableAction<ProductResponse>,
        ]
      : []),
    {
      label: 'Kích hoạt/Khóa',
      icon: 'block',
      handler: (row) => this.toggleProductStatus(row),
      variant: 'ghost',
    },
  ];

  ngOnInit() {
    // Gõ tìm kiếm: chờ 300ms rồi mới gọi API trang đầu.
    this.searchInput$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadPage(0));

    this.loadData();
    this.loadPresets();
  }

  /** Tải lần đầu: danh mục cho bộ lọc + trang đầu tiên. */
  loadData() {
    this.isLoading.set(true);
    this.isLoadingCategories.set(true);
    this.permissionDenied.set(false);

    forkJoin({
      products: this.productService.getProductsPage(this.buildQuery(0)),
      categories: this.categoryService.getCategories(),
    }).subscribe({
      next: ({ products, categories }) => {
        this.categories.set(categories);
        this.applyPage(products);
        this.isLoading.set(false);
        this.isLoadingCategories.set(false);
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.isLoading.set(false);
        this.isLoadingCategories.set(false);
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.permissionDenied.set(true);
        }
      },
    });
  }

  /** Lấy một trang theo bộ lọc hiện tại — mọi thay đổi lọc/sắp xếp đều đi qua đây. */
  loadPage(page: number) {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    this.productService.getProductsPage(this.buildQuery(page)).subscribe({
      next: (result) => {
        // Xoá hết dòng của trang cuối thì lùi về trang trước thay vì hiện bảng rỗng
        if (result.content.length === 0 && page > 0 && result.totalElements > 0) {
          this.loadPage(page - 1);
          return;
        }
        this.applyPage(result);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.products.set([]);
        this.isLoading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.permissionDenied.set(true);
        }
      },
    });
  }

  private applyPage(result: Page<ProductResponse>) {
    this.products.set(result.content);
    this.currentPage.set(result.number);
    this.totalPages.set(result.totalPages);
    this.totalElements.set(result.totalElements);
    this.selectedProductIds.set([]);
  }

  private buildQuery(page: number) {
    const status = this.statusFilter();
    const stock = this.stockFilter();
    const sortCol = this.sortColumn();
    return {
      keyword: this.searchTerm().trim() || undefined,
      categoryId: this.categoryFilter() || undefined,
      active: status === 'all' ? undefined : status === 'active',
      stockStatus: stock === 'all' ? undefined : stock,
      page,
      size: this.pageSize,
      sort: sortCol ? `${sortCol},${this.sortDirection()}` : 'createdAt,desc',
    };
  }

  onSearchChange() {
    this.searchInput$.next(this.searchTerm());
  }

  onCategoryChange(value?: string) {
    if (value !== undefined) {
      this.categoryFilter.set(value);
    }
    this.loadPage(0);
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive') {
    if (this.statusFilter() !== status) {
      this.statusFilter.set(status);
      this.loadPage(0);
    }
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.categoryFilter.set('');
    this.stockFilter.set('all');
    this.loadPage(0);
  }

  hasActiveFilters(): boolean {
    return (
      this.searchTerm().trim() !== '' ||
      this.statusFilter() !== 'all' ||
      this.categoryFilter() !== '' ||
      this.stockFilter() !== 'all'
    );
  }

  ngAfterViewInit(): void {
    // Assign templates to columns after view init
    this.columns.update((cols) =>
      cols.map((col) => {
        const templateMap: Record<string, TemplateRef<any>> = {
          image: this.imageColumn,
          code: this.codeColumn,
          name: this.nameColumn,
          price: this.priceColumn,
          quantity: this.quantityColumn,
          sold: this.soldColumn,
          category: this.categoryColumn,
          status: this.statusColumn,
          createdAt: this.createdAtColumn,
          updatedAt: this.updatedAtColumn,
        };
        if (templateMap[col.key]) {
          return { ...col, template: templateMap[col.key] };
        }
        return col;
      }),
    );
  }

  viewProduct(product: ProductResponse) {
    this.router.navigate(['/admin/products', product.id]);
  }

  editProduct(product: ProductResponse) {
    this.router.navigate(['/admin/products', product.id, 'edit']);
  }

  deleteProduct(product: ProductResponse) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa sản phẩm "${product.name}" (${product.code})? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.productService.deleteProduct(product.id).subscribe({
          next: () => {
            this.notification.success('Xóa sản phẩm thành công');
            this.loadPage(this.currentPage());
          },
          error: (error) => {
            console.error('Error deleting product:', error);
          },
        });
      }
    });
  }

  // Column picker
  toggleColumn(columnKey: string): void {
    this.columns.update((cols) =>
      cols.map((c) => (c.key === columnKey ? { ...c, visible: !c.visible } : c)),
    );
  }

  // Sorting — sắp xếp do server làm, đổi cột là quay về trang đầu
  onSort(sortData: { column: string; direction: 'asc' | 'desc' }): void {
    this.sortColumn.set(sortData.column);
    this.sortDirection.set(sortData.direction);
    this.loadPage(0);
  }

  onPrevPage(): void {
    if (this.currentPage() > 0) {
      this.loadPage(this.currentPage() - 1);
    }
  }

  onNextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.loadPage(this.currentPage() + 1);
    }
  }

  /** app-table phát số trang 1-based; state nội bộ 0-based. */
  onPageChange(page: number): void {
    this.loadPage(page - 1);
  }

  // Selection
  selectedProducts = computed(() =>
    this.products().filter((p) => this.selectedProductIds().includes(p.id)),
  );

  selectedCount = computed(() => this.selectedProductIds().length);

  onSelectionChange(rows: ProductResponse[]): void {
    this.selectedProductIds.set(rows.map((r) => r.id));
  }

  // Bulk toolbar buttons
  bulkProductButtons = computed<BulkToolbarButton[]>(() => {
    const buttons: BulkToolbarButton[] = [
      {
        label: 'Kích hoạt',
        icon: 'check_circle',
        variant: 'success',
        handler: () => this.bulkActivate(),
      },
      { label: 'Khóa', icon: 'block', variant: 'secondary', handler: () => this.bulkDeactivate() },
    ];
    if (this.canDeleteProduct()) {
      buttons.push({
        label: 'Xóa',
        icon: 'delete',
        variant: 'danger',
        handler: () => this.bulkDelete(),
        disabled: this.deletingProductId() !== null,
      });
    }
    return buttons;
  });

  // Bulk actions (real via API)
  bulkDelete(): void {
    if (this.selectedCount() === 0) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa hàng loạt',
        message: `Bạn có chắc chắn muốn xóa ${this.selectedCount()} sản phẩm đã chọn? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) return;

      const idsToDelete = [...this.selectedProductIds()];
      this.deletingProductId.set(idsToDelete[0] ?? null);
      this.productService.bulkDeleteProducts(idsToDelete).subscribe({
        next: () => {
          this.notification.success('Xóa sản phẩm thành công');
          this.loadPage(this.currentPage());
          this.selectedProductIds.set([]);
          this.deletingProductId.set(null);
        },
        error: (error) => {
          console.error('Error bulk deleting products:', error);
          this.deletingProductId.set(null);
        },
      });
    });
  }

  bulkActivate(): void {
    if (this.selectedCount() === 0) return;
    this.updateBulkStatus(true);
  }

  bulkDeactivate(): void {
    if (this.selectedCount() === 0) return;
    this.updateBulkStatus(false);
  }

  private updateBulkStatus(active: boolean): void {
    const ids = [...this.selectedProductIds()];
    const verb = active ? 'kích hoạt' : 'khóa';
    this.notification.info(`Đang ${verb} ${ids.length} sản phẩm...`, 2000);
    this.productService.bulkUpdateProductStatus(ids, active).subscribe({
      next: () => {
        this.notification.success(`${active ? 'Kích hoạt' : 'Khóa'} sản phẩm thành công`);
        this.loadPage(this.currentPage());
        this.selectedProductIds.set([]);
      },
      error: (error) => {
        console.error(`Error bulk ${verb} products:`, error);
      },
    });
  }

  toggleProductStatus(product: ProductResponse): void {
    const newActive = !product.active;
    this.notification.info(
      `Đang ${newActive ? 'kích hoạt' : 'khóa'} sản phẩm ${product.name}...`,
      2000,
    );

    this.productService.bulkUpdateProductStatus([product.id], newActive).subscribe({
      next: () => {
        this.notification.success(`${newActive ? 'Kích hoạt' : 'Khóa'} sản phẩm thành công`);
        this.loadPage(this.currentPage());
      },
      error: (error) => {
        console.error('Error toggling product status:', error);
      },
    });
  }

  // Filter presets
  filterPresets = signal<FilterPreset[]>([
    { name: 'Hết hàng', searchTerm: '', stock: 'out' },
    { name: 'Sắp hết', searchTerm: '', stock: 'low' },
    { name: 'Còn hàng', searchTerm: '', stock: 'in' },
  ]);

  loadPresets(): void {
    const stored = localStorage.getItem('productFilterPresets');
    if (stored) {
      try {
        const storedPresets = JSON.parse(stored) as FilterPreset[];
        this.filterPresets.update((presets) => {
          const knownNames = new Set(presets.map((p) => p.name));
          const fresh = storedPresets.filter((p) => !knownNames.has(p.name));
          return [...presets, ...fresh].slice(0, 10);
        });
      } catch {
        // ignore
      }
    }
  }

  private persistPresets(): void {
    try {
      const defaultNames = new Set(['Hết hàng', 'Sắp hết', 'Còn hàng']);
      const userPresets = this.filterPresets().filter((p) => !defaultNames.has(p.name));
      localStorage.setItem('productFilterPresets', JSON.stringify(userPresets));
    } catch {
      // ignore
    }
  }

  applyPreset(preset: FilterPreset): void {
    this.searchTerm.set(preset['searchTerm'] ?? '');
    this.categoryFilter.set(preset['categoryId'] ?? '');
    this.statusFilter.set(preset['status'] ?? 'all');
    this.stockFilter.set(preset['stock'] ?? 'all');
    this.loadPage(0);
  }

  saveCurrentPreset(): void {
    const name = prompt('Nhập tên bộ lọc:');
    if (name) {
      const preset: FilterPreset = {
        name,
        searchTerm: this.searchTerm(),
        categoryId: this.categoryFilter(),
        status: this.statusFilter(),
        stock: this.stockFilter(),
      };
      this.filterPresets.update((presets) => [preset, ...presets].slice(0, 10));
      this.persistPresets();
    }
  }

  deletePreset(index: number): void {
    this.filterPresets.update((presets) => presets.filter((_, i) => i !== index));
    this.persistPresets();
  }

  getCategoryName(categoryId: string): string {
    const cat = this.categories().find((c) => c.id === categoryId);
    // Khi category bị xóa mềm (hoặc chưa gán) thì không có trong danh sách
    // -> categoryId không tìm thấy -> hiển thị "Chưa phân loại" thay vì dấu —
    return cat?.name || 'Chưa phân loại';
  }

  getStatusColor(product: ProductResponse): 'success' | 'danger' {
    return product.active ? 'success' : 'danger';
  }

  getStatusLabel(product: ProductResponse): string {
    return product.active ? 'Đang hoạt động' : 'Ngừng hoạt động';
  }

  getStatusIcon(product: ProductResponse): string {
    return product.active ? 'check_circle' : 'cancel';
  }

  getStockStatus(product: ProductResponse): {
    label: string;
    color: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
  } {
    if (product.quantity === 0) {
      return { label: 'Hết hàng', color: 'danger' };
    }
    if (product.quantity < 5) {
      return { label: 'Sắp hết', color: 'warning' };
    }
    return { label: 'Còn hàng', color: 'success' };
  }

  trackByProductId(product: ProductResponse): string {
    return product.id;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  // Template helpers for table
  getProductImage(product: ProductResponse): string {
    return product.image || '';
  }

  getProductCode(product: ProductResponse): string {
    return product.code || '—';
  }

  getProductName(product: ProductResponse): string {
    return product.name || '—';
  }

  getProductPrice(product: ProductResponse): string {
    return (product.price || 0).toLocaleString('vi-VN') + ' ₫';
  }

  getProductQuantity(product: ProductResponse): string {
    return product.quantity.toString();
  }

  getProductSold(product: ProductResponse): string {
    return (product.sold || 0).toString();
  }

  getProductCategory(product: ProductResponse): string {
    return this.getCategoryName(product.categoryId);
  }

  // True khi category của product bị khóa (active=false) — dùng hiển thị
  // badge cảnh báo MỀM "Danh mục khóa" (không chặn, không đổi dữ liệu).
  isCategoryLocked(product: ProductResponse): boolean {
    return product.categoryActive === false;
  }

  getProductStatus(product: ProductResponse): string {
    return this.getStatusLabel(product);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
