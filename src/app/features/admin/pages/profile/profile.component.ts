import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/services/auth.service';
import { UserResponse, UserProfileUpdateRequest } from '@core/models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';

// Shared components
import {
  CardComponent,
  ButtonComponent,
  InputComponent,
  FormFieldComponent,
  PageHeaderComponent,
  AvatarComponent,
  BadgeComponent,
  LoadingComponent,
} from '@shared/components';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    CardComponent,
    ButtonComponent,
    InputComponent,
    FormFieldComponent,
    PageHeaderComponent,
    AvatarComponent,
    BadgeComponent,
    LoadingComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // State signals
  isLoading = signal(true);
  isSubmitting = signal(false);
  currentUser = signal<UserResponse | null>(null);
  selectedAvatar = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);

  // Form: CHỈ các trường cho phép sửa (không email/role/active/password)
  profileForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
    address: [''],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.profileForm.patchValue({
          fullName: user.fullName,
          phone: user.phone || '',
          address: user.address || '',
        });
        // Hiển thị ảnh hiện tại (user.avatar là URL Cloudinary đầy đủ)
        if (user.avatar) {
          this.avatarPreview.set(user.avatar);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Lỗi tải hồ sơ:', error);
        this.snackBar.open('Không thể tải hồ sơ cá nhân', 'Đóng', { duration: 3000 });
        this.isLoading.set(false);
      },
    });
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
    this.avatarPreview.set(this.currentUser()?.avatar ?? null);
    const fileInput = document.querySelector('#profileAvatarInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.snackBar.open('Vui lòng điền đầy đủ thông tin bắt buộc', 'Đóng', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.profileForm.value;
    const data: UserProfileUpdateRequest = {
      fullName: formValue.fullName,
      phone: formValue.phone || undefined,
      address: formValue.address || undefined,
    };
    if (this.selectedAvatar()) {
      data.avatar = this.selectedAvatar()!;
    }

    this.userService.updateMyProfile(data).subscribe({
      next: (updated) => {
        this.currentUser.set(updated);
        if (updated.avatar) {
          this.avatarPreview.set(updated.avatar);
        }
        // Đồng bộ họ tên mới vào localStorage để sidebar/header cập nhật ngay
        const info = this.authService.getUserInfo();
        if (info) {
          info.fullName = updated.fullName;
          this.authService.setUserInfo(info);
        }
        this.snackBar.open('Cập nhật hồ sơ thành công', 'Đóng', { duration: 3000 });
        this.isSubmitting.set(false);
      },
      error: (error) => {
        console.error('Lỗi cập nhật hồ sơ:', error);
        this.snackBar.open(error.error?.message || 'Cập nhật hồ sơ thất bại', 'Đóng', {
          duration: 5000,
        });
        this.isSubmitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  get fullNameControl() {
    return this.profileForm.get('fullName');
  }
  get phoneControl() {
    return this.profileForm.get('phone');
  }
  get addressControl() {
    return this.profileForm.get('address');
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.profileForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
  }

  getRoleVariant(
    roleName: string,
  ): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    const roleVariants: Record<
      string,
      'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    > = {
      ADMIN: 'danger',
      STAFF: 'warning',
      USER: 'primary',
      MANAGER: 'info',
      SUPER_ADMIN: 'danger',
    };
    return roleVariants[roleName] || 'neutral';
  }

  getInitials(fullName: string): string {
    if (!fullName) return 'NA';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}
