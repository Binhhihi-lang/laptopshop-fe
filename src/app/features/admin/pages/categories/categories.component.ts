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
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CategoryService } from '@core/services/category.service';
import { AuthService } from '@core/services/auth.service';
import { CategoryResponse } from '@core/models/category.model';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import { TableComponent, Column, TableAction } from '@shared/components/table/table.component';
import { CardComponent } from '@shared/components/card/card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import {
  PageHeaderComponent,
  ColumnPickerComponent,
  BulkToolbarComponent,
  BulkToolbarButton,
} from '@shared/components';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    TableComponent,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    InputComponent,
    PageHeaderComponent,
    ColumnPickerComponent,
    BulkToolbarComponent,
  ],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class CategoriesComponent implements OnInit, AfterViewInit {
  private readonly categoryService = inject(CategoryService);
  protected readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);

  canDeleteCategory = computed(() => this.authService.hasPermission('DELETE_CATEGORY'));

  // Data signals
  categories = signal<CategoryResponse[]>([]);
  isLoading = signal(false);

  // Filter signals
  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  createdFrom = signal('');
  createdTo = signal('');

  // UI state signals
  selectedCategoryIds = signal<string[]>([]);
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  deletingCategoryId = signal<string | null>(null);

  // Column definitions for shared table
  columns = signal<Column<CategoryResponse>[]>([
    { key: 'image', label: 'Ảnh', visible: true, width: '60px', align: 'center' },
    { key: 'name', label: 'Tên danh mục', visible: true, sortable: true },
    { key: 'description', label: 'Mô tả', visible: true },
    {
      key: 'displayOrder',
      label: 'Thứ tự',
      visible: true,
      width: '90px',
      align: 'center',
      sortable: true,
    },
    {
      key: 'productCount',
      label: 'Số SP',
      visible: true,
      width: '90px',
      align: 'center',
      sortable: true,
    },
    { key: 'status', label: 'Trạng thái', visible: true, width: '140px', align: 'center' },
    { key: 'createdAt', label: 'Ngày tạo', visible: false, sortable: true, align: 'center' },
    { key: 'updatedAt', label: 'Ngày sửa', visible: false, sortable: true, align: 'center' },
  ]);

  // Filtered categories
  filteredCategories = signal<CategoryResponse[]>([]);

  // Table column templates
  @ViewChild('imageColumn', { static: true }) imageColumn!: TemplateRef<any>;
  @ViewChild('nameColumn', { static: true }) nameColumn!: TemplateRef<any>;
  @ViewChild('descriptionColumn', { static: true }) descriptionColumn!: TemplateRef<any>;
  @ViewChild('displayOrderColumn', { static: true }) displayOrderColumn!: TemplateRef<any>;
  @ViewChild('productCountColumn', { static: true }) productCountColumn!: TemplateRef<any>;
  @ViewChild('statusColumn', { static: true }) statusColumn!: TemplateRef<any>;
  @ViewChild('createdAtColumn', { static: true }) createdAtColumn!: TemplateRef<any>;
  @ViewChild('updatedAtColumn', { static: true }) updatedAtColumn!: TemplateRef<any>;

  // Table actions (kebab menu)
  actions: TableAction<CategoryResponse>[] = [
    {
      label: 'Xem chi tiết',
      icon: 'visibility',
      handler: (row) => this.viewCategory(row),
      variant: 'ghost',
    },
    {
      label: 'Chỉnh sửa',
      icon: 'edit',
      handler: (row) => this.editCategory(row),
      variant: 'ghost',
    },
    ...(this.authService.hasPermission('DELETE_CATEGORY')
      ? [
          {
            label: 'Xóa',
            icon: 'delete',
            handler: (row) => this.deleteCategory(row),
            variant: 'danger',
          } as TableAction<CategoryResponse>,
        ]
      : []),
    {
      label: 'Kích hoạt/Khóa',
      icon: 'block',
      handler: (row) => this.toggleCategoryStatus(row),
      variant: 'ghost',
    },
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.snackBar.open('Không thể tải dữ liệu danh mục', 'Đóng', { duration: 3000 });
        this.isLoading.set(false);
      },
    });
  }

  applyFilter() {
    let filtered = this.categories();

    // Search by name or description
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (category) =>
          (category.name || '').toLowerCase().includes(term) ||
          (category.description || '').toLowerCase().includes(term),
      );
    }

    // Filter by status
    if (this.statusFilter() !== 'all') {
      if (this.statusFilter() === 'active') {
        filtered = filtered.filter((category) => category.active);
      } else if (this.statusFilter() === 'inactive') {
        filtered = filtered.filter((category) => !category.active);
      }
    }

    // Filter by created date range
    const from = this.createdFrom();
    const to = this.createdTo();
    if (from) {
      filtered = filtered.filter((category) => (category.createdAt || '').slice(0, 10) >= from);
    }
    if (to) {
      filtered = filtered.filter((category) => (category.createdAt || '').slice(0, 10) <= to);
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

    this.filteredCategories.set(filtered);
  }

  onSearchChange() {
    this.applyFilter();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive') {
    if (this.statusFilter() !== status) {
      this.statusFilter.set(status);
      this.applyFilter();
    }
  }

  onDateChange() {
    this.applyFilter();
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.createdFrom.set('');
    this.createdTo.set('');
    this.applyFilter();
  }

  hasActiveFilters(): boolean {
    return (
      this.searchTerm().trim() !== '' ||
      this.statusFilter() !== 'all' ||
      this.createdFrom() !== '' ||
      this.createdTo() !== ''
    );
  }

  ngAfterViewInit(): void {
    this.columns.update((cols) =>
      cols.map((col) => {
        const templateMap: Record<string, TemplateRef<any>> = {
          image: this.imageColumn,
          name: this.nameColumn,
          description: this.descriptionColumn,
          displayOrder: this.displayOrderColumn,
          productCount: this.productCountColumn,
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

  viewCategory(category: CategoryResponse) {
    this.router.navigate(['/admin/categories', category.id]);
  }

  editCategory(category: CategoryResponse) {
    this.router.navigate(['/admin/categories', category.id, 'edit']);
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
  selectedCategories = computed(() =>
    this.categories().filter((c) => this.selectedCategoryIds().includes(c.id)),
  );
  selectedCount = computed(() => this.selectedCategoryIds().length);

  onSelectionChange(rows: CategoryResponse[]): void {
    this.selectedCategoryIds.set(rows.map((r) => r.id));
  }

  // Bulk toolbar buttons
  bulkCategoryButtons = computed<BulkToolbarButton[]>(() => {
    const buttons: BulkToolbarButton[] = [
      {
        label: 'Kích hoạt',
        icon: 'check_circle',
        variant: 'success',
        handler: () => this.bulkActivate(),
      },
      { label: 'Khóa', icon: 'block', variant: 'secondary', handler: () => this.bulkDeactivate() },
    ];
    if (this.canDeleteCategory()) {
      buttons.push({
        label: 'Xóa',
        icon: 'delete',
        variant: 'danger',
        handler: () => this.bulkDelete(),
        disabled: this.deletingCategoryId() !== null,
      });
    }
    return buttons;
  });

  bulkDelete(): void {
    if (this.selectedCount() === 0) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa hàng loạt',
        message: `Bạn có chắc chắn muốn xóa ${this.selectedCount()} danh mục đã chọn? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) return;

      const idsToDelete = [...this.selectedCategoryIds()];
      this.deletingCategoryId.set(idsToDelete[0] ?? null);
      this.categoryService.bulkDeleteCategories(idsToDelete).subscribe({
        next: () => {
          this.snackBar.open('Xóa danh mục thành công', 'Đóng', { duration: 3000 });
          this.loadData();
          this.selectedCategoryIds.set([]);
          this.deletingCategoryId.set(null);
        },
        error: (error) => {
          console.error('Error bulk deleting categories:', error);
          this.snackBar.open('Xóa danh mục thất bại', 'Đóng', { duration: 3000 });
          this.deletingCategoryId.set(null);
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
    const ids = [...this.selectedCategoryIds()];
    const verb = active ? 'kích hoạt' : 'khóa';
    this.snackBar.open(`Đang ${verb} ${ids.length} danh mục...`, 'Đóng', { duration: 2000 });
    this.categoryService.bulkUpdateCategoryStatus(ids, active).subscribe({
      next: () => {
        this.snackBar.open(`${active ? 'Kích hoạt' : 'Khóa'} danh mục thành công`, 'Đóng', {
          duration: 3000,
        });
        this.loadData();
        this.selectedCategoryIds.set([]);
      },
      error: (error) => {
        console.error(`Error bulk ${verb} categories:`, error);
        this.snackBar.open(
          error.error?.message || `${active ? 'Kích hoạt' : 'Khóa'} danh mục thất bại`,
          'Đóng',
          { duration: 3000 },
        );
      },
    });
  }

  deleteCategory(category: CategoryResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Xác nhận xóa',
        message: `Bạn có chắc chắn muốn xóa danh mục "${category.name}"? Hành động này không thể hoàn tác.`,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.deletingCategoryId.set(category.id);
        this.categoryService.deleteCategory(category.id).subscribe({
          next: () => {
            this.snackBar.open('Xóa danh mục thành công', 'Đóng', { duration: 3000 });
            this.loadData();
            this.deletingCategoryId.set(null);
          },
          error: (error) => {
            console.error('Error deleting category:', error);
            this.snackBar.open(error.error?.message || 'Xóa danh mục thất bại', 'Đóng', {
              duration: 5000,
            });
            this.deletingCategoryId.set(null);
          },
        });
      }
    });
  }

  toggleCategoryStatus(category: CategoryResponse): void {
    const newActive = !category.active;
    this.snackBar.open(
      `Đang ${newActive ? 'kích hoạt' : 'khóa'} danh mục ${category.name}...`,
      'Đóng',
      { duration: 2000 },
    );

    this.categoryService.bulkUpdateCategoryStatus([category.id], newActive).subscribe({
      next: () => {
        this.snackBar.open(`${newActive ? 'Kích hoạt' : 'Khóa'} danh mục thành công`, 'Đóng', {
          duration: 3000,
        });
        this.loadData();
      },
      error: (error) => {
        console.error('Error toggling category status:', error);
        this.snackBar.open(
          error.error?.message || `${newActive ? 'Kích hoạt' : 'Khóa'} danh mục thất bại`,
          'Đóng',
          { duration: 3000 },
        );
      },
    });
  }

  // Template helpers
  getStatusLabel(category: CategoryResponse): string {
    return category.active ? 'Đang hoạt động' : 'Ngừng hoạt động';
  }

  getStatusColor(category: CategoryResponse): 'success' | 'danger' {
    return category.active ? 'success' : 'danger';
  }

  getStatusIcon(category: CategoryResponse): string {
    return category.active ? 'check_circle' : 'cancel';
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

  trackByCategoryId(category: CategoryResponse): string {
    return category.id;
  }
}
