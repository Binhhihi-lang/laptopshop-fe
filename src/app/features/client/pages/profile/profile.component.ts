import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { ClientAuthService } from '@core/services/client-auth.service';
import { ClientUserService } from '@core/services/client-user.service';
import { DeviceService } from '@core/services/device.service';
import { LocationService, Commune, Province } from '@core/services/location.service';
import { NotificationService } from '@core/services/notification.service';
import { UserResponse, UserProfileUpdateRequest, getInitials } from '@core/models/user.model';
import { DeviceInfo } from '@core/models/device.model';
import { ConfirmDialogComponent } from '@shared/confirm-dialog/confirm-dialog.component';
import {
  AvatarComponent,
  ButtonComponent,
  CardComponent,
  CardHeaderComponent,
  FormFieldComponent,
  InputComponent,
  LoadingComponent,
  PageHeaderComponent,
  SelectComponent,
  SelectOption,
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
    MatCheckboxModule,
    AvatarComponent,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    FormFieldComponent,
    InputComponent,
    LoadingComponent,
    PageHeaderComponent,
    SelectComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ClientProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(ClientUserService);
  private readonly auth = inject(ClientAuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly locationService = inject(LocationService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly currentUser = signal<UserResponse | null>(null);
  readonly selectedAvatar = signal<File | null>(null);
  readonly avatarPreview = signal<string | null>(null);

  // Thiết bị đang đăng nhập
  readonly devices = signal<DeviceInfo[]>([]);
  readonly isLoadingDevices = signal(false);
  readonly revokingDeviceId = signal<string | null>(null);
  readonly isRevokingOthers = signal(false);
  readonly isRevokingSelected = signal(false);
  /** deviceId của các thiết bị user tích chọn để đăng xuất. */
  readonly selectedDeviceIds = signal<string[]>([]);

  // Địa chỉ 2 cấp sau sáp nhập 2025: Tỉnh/Thành phố → Phường/Xã
  readonly provinces = signal<Province[]>([]);
  readonly communes = signal<Commune[]>([]);
  readonly isLoadingCommunes = signal(false);

  readonly provinceOptions = computed<SelectOption[]>(() =>
    this.provinces().map((p) => ({ value: String(p.code), label: p.name })),
  );
  readonly communeOptions = computed<SelectOption[]>(() =>
    this.communes().map((c) => ({ value: String(c.code), label: c.name })),
  );

  // Form: các trường cho phép sửa (không role/active/password)
  readonly form: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
    provinceCode: [''],
    communeCode: [''],
    address: [''],
  });

  ngOnInit(): void {
    this.loadProvinces();
    this.loadProfile();
    this.loadDevices();
  }

  // ================== ĐỊA CHỈ 2 CẤP ==================

  /** 34 tỉnh/thành sau sáp nhập — gọi API công khai, không qua BE. */
  loadProvinces(): void {
    this.locationService.getProvinces().subscribe({
      next: (list) => this.provinces.set(list),
      error: () => this.notification.error('Không tải được danh sách tỉnh/thành'),
    });
  }

  /** Đổi tỉnh → xóa phường/xã đã chọn rồi nạp lại danh sách phường/xã. */
  onProvinceChange(code: string): void {
    this.form.get('communeCode')?.setValue('');
    this.communes.set([]);
    this.loadCommunesFor(code);
  }

  loadCommunesFor(provinceCode: string): void {
    if (!provinceCode) {
      this.communes.set([]);
      return;
    }
    this.isLoadingCommunes.set(true);
    this.locationService.getCommunes(provinceCode).subscribe({
      next: (list) => {
        this.communes.set(list);
        this.isLoadingCommunes.set(false);
      },
      error: () => {
        this.isLoadingCommunes.set(false);
        this.notification.error('Không tải được danh sách phường/xã');
      },
    });
  }

  /**
   * Bỏ phần phường/xã và tỉnh/thành ở CUỐI chuỗi address, chỉ giữ địa chỉ
   * đường. Dữ liệu cũ (trước khi tách trường) đã ghép kèm phường/tỉnh nên cần
   * tách ra để không hiển thị trùng với 2 select ở trên.
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
    this.deviceService.getDevices('client').subscribe({
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

  /** Số thiết bị khác (không tính thiết bị đang dùng). */
  get otherDeviceCount(): number {
    return this.devices().filter((d) => !d.current).length;
  }

  /** Thu hồi 1 thiết bị cụ thể, có dialog xác nhận vì không hoàn tác được. */
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
        this.deviceService.revokeDevice('client', device.deviceId).subscribe({
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
        this.deviceService.revokeOthers('client').subscribe({
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
        this.deviceService.revokeSelected('client', ids).subscribe({
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
        this.form.patchValue({
          fullName: user.fullName,
          email: user.email || '',
          phone: user.phone || '',
          provinceCode: user.provinceCode || '',
          communeCode: user.communeCode || '',
          // Ô "Địa chỉ cụ thể" chỉ chứa phần đường; dữ liệu cũ có thể đã ghép
          // kèm phường/tỉnh → tách bỏ để không hiển thị trùng với 2 select trên.
          address: this.streetPart(user),
        });
        // Nạp phường/xã của tỉnh đã lưu để select hiển thị đúng lựa chọn cũ
        if (user.provinceCode) {
          this.loadCommunesFor(user.provinceCode);
        }
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

    // Tên tỉnh/phường suy từ code đang chọn; nếu danh sách chưa tải được thì
    // giữ nguyên tên đã lưu trước đó để không mất dữ liệu.
    const provinceName =
      this.provinces().find((p) => String(p.code) === v.provinceCode)?.name ??
      this.currentUser()?.provinceName ??
      '';
    const communeName =
      this.communes().find((c) => String(c.code) === v.communeCode)?.name ??
      this.currentUser()?.communeName ??
      '';

    const data: UserProfileUpdateRequest = {
      fullName: v.fullName,
      email: v.email,
      phone: v.phone || undefined,
      // Chỉ gửi phần đường; phường/xã + tỉnh/thành gửi ở trường riêng bên dưới.
      address: v.address?.trim() || undefined,
      provinceCode: v.provinceCode || undefined,
      provinceName: provinceName || undefined,
      communeCode: v.communeCode || undefined,
      communeName: communeName || undefined,
    };
    if (this.selectedAvatar()) {
      data.avatar = this.selectedAvatar()!;
    }
    this.userService.updateMyProfile(data).subscribe({
      next: (updated) => {
        this.currentUser.set(updated);
        if (updated.avatar) this.avatarPreview.set(updated.avatar);
        // Đồng bộ fullName mới vào localStorage + phát sự kiện
        // để ClientLayoutComponent cập nhật header ngay lập tức.
        const info = this.auth.getUserInfo();
        if (info) {
          info.fullName = updated.fullName;
          if (updated.avatar) info.avatar = updated.avatar;
          this.auth.setUserInfo(info);
        }
        this.notification.success('Cập nhật hồ sơ thành công');
        this.isSubmitting.set(false);
        // Quay về trang chủ sau khi lưu (như yêu cầu)
        this.router.navigate(['/']);
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
  get provinceCodeControl() {
    return this.form.get('provinceCode');
  }
  get communeCodeControl() {
    return this.form.get('communeCode');
  }

  hasError(name: string, err: string): boolean {
    const c = this.form.get(name);
    return (c?.touched && c?.hasError(err)) ?? false;
  }

  getInitials = getInitials;
}
