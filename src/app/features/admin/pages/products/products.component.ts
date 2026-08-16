import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ViewChild,
  TemplateRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductService } from '@core/services/product.service';
import { CategoryService } from '@core/services/category.service';
import { ProductResponse } from '@core/models/product.model';
import { CategoryResponse } from '@core/models/category.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
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
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  protected readonly router = inject(Router);

  // Data signals
  products = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);

  // Loading states
  isLoading = signal(false);
  isLoadingCategories = signal(false);

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
  ]);

  // Category options for select
  categoryOptions = computed<SelectOption[]>(() =>
    this.categories().map((c) => ({ value: c.id, label: c.name })),
  );

  // Filtered products
  filteredProducts = signal<ProductResponse[]>([]);

  // Table column templates
  @ViewChild('imageColumn', { static: true }) imageColumn!: TemplateRef<any>;
  @ViewChild('codeColumn', { static: true }) codeColumn!: TemplateRef<any>;
  @ViewChild('nameColumn', { static: true }) nameColumn!: TemplateRef<any>;
  @ViewChild('priceColumn', { static: true }) priceColumn!: TemplateRef<any>;
  @ViewChild('quantityColumn', { static: true }) quantityColumn!: TemplateRef<any>;
  @ViewChild('soldColumn', { static: true }) soldColumn!: TemplateRef<any>;
  @ViewChild('categoryColumn', { static: true }) categoryColumn!: TemplateRef<any>;
  @ViewChild('statusColumn', { static: true }) statusColumn!: TemplateRef<any>;

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
    {
      label: 'Xóa',
      icon: 'delete',
      handler: (row) => this.deleteProduct(row),
      variant: 'danger',
    },
    {
      label: 'Kích hoạt/Khóa',
      icon: 'block',
      handler: (row) => this.toggleProductStatus(row),
      variant: 'ghost',
    },
  ];

  ngOnInit() {
    this.loadData();
    this.loadPresets();
  }

  loadData() {
    this.isLoading.set(true);
    this.isLoadingCategories.set(true);

    forkJoin({
      products: this.productService.getProducts(),
      categories: this.categoryService.getCategories(),
    }).subscribe({
      next: ({ products, categories }) => {
        this.products.set(products);
        this.categories.set(categories);
        this.applyFilter();
        this.isLoading.set(false);
        this.isLoadingCategories.set(false);
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.snackBar.open('Không thể tải dữ liệu sản phẩm', 'Đóng', { duration: 3000 });
        this.isLoading.set(false);
        this.isLoadingCategories.set(false);
      },
    });
  }

  applyFilter() {
    let filtered = this.products();

    // Search by name or code
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (product) =>
          (product.name || '').toLowerCase().includes(term) ||
          (product.code || '').toLowerCase().includes(term),
      );
    }

    // Filter by category
    const catId = this.categoryFilter();
    if (catId) {
      filtered = filtered.filter((p) => p.categoryId === catId);
    }

    // Filter by status
    if (this.statusFilter() !== 'all') {
      if (this.statusFilter() === 'active') {
        filtered = filtered.filter((product) => product.active);
      } else if (this.statusFilter() === 'inactive') {
        filtered = filtered.filter((product) => !product.active);
      }
    }

    // Filter by stock
    const stock = this.stockFilter();
    if (stock !== 'all') {
      if (stock === 'out') {
        filtered = filtered.filter((p) => p.quantity === 0);
      } else if (stock === 'low') {
        filtered = filtered.filter((p) => p.quantity > 0 && p.quantity < 5);
      } else if (stock === 'in') {
        filtered = filtered.filter((p) => p.quantity >= 5);
      }
    }

    // Apply sorting
    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();
    if (sortCol) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = (a as any)[sortCol];
        const bVal = (b as any)[sortCol];
        if (aVal === bVal) return 0;
        const result = aVal > bVal ? 1 : -1;
        return sortDir === 'asc' ? result : -result;
      });
    }

    this.filteredProducts.set(filtered);
  }

  onSearchChange() {
    this.applyFilter();
  }

  onCategoryChange(value?: string) {
    if (value !== undefined) {
      this.categoryFilter.set(value);
    }
    this.applyFilter();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive') {
    if (this.statusFilter() !== status) {
      this.statusFilter.set(status);
      this.applyFilter();
    }
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.categoryFilter.set('');
    this.stockFilter.set('all');
    this.applyFilter();
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
            this.snackBar.open('Xóa sản phẩm thành công', 'Đóng', { duration: 3000 });
            this.loadData();
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            this.snackBar.open('Xóa sản phẩm thất bại', 'Đóng', { duration: 3000 });
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

  // Sorting
  onSort(sortData: { column: string; direction: 'asc' | 'desc' }): void {
    this.sortColumn.set(sortData.column);
    this.sortDirection.set(sortData.direction);
    this.applyFilter();
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
  bulkProductButtons = computed<BulkToolbarButton[]>(() => [
    {
      label: 'Kích hoạt',
      icon: 'check_circle',
      variant: 'success',
      handler: () => this.bulkActivate(),
    },
    {
      label: 'Khóa',
      icon: 'block',
      variant: 'secondary',
      handler: () => this.bulkDeactivate(),
    },
    {
      label: 'Xóa',
      icon: 'delete',
      variant: 'danger',
      handler: () => this.bulkDelete(),
      disabled: this.deletingProductId() !== null,
    },
  ]);

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
          this.snackBar.open('Xóa sản phẩm thành công', 'Đóng', { duration: 3000 });
          this.loadData();
          this.selectedProductIds.set([]);
          this.deletingProductId.set(null);
        },
        error: (error) => {
          console.error('Error bulk deleting products:', error);
          this.snackBar.open('Xóa sản phẩm thất bại', 'Đóng', { duration: 3000 });
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
    this.snackBar.open(`Đang ${verb} ${ids.length} sản phẩm...`, 'Đóng', { duration: 2000 });
    this.productService.bulkUpdateProductStatus(ids, active).subscribe({
      next: () => {
        this.snackBar.open(`${active ? 'Kích hoạt' : 'Khóa'} sản phẩm thành công`, 'Đóng', {
          duration: 3000,
        });
        this.loadData();
        this.selectedProductIds.set([]);
      },
      error: (error) => {
        console.error(`Error bulk ${verb} products:`, error);
        this.snackBar.open(
          error.error?.message || `${active ? 'Kích hoạt' : 'Khóa'} sản phẩm thất bại`,
          'Đóng',
          { duration: 3000 },
        );
      },
    });
  }

  toggleProductStatus(product: ProductResponse): void {
    const newActive = !product.active;
    this.snackBar.open(
      `Đang ${newActive ? 'kích hoạt' : 'khóa'} sản phẩm ${product.name}...`,
      'Đóng',
      { duration: 2000 },
    );

    this.productService.bulkUpdateProductStatus([product.id], newActive).subscribe({
      next: () => {
        this.snackBar.open(`${newActive ? 'Kích hoạt' : 'Khóa'} sản phẩm thành công`, 'Đóng', {
          duration: 3000,
        });
        this.loadData();
      },
      error: (error) => {
        console.error('Error toggling product status:', error);
        this.snackBar.open(
          error.error?.message || `${newActive ? 'Kích hoạt' : 'Khóa'} sản phẩm thất bại`,
          'Đóng',
          { duration: 3000 },
        );
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
    this.applyFilter();
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
    return cat?.name || '—';
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

  getProductStatus(product: ProductResponse): string {
    return this.getStatusLabel(product);
  }
}
