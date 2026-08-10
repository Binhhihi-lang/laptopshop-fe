import { Component, OnInit, signal, computed, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MaterialModule } from '@shared/material.module';
import { RoleService } from '@core/services/role.service';
import { UserService } from '@core/services/user.service';
import { RoleResponse } from '@core/models/role.model';
import { UserResponse, UserCreationRequest, UserUpdateRequest } from '@core/models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, filter, forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
})
export class UserFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  // State signals
  isLoading = signal(false);
  isSubmitting = signal(false);
  roles = signal<RoleResponse[]>([]);
  currentUser = signal<UserResponse | null>(null);
  selectedAvatar = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  showPassword = signal(false);

  // Route param
  userId = signal<string>('');

  // Form
  userForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
    address: [''],
    roleNames: [[], [Validators.required]],
    active: [true],
  });

  // Computed
  isEditMode = computed(() => !!this.userId());
  pageTitle = computed(() => (this.isEditMode() ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'));
  pageSubtitle = computed(() =>
    this.isEditMode()
      ? 'Cập nhật thông tin tài khoản người dùng'
      : 'Điền thông tin để tạo tài khoản người dùng mới',
  );
  submitButtonText = computed(() => (this.isEditMode() ? 'Cập nhật' : 'Tạo người dùng'));

  ngOnInit(): void {
    // Get userId from route params (handles both initial load and param changes)
    this.route.params
      .pipe(
        filter((params) => !!params['id']),
        takeUntil(this.destroy$),
      )
      .subscribe((params) => {
        const id = params['id'];
        if (id && id !== this.userId()) {
          this.userId.set(id);
          this.loadData();
        }
      });

    // Also check initial snapshot (for direct navigation)
    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.userId.set(initialId);
    }

    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Effect to handle password validators based on edit/create mode
  private readonly passwordEffect = effect(() => {
    const passwordControl = this.userForm.get('password');
    if (this.isEditMode()) {
      // Edit mode: password is optional
      passwordControl?.clearValidators();
    } else {
      // Create mode: password is required with minLength 6
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
    }
    passwordControl?.updateValueAndValidity({ emitEvent: false });
  });

  loadData(): void {
    if (this.isEditMode() && this.userId()) {
      // Edit mode: load roles and user in parallel using forkJoin
      this.isLoading.set(true);
      forkJoin({
        roles: this.roleService.getRoles(),
        user: this.userService.getUserById(this.userId()!),
      }).subscribe({
        next: ({ roles, user }) => {
          this.roles.set(roles);
          this.currentUser.set(user);
          this.patchForm(user);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.snackBar.open('Không thể tải dữ liệu', 'Đóng', { duration: 3000 });
          this.router.navigate(['/admin/users']);
          this.isLoading.set(false);
        },
      });
    } else {
      // Create mode: only load roles
      this.isLoading.set(true);
      this.roleService.getRoles().subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading roles:', error);
          this.snackBar.open('Không thể tải danh sách vai trò', 'Đóng', { duration: 3000 });
          this.isLoading.set(false);
        },
      });
    }
  }

  patchForm(user: UserResponse): void {
    this.userForm.patchValue({
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || '',
      address: user.address || '',
      roleNames: user.roleNames || [],
      active: user.active ?? true,
    });

    // Set avatar preview if exists
    if (user.avatar) {
      this.avatarPreview.set(user.avatar);
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Vui lòng chọn file hình ảnh', 'Đóng', { duration: 3000 });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        this.snackBar.open('Kích thước ảnh không được vượt quá 2MB', 'Đóng', { duration: 3000 });
        return;
      }
      this.selectedAvatar.set(file);
      const reader = new FileReader();
      reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  removeAvatar(): void {
    this.selectedAvatar.set(null);
    this.avatarPreview.set(null);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      this.snackBar.open('Vui lòng điền đầy đủ thông tin bắt buộc', 'Đóng', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.userForm.value;

    if (this.isEditMode() && this.userId()) {
      const userData: UserUpdateRequest = {
        email: formValue.email,
        fullName: formValue.fullName,
        phone: formValue.phone || undefined,
        address: formValue.address || undefined,
        roleNames: formValue.roleNames,
        active: formValue.active,
        ...(formValue.password ? { password: formValue.password } : {}),
        ...(this.selectedAvatar() ? { avatar: this.selectedAvatar()! } : {}),
      };
      this.userService.updateUser(this.userId(), userData).subscribe({
        next: () => {
          this.snackBar.open('Cập nhật người dùng thành công', 'Đóng', { duration: 3000 });
          this.router.navigate(['/admin/users']);
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.snackBar.open(error.error?.message || 'Cập nhật người dùng thất bại', 'Đóng', {
            duration: 5000,
          });
          this.isSubmitting.set(false);
        },
      });
    } else {
      const userData: UserCreationRequest = {
        email: formValue.email,
        password: formValue.password,
        fullName: formValue.fullName,
        phone: formValue.phone || undefined,
        address: formValue.address || undefined,
        roleNames: formValue.roleNames,

        ...(this.selectedAvatar() ? { avatar: this.selectedAvatar()! } : {}),
      };
      this.userService.createUser(userData).subscribe({
        next: () => {
          this.snackBar.open('Tạo người dùng thành công', 'Đóng', { duration: 3000 });
          this.router.navigate(['/admin/users']);
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.snackBar.open(error.error?.message || 'Tạo người dùng thất bại', 'Đóng', {
            duration: 5000,
          });
          this.isSubmitting.set(false);
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/users']);
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
  get email() {
    return this.userForm.get('email');
  }
  get password() {
    return this.userForm.get('password');
  }
  get fullName() {
    return this.userForm.get('fullName');
  }
  get phone() {
    return this.userForm.get('phone');
  }
  get roleNames() {
    return this.userForm.get('roleNames');
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.userForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
  }

  hasFormError(errorName: string): boolean {
    return (this.userForm.touched && this.userForm.hasError(errorName)) ?? false;
  }

  onRoleToggle(roleName: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentRoles = this.userForm.get('roleNames')?.value || [];

    if (checkbox.checked) {
      if (!currentRoles.includes(roleName)) {
        this.userForm.patchValue({
          roleNames: [...currentRoles, roleName],
        });
      }
    } else {
      this.userForm.patchValue({
        roleNames: currentRoles.filter((name: string) => name !== roleName),
      });
    }
  }

  isRoleSelected(roleName: string): boolean {
    const currentRoles = this.userForm.get('roleNames')?.value || [];
    return currentRoles.includes(roleName);
  }

  // Helper for template to get roleNames form control
  get roleNamesControl() {
    return this.userForm.get('roleNames');
  }

  getInitials(fullName: string): string {
    if (!fullName) return 'NA';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}
