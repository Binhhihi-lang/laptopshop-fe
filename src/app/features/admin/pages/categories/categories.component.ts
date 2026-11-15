import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '@core/services/notification.service';
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
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
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
    EmptyStateComponent,
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
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  canDeleteCategory = computed(() => this.authService.hasPermission('DELETE_CATEGORY'));

  // Data signals
  categories = signal<CategoryResponse[]>([]);
  isLoading = signal(false);
  permissionDenied = signal<boolean>(false);

  // Phân trang phía server
  readonly pageSize = 20;
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);

  /** Gõ tìm kiếm phải debounce, nếu không mỗi ký tự là một request. */
  private readonly searchInput$ = new Subject<string>();

  // Filter signals
  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // UI state signals
  selectedCategoryIds = signal<string[]>([]);
  // Server mặc định sắp theo displayOrder — phản ánh đúng trên header bảng.
  sortColumn = signal<string>('displayOrder');
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
    },
    { key: 'status', label: 'Trạng thái', visible: true, width: '140px', align: 'center' },
    { key: 'createdAt', label: 'Ngày tạo', visible: false, sortable: true, align: 'center' },
    { key: 'updatedAt', label: 'Ngày sửa', visible: false, sortable: true, align: 'center' },
  ]);

  // Danh mục của TRANG hiện tại do server trả về
  // (trước đây tải toàn bộ danh sách rồi lọc ở client).

  // Table column templates
  @ViewChild('imageColumn') imageColumn!: TemplateRef<any>;
  @ViewChild('nameColumn') nameColumn!: TemplateRef<any>;
  @ViewChild('descriptionColumn') descriptionColumn!: TemplateRef<any>;
  @ViewChild('displayOrderColumn') displayOrderColumn!: TemplateRef<any>;
  @ViewChild('productCountColumn') productCountColumn!: TemplateRef<any>;
  @ViewChild('statusColumn') statusColumn!: TemplateRef<any>;
  @ViewChild('createdAtColumn') createdAtColumn!: TemplateRef<any>;
  @ViewChild('updatedAtColumn') updatedAtColumn!: TemplateRef<any>;

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
    this.searchInput$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reloadFromFirstPage());
    this.loadCategories();
  }

  loadCategories() {
    this.isLoading.set(true);
    this.permissionDenied.set(false);
    this.categoryService
      .getCategoryPage({
        keyword: this.searchTerm(),
        active: this.activeParam(),
        page: this.currentPage(),
        size: this.pageSize,
        sort: this.sortParam(),
      })
      .subscribe({
        next: (page) => {
          this.categories.set(page.content);
          this.totalElements.set(page.totalElements);
          this.totalPages.set(page.totalPages);
          // Server tự kẹp trang khi bộ lọc làm giảm tổng số trang
          if (page.number !== this.currentPage()) {
            this.currentPage.set(page.number);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          if (error instanceof HttpErrorResponse && error.status === 403) {
            this.permissionDenied.set(true);
          }
          this.isLoading.set(false);
        },
      });
  }

  /** Mọi thay đổi bộ lọc đều quay về trang đầu rồi tải lại. */
  private reloadFromFirstPage(): void {
    this.currentPage.set(0);
    this.selectedCategoryIds.set([]);
    this.loadCategories();
  }

  private activeParam(): boolean | undefined {
    const status = this.statusFilter();
    if (status === 'active') return true;
    if (status === 'inactive') return false;
    return undefined;
  }

  /** Mặc định sắp theo thứ tự hiển thị — khớp cách danh mục được trình bày. */
  private sortParam(): string {
    const column = this.sortColumn();
    return column ? `${column},${this.sortDirection()}` : 'displayOrder,asc';
  }

  onPrevPage(): void {
    if (this.currentPage() === 0) return;
    this.currentPage.update((p) => p - 1);
    this.selectedCategoryIds.set([]);
    this.loadCategories();
  }

  onNextPage(): void {
    if (this.currentPage() >= this.totalPages() - 1) return;
    this.currentPage.update((p) => p + 1);
    this.selectedCategoryIds.set([]);
    this.loadCategories();
  }

  /** app-table phát số trang 1-based; state nội bộ 0-based. */
  onPageChange(page: number): void {
    if (page - 1 === this.currentPage()) return;
    this.currentPage.set(page - 1);
    this.selectedCategoryIds.set([]);
    this.loadCategories();
  }

  onSearchChange() {
    this.searchInput$.next(this.searchTerm());
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive') {
    if (this.statusFilter() !== status) {
      this.statusFilter.set(status);
      this.reloadFromFirstPage();
    }
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.reloadFromFirstPage();
  }

  hasActiveFilters(): boolean {
    return this.searchTerm().trim() !== '' || this.statusFilter() !== 'all';
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
    this.reloadFromFirstPage();
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
          this.notification.success('Xóa danh mục thành công');
          this.loadCategories();
          this.selectedCategoryIds.set([]);
          this.deletingCategoryId.set(null);
        },
        error: (error) => {
          console.error('Error bulk deleting categories:', error);
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
    this.notification.info(`Đang ${verb} ${ids.length} danh mục...`, 2000);
    this.categoryService.bulkUpdateCategoryStatus(ids, active).subscribe({
      next: () => {
        this.notification.success(`${active ? 'Kích hoạt' : 'Khóa'} danh mục thành công`);
        this.loadCategories();
        this.selectedCategoryIds.set([]);
      },
      error: (error) => {
        console.error(`Error bulk ${verb} categories:`, error);
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
            this.notification.success('Xóa danh mục thành công');
            this.loadCategories();
            this.deletingCategoryId.set(null);
          },
          error: (error) => {
            console.error('Error deleting category:', error);
            this.deletingCategoryId.set(null);
          },
        });
      }
    });
  }

  toggleCategoryStatus(category: CategoryResponse): void {
    const newActive = !category.active;
    this.notification.info(
      `Đang ${newActive ? 'kích hoạt' : 'khóa'} danh mục ${category.name}...`,
      2000,
    );

    this.categoryService.bulkUpdateCategoryStatus([category.id], newActive).subscribe({
      next: () => {
        this.notification.success(`${newActive ? 'Kích hoạt' : 'Khóa'} danh mục thành công`);
        this.loadCategories();
      },
      error: (error) => {
        console.error('Error toggling category status:', error);
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
