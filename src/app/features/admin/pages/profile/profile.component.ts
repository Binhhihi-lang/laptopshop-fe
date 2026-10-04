import { Component, OnInit, signal, inject, computed } from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/services/auth.service';
import { DeviceService } from '@core/services/device.service';
import { LocationService, Commune, Province } from '@core/services/location.service';
import { UserResponse, UserProfileUpdateRequest } from '@core/models/user.model';
import { DeviceInfo } from '@core/models/device.model';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';

// Shared components
import {
  CardComponent,
  ButtonComponent,
  InputComponent,
  SelectComponent,
  FormFieldComponent,
  PageHeaderComponent,
  AvatarComponent,
  BadgeComponent,
  LoadingComponent,
} from '@shared/components';
import type { SelectOption } from '@shared/components';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatCheckboxModule,
    CardComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
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
  private readonly deviceService = inject(DeviceService);
  private readonly locationService = inject(LocationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  // State signals
  isLoading = signal(true);
  isSubmitting = signal(false);
  currentUser = signal<UserResponse | null>(null);
  selectedAvatar = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);

  // Địa chỉ 2 cấp (tỉnh/thành → phường/xã) — giống trang hồ sơ client
  provinces = signal<Province[]>([]);
  communes = signal<Commune[]>([]);
  provinceOptions = computed<SelectOption[]>(() =>
    this.provinces().map((p) => ({ value: String(p.code), label: p.name })),
  );
  communeOptions = computed<SelectOption[]>(() =>
    this.communes().map((c) => ({ value: String(c.code), label: c.name })),
  );

  // Thiết bị đang đăng nhập
  devices = signal<DeviceInfo[]>([]);
  isLoadingDevices = signal(false);
  revokingDeviceId = signal<string | null>(null);
  isRevokingOthers = signal(false);
  isRevokingSelected = signal(false);
  /** deviceId của các thiết bị user tích chọn để đăng xuất. */
  selectedDeviceIds = signal<string[]>([]);

  // Form: các trường cho phép sửa (không role/active/password)
  profileForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
    provinceCode: [''],
    communeCode: [''],
    address: [''],
  });

  ngOnInit(): void {
    this.loadProfile();
    this.loadDevices();
    this.loadProvinces();
  }

  // ================== ĐỊA CHỈ 2 CẤP ==================

  /** 34 tỉnh/thành sau sáp nhập — gọi API công khai, không qua BE. */
  loadProvinces(): void {
    this.locationService.getProvinces().subscribe({
      next: (list) => this.provinces.set(list),
      error: () => {},
    });
  }

  onProvinceChange(provinceCode: string): void {
    this.profileForm.get('communeCode')?.setValue('');
    this.communes.set([]);
    if (provinceCode) {
      this.loadCommunesFor(provinceCode);
    }
  }

  loadCommunesFor(provinceCode: string): void {
    this.locationService.getCommunes(provinceCode).subscribe({
      next: (list) => this.communes.set(list),
      error: () => this.communes.set([]),
    });
  }

  /**
   * Bỏ phần phường/xã và tỉnh/thành ở CUỐI chuỗi address, chỉ giữ địa chỉ
   * đường. Dữ liệu cũ đã ghép kèm phường/tỉnh nên cần tách ra.
   */
  private streetPart(user: UserResponse): string {
    let address = (user.address ?? '').trim();
    const suffixes = [user.communeName, user.provinceName]
      .filter((s): s is string => !!s?.trim())
      .map((s) => s.trim());
    for (const suffix of suffixes) {
      if (address.toLowerCase().endsWith(suffix.toLowerCase())) {
        address = address.slice(0, address.length - suffix.length);
        address = address.replace(/[,\s]+$/, '');
      }
    }
    return address;
  }

  // ================== THIẾT BỊ ĐANG ĐĂNG NHẬP ==================

  loadDevices(): void {
    this.isLoadingDevices.set(true);
    this.deviceService.getDevices('admin').subscribe({
      next: (devices) => {
        this.devices.set(devices);
        this.isLoadingDevices.set(false);
        this.selectedDeviceIds.set([]); // reset chọn khi tải lại danh sách
      },
      error: () => {
        // Không chặn trang hồ sơ nếu tải danh sách thiết bị lỗi.
        this.isLoadingDevices.set(false);
      },
    });
  }

  /** Số thiết bị khác (không tính thiết bị đang dùng) — quyết định nút "Đăng xuất thiết bị khác". */
  get otherDeviceCount(): number {
    return this.devices().filter((d) => !d.current).length;
  }

  /** Thu hồi 1 thiết bị cụ thể, có dialog xác nhận vì hành động không hoàn tác được. */
  revokeDevice(device: DeviceInfo): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '380px',
        data: {
          title: 'Đăng xuất thiết bị',
          message: `Bạn có chắc muốn đăng xuất "${device.deviceName}"? Thiết bị đó sẽ phải đăng nhập lại.`,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.revokingDeviceId.set(device.deviceId);
        this.deviceService.revokeDevice('admin', device.deviceId).subscribe({
          next: () => {
            this.notification.success('Đã đăng xuất thiết bị');
            this.revokingDeviceId.set(null);
            this.loadDevices();
          },
          error: (err) => {
            this.revokingDeviceId.set(null);
            this.notification.error(this.notification.extractError(err));
          },
        });
      });
  }

  /** Thu hồi mọi thiết bị khác, giữ thiết bị đang dùng. */
  revokeOtherDevices(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '380px',
        data: {
          title: 'Đăng xuất các thiết bị khác',
          message: `Bạn có chắc muốn đăng xuất ${this.otherDeviceCount} thiết bị khác? Chúng sẽ phải đăng nhập lại.`,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.isRevokingOthers.set(true);
        this.deviceService.revokeOthers('admin').subscribe({
          next: () => {
            this.notification.success('Đã đăng xuất các thiết bị khác');
            this.isRevokingOthers.set(false);
            this.loadDevices();
          },
          error: (err) => {
            this.isRevokingOthers.set(false);
            this.notification.error(this.notification.extractError(err));
          },
        });
      });
  }

  isDeviceSelected(deviceId: string): boolean {
    return this.selectedDeviceIds().includes(deviceId);
  }

  toggleDeviceSelected(deviceId: string, checked: boolean): void {
    this.selectedDeviceIds.set(
      checked
        ? [...this.selectedDeviceIds(), deviceId]
        : this.selectedDeviceIds().filter((id) => id !== deviceId),
    );
  }

  /** True khi đã tích hết thiết bị khác (dùng cho nút "Chọn tất cả"). */
  allNonCurrentSelected(): boolean {
    return this.otherDeviceCount > 0 && this.selectedDeviceIds().length === this.otherDeviceCount;
  }

  toggleSelectAll(checked: boolean): void {
    this.selectedDeviceIds.set(
      checked
        ? this.devices()
            .filter((d) => !d.current)
            .map((d) => d.deviceId)
        : [],
    );
  }

  /** Thu hồi hàng loạt các thiết bị đã tích chọn. */
  revokeSelected(): void {
    const ids = this.selectedDeviceIds();
    if (ids.length === 0) return;
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '380px',
        data: {
          title: 'Đăng xuất các thiết bị đã chọn',
          message: `Bạn có chắc muốn đăng xuất ${ids.length} thiết bị đã chọn? Chúng sẽ phải đăng nhập lại.`,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.isRevokingSelected.set(true);
        this.deviceService.revokeSelected('admin', ids).subscribe({
          next: () => {
            this.notification.success('Đã đăng xuất các thiết bị đã chọn');
            this.isRevokingSelected.set(false);
            this.loadDevices();
          },
          error: (err) => {
            this.isRevokingSelected.set(false);
            this.notification.error(this.notification.extractError(err));
          },
        });
      });
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.userService.getMyProfile().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.profileForm.patchValue({
          fullName: user.fullName,
          email: user.email || '',
          phone: user.phone || '',
          provinceCode: user.provinceCode || '',
          communeCode: user.communeCode || '',
          // Ô "Địa chỉ cụ thể" chỉ chứa phần đường; dữ liệu cũ có thể đã ghép
          // kèm phường/tỉnh → tách bỏ để không trùng với 2 select trên.
          address: this.streetPart(user),
        });
        // Nạp phường/xã của tỉnh đã lưu để select hiển thị đúng lựa chọn cũ
        if (user.provinceCode) {
          this.loadCommunesFor(user.provinceCode);
        }
        // Hiển thị ảnh hiện tại (user.avatar là URL Cloudinary đầy đủ)
        if (user.avatar) {
          this.avatarPreview.set(user.avatar);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Lỗi tải hồ sơ:', error);
        this.isLoading.set(false);
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
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
      this.notification.warn('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.profileForm.value;

    // Tên tỉnh/phường suy từ code đang chọn; nếu danh sách chưa tải được thì
    // giữ nguyên tên đã lưu trước đó để không mất dữ liệu.
    const provinceName =
      this.provinces().find((p) => String(p.code) === formValue.provinceCode)?.name ??
      this.currentUser()?.provinceName ??
      '';
    const communeName =
      this.communes().find((c) => String(c.code) === formValue.communeCode)?.name ??
      this.currentUser()?.communeName ??
      '';

    const data: UserProfileUpdateRequest = {
      fullName: formValue.fullName,
      email: formValue.email,
      phone: formValue.phone || undefined,
      // Chỉ gửi phần đường; phường/xã + tỉnh/thành gửi ở trường riêng bên dưới.
      address: formValue.address?.trim() || undefined,
      provinceCode: formValue.provinceCode || undefined,
      provinceName: provinceName || undefined,
      communeCode: formValue.communeCode || undefined,
      communeName: communeName || undefined,
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
        this.notification.success('Cập nhật hồ sơ thành công');
        this.isSubmitting.set(false);
        // Quay về trang dashboard sau khi lưu (giống hành vi cancel)
        this.router.navigate(['/admin/dashboard']);
      },
      error: (error) => {
        console.error('Lỗi cập nhật hồ sơ:', error);
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
  get emailControl() {
    return this.profileForm.get('email');
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
