import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProductService } from '@core/services/product.service';
import { CategoryService } from '@core/services/category.service';
import {
  ProductResponse,
  ProductCreationRequest,
  ProductUpdateRequest,
} from '@core/models/product.model';
import { CategoryResponse } from '@core/models/category.model';
import { MatSnackBar } from '@angular/material/snack-bar';

// Shared components
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { InputComponent } from '@shared/components/input/input.component';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { LoadingComponent } from '@shared/components/loading/loading.component';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormFieldComponent,
    InputComponent,
    SelectComponent,
    ButtonComponent,
    CardComponent,
    LoadingComponent,
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css',
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly snackBar = inject(MatSnackBar);

  productForm: FormGroup;
  isLoading = signal(false);
  isSaving = signal(false);
  isEditMode = signal(false);
  productId: string | null = null;
  imagePreview = signal<string | null>(null);
  existingImage: string | null = null;
  imageFile: File | null = null;

  categories = signal<CategoryResponse[]>([]);

  // Category options for select
  categoryOptions = computed<SelectOption[]>(() =>
    this.categories().map((c) => ({ value: c.id, label: c.name })),
  );

  constructor() {
    this.productForm = this.fb.group({
      // Basic Information (required: code, name, price, categoryId)
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      price: [null, [Validators.required, Validators.min(0)]],
      categoryId: ['', [Validators.required]],
      shortDesc: [''],
      detailDesc: [''],
      image: [null],

      // Inventory
      quantity: [0, [Validators.min(0)]],
      sold: [0, [Validators.min(0)]],
      warrantyMonths: [12, [Validators.min(0)]],
      factory: [''],
      target: [''],

      // Specifications
      cpu: [''],
      ram: [''],
      storage: [''],
      gpu: [''],
      screen: [''],
      os: [''],
      weight: [0, [Validators.min(0)]],

      // Status
      active: [true],
    });
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode.set(true);
      this.productId = idParam;
    }
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    if (this.isEditMode() && this.productId) {
      // Edit mode: load categories first, then product sequentially
      // This avoids forkJoin timing issues where product.fields might not be ready
      const productId = this.productId; // Capture local copy for async handler
      this.categoryService.getCategories().subscribe({
        next: (categories) => {
          this.categories.set(categories);
          // 2. Then load product after categories are loaded
          this.productService.getProductById(productId).subscribe({
            next: (product) => {
              console.log('Edit mode product data:', product); // DEBUG: verify property names
              console.log('Product keys:', Object.keys(product)); // DEBUG: check structure
              this.patchForm(product);
              this.isLoading.set(false);
            },
            error: (error) => {
              console.error('Error loading product:', error);
              this.snackBar.open('Không thể tải thông tin sản phẩm', 'Đóng', { duration: 3000 });
              this.isLoading.set(false);
              this.router.navigate(['/admin/products']);
            },
          });
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.snackBar.open('Không thể tải danh sách danh mục', 'Đóng', { duration: 3000 });
          this.isLoading.set(false);
        },
      });
    } else {
      // Create mode: chỉ load categories
      this.categoryService.getCategories().subscribe({
        next: (categories) => {
          this.categories.set(categories);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.snackBar.open('Không thể tải danh sách danh mục', 'Đóng', { duration: 3000 });
          this.isLoading.set(false);
        },
      });
    }
  }

  patchForm(product: ProductResponse): void {
    this.productForm.patchValue({
      code: product.code ?? '',
      name: product.name ?? '',
      price: product.price ?? 0,
      categoryId: product.categoryId ?? '',
      shortDesc: product.shortDesc ?? '',
      detailDesc: product.detailDesc ?? '',
      quantity: product.quantity ?? 0,
      sold: product.sold ?? 0,
      warrantyMonths: product.warrantyMonths ?? 12,
      factory: product.factory ?? '',
      target: product.target ?? '',
      cpu: product.cpu ?? '',
      ram: product.ram ?? '',
      storage: product.storage ?? '',
      gpu: product.gpu ?? '',
      screen: product.screen ?? '',
      os: product.os ?? '',
      weight: product.weight ?? 0,
      active: product.active ?? true,
    });
    this.existingImage = product.image ?? null;
    this.imagePreview.set(product.image ?? null);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Chỉ chấp nhận file hình ảnh', 'Đóng', { duration: 3000 });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('Kích thước file không được vượt quá 5MB', 'Đóng', { duration: 3000 });
        return;
      }

      this.imageFile = file;
      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(this.imageFile);
    }
  }

  removeImage() {
    this.imageFile = null;
    this.imagePreview.set(this.existingImage); // Show existing image if any
  }

  onSubmit() {
    if (this.productForm.invalid) {
      this.markFormGroupTouched(this.productForm);
      this.snackBar.open('Vui lòng điền đầy đủ thông tin bắt buộc', 'Đóng', { duration: 3000 });
      return;
    }

    this.isSaving.set(true);
    const formValue = this.productForm.value;

    // Build data object matching backend DTO
    const productData = {
      code: formValue.code,
      name: formValue.name,
      price: formValue.price,
      categoryId: formValue.categoryId,
      shortDesc: formValue.shortDesc || '',
      detailDesc: formValue.detailDesc || '',
      quantity: formValue.quantity,
      sold: formValue.sold,
      warrantyMonths: formValue.warrantyMonths,
      factory: formValue.factory || '',
      target: formValue.target || '',
      cpu: formValue.cpu || '',
      ram: formValue.ram || '',
      storage: formValue.storage || '',
      gpu: formValue.gpu || '',
      screen: formValue.screen || '',
      os: formValue.os || '',
      weight: formValue.weight,
      active: formValue.active,
    };

    if (this.isEditMode() && this.productId) {
      this.productService
        .updateProduct(this.productId, productData, this.imageFile || undefined)
        .subscribe({
          next: () => {
            this.snackBar.open('Cập nhật sản phẩm thành công', 'Đóng', { duration: 3000 });
            this.isSaving.set(false);
            this.router.navigate(['/admin/products']);
          },
          error: (error) => {
            console.error('Error updating product:', error);
            this.snackBar.open('Cập nhật sản phẩm thất bại', 'Đóng', { duration: 3000 });
            this.isSaving.set(false);
          },
        });
    } else {
      this.productService.createProduct(productData, this.imageFile || undefined).subscribe({
        next: () => {
          this.snackBar.open('Tạo sản phẩm thành công', 'Đóng', { duration: 3000 });
          this.isSaving.set(false);
          this.router.navigate(['/admin/products']);
        },
        error: (error) => {
          console.error('Error creating product:', error);
          this.snackBar.open('Tạo sản phẩm thất bại', 'Đóng', { duration: 3000 });
          this.isSaving.set(false);
        },
      });
    }
  }

  onCancel() {
    this.router.navigate(['/admin/products']);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get f() {
    return this.productForm.controls;
  }
}
