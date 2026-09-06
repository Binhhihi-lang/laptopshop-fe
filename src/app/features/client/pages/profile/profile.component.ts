import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClientAuthService } from '@core/services/client-auth.service';
import { ClientUserService } from '@core/services/client-user.service';
import { NotificationService } from '@core/services/notification.service';
import { UserResponse, UserProfileUpdateRequest, getInitials } from '@core/models/user.model';
import {
  AvatarComponent,
  ButtonComponent,
  CardComponent,
  CardHeaderComponent,
  FormFieldComponent,
  InputComponent,
  PageHeaderComponent,
} from '@shared/components';

/**
 * Hồ sơ cá nhân storefront. Yêu cầu `clientAuthGuard` (đã đăng nhập).
 * Tương tự admin profile nhưng dùng `ClientUserService` (gọi /client/users/me)
 * thay vì `UserService` (gọi /admin/users/me) — path admin chỉ cho ADMIN/STAFF.
 */
@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    AvatarComponent,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    FormFieldComponent,
    InputComponent,
    PageHeaderComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ClientProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(ClientUserService);
  private readonly auth = inject(ClientAuthService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly currentUser = signal<UserResponse | null>(null);
  readonly selectedAvatar = signal<File | null>(null);
  readonly avatarPreview = signal<string | null>(null);

  // Form: chỉ các trường cho phép sửa (giống admin profile)
  readonly form: FormGroup = this.fb.group({
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
        this.form.patchValue({
          fullName: user.fullName,
          phone: user.phone || '',
          address: user.address || '',
        });
        if (user.avatar) {
          this.avatarPreview.set(user.avatar);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Lỗi tải hồ sơ:', err);
        this.notification.error('Không tải được hồ sơ, vui lòng thử lại');
        this.isLoading.set(false);
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.notification.warn('Vui lòng chọn file hình ảnh');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notification.warn('Kích thước ảnh không được vượt quá 2MB');
      return;
    }
    this.selectedAvatar.set(file);
    const reader = new FileReader();
    reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.selectedAvatar.set(null);
    this.avatarPreview.set(this.currentUser()?.avatar ?? null);
    const fileInput = document.querySelector('#profileAvatarInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const v = this.form.value;
    const data: UserProfileUpdateRequest = {
      fullName: v.fullName,
      phone: v.phone || undefined,
      address: v.address || undefined,
    };
    if (this.selectedAvatar()) {
      data.avatar = this.selectedAvatar()!;
    }
    this.userService.updateMyProfile(data).subscribe({
      next: (updated) => {
        this.currentUser.set(updated);
        if (updated.avatar) this.avatarPreview.set(updated.avatar);
        // Đồng bộ fullName mới vào localStorage để header hiển thị
        const info = this.auth.getUserInfo();
        if (info) {
          info.fullName = updated.fullName;
          // Tái sử dụng helper setUserInfo của ClientAuthService
          localStorage.setItem('user_info', JSON.stringify(info));
        }
        this.notification.success('Cập nhật hồ sơ thành công');
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Lỗi cập nhật hồ sơ:', err);
        this.notification.error(err?.error?.message || 'Cập nhật thất bại, vui lòng thử lại');
        this.isSubmitting.set(false);
      },
    });
  }

  get fullNameControl() {
    return this.form.get('fullName');
  }
  get phoneControl() {
    return this.form.get('phone');
  }
  get addressControl() {
    return this.form.get('address');
  }

  hasError(name: string, err: string): boolean {
    const c = this.form.get(name);
    return (c?.touched && c?.hasError(err)) ?? false;
  }

  getInitials = getInitials;
}
