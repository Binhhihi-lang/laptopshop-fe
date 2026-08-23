import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { RoleService } from '@core/services/role.service';
import { PermissionService } from '@core/services/permission.service';
import { RoleResponse, RoleCreationRequest, RoleUpdateRequest } from '@core/models/role.model';
import { PermissionResponse } from '@core/models/permission.model';
import { Subject, takeUntil, filter, forkJoin } from 'rxjs';

// Shared components
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-role-form',
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
  templateUrl: './role-form.component.html',
  styleUrl: './role-form.component.css',
})
export class RoleFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly roleService = inject(RoleService);
  private readonly permissionService = inject(PermissionService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  // State signals
  isLoading = signal(false);
  isSubmitting = signal(false);
  permissions = signal<PermissionResponse[]>([]);
  currentRole = signal<RoleResponse | null>(null);

  // Route param
  roleId = signal<string>('');

  // Form
  roleForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(255)]],
    permissionNames: [[] as string[], [Validators.required]],
    active: [true],
  });

  // Computed
  isEditMode = computed(() => !!this.roleId());
  pageTitle = computed(() => (this.isEditMode() ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'));
  pageSubtitle = computed(() =>
    this.isEditMode() ? 'Cập nhật thông tin vai trò' : 'Điền thông tin để tạo vai trò mới',
  );
  submitButtonText = computed(() => (this.isEditMode() ? 'Cập nhật' : 'Tạo vai trò'));

  ngOnInit(): void {
    // Get roleId from route params (handles both initial load and param changes)
    this.route.params
      .pipe(
        filter((params) => !!params['id']),
        takeUntil(this.destroy$),
      )
      .subscribe((params) => {
        const id = params['id'];
        if (id && id !== this.roleId()) {
          this.roleId.set(id);
          this.loadData();
        }
      });

    // Also check initial snapshot (for direct navigation)
    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.roleId.set(initialId);
    }

    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    if (this.isEditMode() && this.roleId()) {
      // Edit mode: load permissions and role in parallel using forkJoin
      this.isLoading.set(true);
      forkJoin({
        permissions: this.permissionService.getPermissions(),
        role: this.roleService.getRoleById(this.roleId()!),
      }).subscribe({
        next: ({ permissions, role }) => {
          this.permissions.set(permissions);
          this.currentRole.set(role);
          this.patchForm(role);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.router.navigate(['/admin/roles']);
          this.isLoading.set(false);
        },
      });
    } else {
      // Create mode: only load permissions
      this.isLoading.set(true);
      this.permissionService.getPermissions().subscribe({
        next: (permissions) => {
          this.permissions.set(permissions);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading permissions:', error);
          this.isLoading.set(false);
        },
      });
    }
  }

  patchForm(role: RoleResponse): void {
    this.roleForm.patchValue({
      name: role.name,
      description: role.description || '',
      permissionNames: role.permissionNames || [],
      active: role.active ?? true,
    });
  }

  onSubmit(): void {
    if (this.roleForm.invalid) {
      this.markFormGroupTouched(this.roleForm);
      this.notification.warn('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.roleForm.value;

    if (this.isEditMode() && this.roleId()) {
      const roleData: RoleUpdateRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
        permissionNames: formValue.permissionNames,
        active: formValue.active ?? true,
      };
      this.roleService.updateRole(this.roleId(), roleData).subscribe({
        next: () => {
          this.notification.success('Cập nhật vai trò thành công');
          this.router.navigate(['/admin/roles']);
        },
        error: (error) => {
          console.error('Error updating role:', error);
          this.isSubmitting.set(false);
        },
      });
    } else {
      const roleData: RoleCreationRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
        permissionNames: formValue.permissionNames,
        active: formValue.active ?? true,
      };
      this.roleService.createRole(roleData).subscribe({
        next: () => {
          this.notification.success('Tạo vai trò thành công');
          this.router.navigate(['/admin/roles']);
        },
        error: (error) => {
          console.error('Error creating role:', error);
          this.isSubmitting.set(false);
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/roles']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onPermissionChange(permissionName: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentPermissions = this.roleForm.get('permissionNames')?.value || [];

    if (checkbox.checked) {
      // Add permission if not already present
      if (!currentPermissions.includes(permissionName)) {
        this.roleForm.patchValue({
          permissionNames: [...currentPermissions, permissionName],
        });
      }
    } else {
      // Remove permission
      this.roleForm.patchValue({
        permissionNames: currentPermissions.filter((name: string) => name !== permissionName),
      });
    }
  }

  isPermissionSelected(permissionName: string): boolean {
    const currentPermissions = this.roleForm.get('permissionNames')?.value || [];
    return currentPermissions.includes(permissionName);
  }

  // Helper getters for template
  get name() {
    return this.roleForm.get('name');
  }
  get description() {
    return this.roleForm.get('description');
  }
  get permissionNames() {
    return this.roleForm.get('permissionNames');
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.roleForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
  }
}
