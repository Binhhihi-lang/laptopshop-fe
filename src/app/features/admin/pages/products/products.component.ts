import { Component, OnInit, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '@shared/material.module';
import { ProductService } from '@core/services/product.service';
import { CategoryService } from '@core/services/category.service';
import { ProductResponse } from '@core/models/product.model';
import { CategoryResponse } from '@core/models/category.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

interface Column {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
}

interface FilterPreset {
  name: string;
  searchTerm: string;
  categoryId: string;
  status: 'all' | 'active' | 'inactive';
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  // Data signals
  products = signal<ProductResponse[]>([]);
  filteredProducts = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);

  // Loading states
  isLoading = signal(false);
  isLoadingCategories = signal(false);

  // Filter signals
  searchTerm = signal('');
  categoryFilter = signal<string>('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // UI state signals
  showColumnPicker = signal(false);
  showFilterPresets = signal(false);
  density = signal<'comfortable' | 'compact' | 'spacious'>('comfortable');
  selectedProductIds = signal<string[]>([]);
  selectAll = signal(false);
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  actionMenuOpen = signal<string | null>(null);

  // Column definitions
  columns = signal<Column[]>([
    { key: 'image', label: 'Hình ảnh', visible: true, width: '80px' },
    { key: 'code', label: 'Mã SP', visible: true, width: '120px' },
    { key: 'name', label: 'Tên sản phẩm', visible: true },
    { key: 'categoryName', label: 'Danh mục', visible: true, width: '180px' },
    { key: 'price', label: 'Giá', visible: true, width: '140px' },
    { key: 'quantity', label: 'Tồn kho', visible: true, width: '100px' },
    { key: 'sold', label: 'Đã bán', visible: false, width: '100px' },
    { key: 'status', label: 'Trạng thái', visible: true, width: '140px' },
    { key: 'createdAt', label: 'Ngày tạo', visible: false },
    { key: 'actions', label: 'Thao tác', visible: true, width: '120px' },
  ]);

  // Filter presets
  filterPresets = signal<FilterPreset[]>([
    { name: 'Sản phẩm hoạt động', searchTerm: '', categoryId: '', status: 'active' },
    { name: 'Sản phẩm ngừng hoạt động', searchTerm: '', categoryId: '', status: 'inactive' },
    { name: 'Hết hàng', searchTerm: '', categoryId: '', status: 'all' },
    { name: 'Bán chạy', searchTerm: '', categoryId: '', status: 'all' },
  ]);

  // Visible columns computed
  visibleColumns = computed(() =>
    this.columns()
      .filter((c) => c.visible)
      .map((c) => c.key),
  );

  // Selected count
  selectedCount = computed(() => this.selectedProductIds().length);

  // All visible products IDs
  visibleProductIds = computed(() => this.filteredProducts().map((p) => p.id));

  // Sorting
  sortedProducts = computed(() => {
    const products = [...this.filteredProducts()];
    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) return products;

    return products.sort((a, b) => {
      const aVal = (a as any)[column];
      const bVal = (b as any)[column];
      if (aVal === bVal) return 0;
      const result = aVal > bVal ? 1 : -1;
      return direction === 'asc' ? result : -result;
    });
  });

  constructor() {
    // Persist filter presets to localStorage
    effect(() => {
      localStorage.setItem('productFilterPresets', JSON.stringify(this.filterPresets()));
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.loadPresets();
  }

  loadData(): void {
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

  loadPresets(): void {
    const stored = localStorage.getItem('productFilterPresets');
    if (stored) {
      try {
        this.filterPresets.set([...this.filterPresets(), ...JSON.parse(stored)].slice(0, 10));
      } catch {
        // ignore
      }
    }
  }

  applyFilter(): void {
    let filtered = this.products();

    // Search filter
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (product) =>
          (product.name || '').toLowerCase().includes(term) ||
          (product.code || '').toLowerCase().includes(term) ||
          (product.categoryName || '').toLowerCase().includes(term) ||
          (product.shortDesc || '').toLowerCase().includes(term),
      );
    }

    // Category filter
    const categoryId = this.categoryFilter();
    if (categoryId) {
      filtered = filtered.filter((product) => product.categoryId === categoryId);
    }

    // Status filter
    const status = this.statusFilter();
    if (status !== 'all') {
      filtered = filtered.filter((product) => {
        if (status === 'active') return product.active;
        return !product.active;
      });
    }

    this.filteredProducts.set(filtered);
    this.updateSelectAll();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  onCategoryChange(): void {
    this.applyFilter();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(status);
    this.applyFilter();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.categoryFilter.set('');
    this.statusFilter.set('all');
    this.applyFilter();
  }

  // Column picker
  toggleColumnPicker(): void {
    this.showColumnPicker.set(!this.showColumnPicker());
  }

  toggleColumn(columnKey: string): void {
    this.columns.update((cols) =>
      cols.map((c) => (c.key === columnKey ? { ...c, visible: !c.visible } : c)),
    );
  }

  // Sorting
  onSort(columnKey: string): void {
    if (this.sortColumn() === columnKey) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(columnKey);
      this.sortDirection.set('asc');
    }
  }

  // Selection
  toggleSelectAll(): void {
    const allSelected = this.selectAll();
    const ids = this.visibleProductIds();
    if (!allSelected) {
      this.selectedProductIds.set([...ids]);
    } else {
      this.selectedProductIds.set([]);
    }
    this.selectAll.set(!allSelected);
  }

  toggleSelectProduct(productId: string): void {
    this.selectedProductIds.update((ids) =>
      ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId],
    );
    this.updateSelectAll();
  }

  isSelected(productId: string): boolean {
    return this.selectedProductIds().includes(productId);
  }

  updateSelectAll(): void {
    const visibleIds = this.visibleProductIds();
    this.selectAll.set(
      visibleIds.length > 0 && visibleIds.every((id) => this.selectedProductIds().includes(id)),
    );
  }

  // Bulk actions
  bulkDelete(): void {
    if (this.selectedCount() === 0) return;

    if (confirm(`Bạn có chắc chắn muốn xóa ${this.selectedCount()} sản phẩm đã chọn?`)) {
      this.snackBar.open('Đang xóa...', 'Đóng', { duration: 2000 });
      this.snackBar.open('Chức năng xóa hàng loạt sẽ được triển khai', 'Đóng', { duration: 3000 });
      this.selectedProductIds.set([]);
      this.selectAll.set(false);
    }
  }

  bulkActivate(): void {
    if (this.selectedCount() === 0) return;
    this.snackBar.open('Chức năng kích hoạt hàng loạt sẽ được triển khai', 'Đóng', {
      duration: 3000,
    });
  }

  bulkDeactivate(): void {
    if (this.selectedCount() === 0) return;
    this.snackBar.open('Chức năng khóa hàng loạt sẽ được triển khai', 'Đóng', { duration: 3000 });
  }

  // Filter presets
  applyPreset(preset: FilterPreset): void {
    this.searchTerm.set(preset.searchTerm);
    this.categoryFilter.set(preset.categoryId);
    this.statusFilter.set(preset.status);
    this.applyFilter();
    this.showFilterPresets.set(false);
  }

  saveCurrentPreset(): void {
    const name = prompt('Nhập tên bộ lọc:');
    if (name) {
      const preset: FilterPreset = {
        name,
        searchTerm: this.searchTerm(),
        categoryId: this.categoryFilter(),
        status: this.statusFilter(),
      };
      this.filterPresets.update((presets) => [preset, ...presets].slice(0, 10));
    }
  }

  deletePreset(index: number): void {
    this.filterPresets.update((presets) => presets.filter((_, i) => i !== index));
  }

  toggleFilterPresets(): void {
    this.showFilterPresets.set(!this.showFilterPresets());
  }

  // Density
  setDensity(density: 'comfortable' | 'compact' | 'spacious'): void {
    this.density.set(density);
  }

  // Navigation
  createProduct(): void {
    this.router.navigate(['/admin/products/create']);
  }

  editProduct(product: ProductResponse): void {
    this.router.navigate(['/admin/products', product.id, 'edit']);
  }

  viewProduct(product: ProductResponse): void {
    this.router.navigate(['/admin/products', product.id]);
  }

  deleteProduct(product: ProductResponse): void {
    this.closeActionMenu();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"? Hành động này không thể hoàn tác.`,
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
            this.snackBar.open(error.error?.message || 'Xóa sản phẩm thất bại', 'Đóng', {
              duration: 5000,
            });
          },
        });
      }
    });
  }

  toggleProductStatus(product: ProductResponse): void {
    this.snackBar.open('Chức năng thay đổi trạng thái sẽ được triển khai', 'Đóng', {
      duration: 3000,
    });
  }

  // Action menu
  toggleActionMenu(product: ProductResponse): void {
    this.actionMenuOpen.update((current) => (current === product.id ? null : product.id));
  }

  closeActionMenu(): void {
    this.actionMenuOpen.set(null);
  }

  closeAllDropdowns(): void {
    this.showColumnPicker.set(false);
    this.showFilterPresets.set(false);
    this.closeActionMenu();
  }

  // Helpers
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(price);
  }

  getStockStatusClass(product: ProductResponse): string {
    if (product.quantity === 0) return 'text-red-600 dark:text-red-400 font-medium';
    if (product.quantity < 10) return 'text-amber-600 dark:text-amber-400 font-medium';
    return 'text-emerald-600 dark:text-emerald-400';
  }

  getStockStatusText(product: ProductResponse): string {
    if (product.quantity === 0) return 'Hết hàng';
    if (product.quantity < 10) return 'Sắp hết';
    return 'Còn hàng';
  }

  getStatusBadgeClass(product: ProductResponse): string {
    const active = product.active;
    return active
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }

  getStatusDotClass(product: ProductResponse): string {
    return product.active ? 'bg-emerald-500' : 'bg-red-500';
  }

  getStatusText(product: ProductResponse): string {
    return product.active ? 'Đang hoạt động' : 'Ngừng hoạt động';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Track by functions
  trackByProductId(index: number, product: ProductResponse): string {
    return product.id;
  }

  trackByCategoryId(index: number, category: CategoryResponse): string {
    return category.id;
  }

  trackByColumn(index: number, column: Column): string {
    return column.key;
  }
}
