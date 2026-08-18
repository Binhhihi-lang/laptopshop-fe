import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryService } from '@core/services/category.service';
import {
  CategoryResponse,
  CategoryCreationRequest,
  CategoryUpdateRequest,
} from '@core/models/category.model';
import { MatSnackBar } from '@angular/material/snack-bar';

// Shared components (tham khảo product-form)
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormFieldComponent,
    InputComponent,
    ButtonComponent,
    CardComponent,
    LoadingComponent,
    PageHeaderComponent,
    ImageUploadComponent,
  ],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.css',
})
export class CategoryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoryService = inject(CategoryService);
  private readonly snackBar = inject(MatSnackBar);

  // State signals
  isLoading = signal(false);
  isSubmitting = signal(false);
  imageFile = signal<File | null>(null);
  existingImage = signal<string | null>(null);
  imageRemoved = signal(false); // true = user muốn xóa ảnh hiện tại (gửi removeImage=true)

  // Route param
  categoryId = signal<string>('');

  // Form
  categoryForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    displayOrder: [null, [Validators.min(0)]],
    active: [true],
  });

  // Computed
  isEditMode = computed(() => !!this.categoryId());
  pageTitle = computed(() => (this.isEditMode() ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'));
  pageSubtitle = computed(() =>
    this.isEditMode() ? 'Cập nhật thông tin danh mục' : 'Điền thông tin để tạo danh mục mới',
  );
  submitButtonText = computed(() => (this.isEditMode() ? 'Cập nhật' : 'Tạo danh mục'));
  submitButtonIcon = computed(() => (this.isEditMode() ? 'save' : 'add'));

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.categoryId.set(idParam);
      this.loadCategory();
    }
  }

  loadCategory(): void {
    if (!this.categoryId()) return;

    this.isLoading.set(true);
    this.categoryService.getCategoryById(this.categoryId()).subscribe({
      next: (category: CategoryResponse) => {
        this.patchForm(category);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading category:', error);
        this.snackBar.open('Không thể tải thông tin danh mục', 'Đóng', { duration: 3000 });
        this.router.navigate(['/admin/categories']);
        this.isLoading.set(false);
      },
    });
  }

  patchForm(category: CategoryResponse): void {
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description || '',
      displayOrder: category.displayOrder,
      active: category.active,
    });

    // Ảnh hiện tại do app-image-upload quản lý qua [existingImage]
    this.existingImage.set(category.image ?? null);
    this.imageRemoved.set(false);
  }

  // Nhận file từ app-image-upload (file mới hoặc null khi hủy file mới)
  onImageFileChange(file: File | null): void {
    this.imageFile.set(file);
    if (file) {
      this.imageRemoved.set(false); // có file mới => không xóa ảnh nữa
    }
  }

  onSubmit(): void {
    console.log('name value:', this.categoryForm.get('name')?.value);
    if (this.categoryForm.invalid) {
      this.markFormGroupTouched(this.categoryForm);
      this.snackBar.open('Vui lòng điền đầy đủ thông tin bắt buộc', 'Đóng', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.categoryForm.value;

    // File ảnh nằm TRONG data (inputFile), khớp backend @ModelAttribute
    // (giống user-form). Không truyền tham số file riêng.
    const baseData = {
      name: formValue.name,
      description: formValue.description || '',
      displayOrder: formValue.displayOrder ?? undefined,
      active: formValue.active,
      inputFile: this.imageFile() ?? undefined,
    };

    if (this.isEditMode() && this.categoryId()) {
      const updateData: CategoryUpdateRequest = {
        ...baseData,
        removeImage: this.imageRemoved(),
      };
      console.log(updateData);
      this.categoryService.updateCategory(this.categoryId(), updateData).subscribe({
        next: () => {
          this.snackBar.open('Cập nhật danh mục thành công', 'Đóng', { duration: 3000 });
          this.isSubmitting.set(false);
          this.router.navigate(['/admin/categories']);
        },
        error: (error) => {
          console.error('Error updating category:', error);
          this.snackBar.open(error.error?.message || 'Cập nhật danh mục thất bại', 'Đóng', {
            duration: 5000,
          });
          this.isSubmitting.set(false);
        },
      });
    } else {
      const createData: CategoryCreationRequest = { ...baseData };
      this.categoryService.createCategory(createData).subscribe({
        next: () => {
          this.snackBar.open('Tạo danh mục thành công', 'Đóng', { duration: 3000 });
          this.isSubmitting.set(false);
          this.router.navigate(['/admin/categories']);
        },
        error: (error) => {
          console.error('Error creating category:', error);
          this.snackBar.open(error.error?.message || 'Tạo danh mục thất bại', 'Đóng', {
            duration: 5000,
          });
          this.isSubmitting.set(false);
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/categories']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Helper getters for template
  get f() {
    return this.categoryForm.controls;
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.categoryForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
  }
}
