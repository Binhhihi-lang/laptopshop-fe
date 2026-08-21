import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PermissionService } from '@core/services/permission.service';
import {
  PermissionResponse,
  PermissionCreationRequest,
  PermissionUpdateRequest,
} from '@core/models/permission.model';
import { Subject, takeUntil, filter } from 'rxjs';

// Shared components
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-permission-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    FormFieldComponent,
    InputComponent,
    ButtonComponent,
    CardComponent,
    LoadingComponent,
    PageHeaderComponent,
  ],
  templateUrl: './permission-form.component.html',
  styleUrl: './permission-form.component.css',
})
export class PermissionFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly permissionService = inject(PermissionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  // State signals
  isLoading = signal(false);
  isSubmitting = signal(false);
  currentPermission = signal<PermissionResponse | null>(null);

  // Route param
  permissionId = signal<string>('');

  // Form
  permissionForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.pattern('^[A-Z_]+$'), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.maxLength(255)]],
  });

  // Computed
  isEditMode = computed(() => !!this.permissionId());
  pageTitle = computed(() => (this.isEditMode() ? 'Chỉnh sửa quyền hạn' : 'Tạo quyền hạn mới'));
  pageSubtitle = computed(() =>
    this.isEditMode() ? 'Cập nhật thông tin quyền hạn' : 'Điền thông tin để tạo quyền hạn mới',
  );
  submitButtonText = computed(() => (this.isEditMode() ? 'Cập nhật' : 'Tạo quyền hạn'));

  ngOnInit(): void {
    this.route.params
      .pipe(
        filter((params) => !!params['id']),
        takeUntil(this.destroy$),
      )
      .subscribe((params) => {
        const id = params['id'];
        if (id && id !== this.permissionId()) {
          this.permissionId.set(id);
          this.loadData();
        }
      });

    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.permissionId.set(initialId);
    }

    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    if (this.isEditMode() && this.permissionId()) {
      this.isLoading.set(true);
      this.permissionService.getPermissionById(this.permissionId()!).subscribe({
        next: (permission) => {
          this.currentPermission.set(permission);
          this.patchForm(permission);
          this.isLoading.set(false);
        },
        error: () => {
          this.snackBar.open('Không thể tải thông tin quyền hạn', 'Đóng', { duration: 3000 });
          this.router.navigate(['/admin/permissions']);
          this.isLoading.set(false);
        },
      });
    }
  }

  patchForm(permission: PermissionResponse): void {
    this.permissionForm.patchValue({
      name: permission.name,
      description: permission.description || '',
    });
  }

  onSubmit(): void {
    if (this.permissionForm.invalid) {
      this.markFormGroupTouched(this.permissionForm);
      this.snackBar.open('Vui lòng điền đầy đủ thông tin bắt buộc', 'Đóng', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.permissionForm.value;

    if (this.isEditMode() && this.permissionId()) {
      const permissionData: PermissionUpdateRequest = {
        name: formValue.name,
        description: formValue.description,
      };
      this.permissionService.updatePermission(this.permissionId(), permissionData).subscribe({
        next: () => {
          this.snackBar.open('Cập nhật quyền hạn thành công', 'Đóng', { duration: 3000 });
          this.router.navigate(['/admin/permissions']);
        },
        error: (error) => {
          this.snackBar.open(error.error?.message || 'Cập nhật quyền hạn thất bại', 'Đóng', {
            duration: 5000,
          });
          this.isSubmitting.set(false);
        },
      });
    } else {
      const permissionData: PermissionCreationRequest = {
        name: formValue.name,
        description: formValue.description,
      };
      this.permissionService.createPermission(permissionData).subscribe({
        next: () => {
          this.snackBar.open('Tạo quyền hạn thành công', 'Đóng', { duration: 3000 });
          this.router.navigate(['/admin/permissions']);
        },
        error: (error) => {
          this.snackBar.open(error.error?.message || 'Tạo quyền hạn thất bại', 'Đóng', {
            duration: 5000,
          });
          this.isSubmitting.set(false);
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/permissions']);
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
  get name() {
    return this.permissionForm.get('name');
  }
  get description() {
    return this.permissionForm.get('description');
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.permissionForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
  }
}
