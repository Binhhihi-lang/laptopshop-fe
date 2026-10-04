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
import { MatIconModule } from '@angular/material/icon';
import { RoleService } from '@core/services/role.service';
import { UserService } from '@core/services/user.service';
import { LocationService, Province, Commune } from '@core/services/location.service';
import { RoleResponse } from '@core/models/role.model';
import { UserResponse, UserCreationRequest, UserUpdateRequest } from '@core/models/user.model';
import { NotificationService } from '@core/services/notification.service';
import { Subject, takeUntil, filter, forkJoin } from 'rxjs';

// Shared components
import {
  CardComponent,
  BadgeComponent,
  ButtonComponent,
  InputComponent,
  SelectComponent,
  SelectOption,
  FormFieldComponent,
  PageHeaderComponent,
  AvatarComponent,
  LoadingComponent,
} from '@shared/components';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    FormFieldComponent,
    PageHeaderComponent,
    AvatarComponent,
    LoadingComponent,
  ],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
})
export class UserFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly locationService = inject(LocationService);
  private readonly notification = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  // State signals
  isLoading = signal(false);
  isSubmitting = signal(false);
  roles = signal<RoleResponse[]>([]);
  currentUser = signal<UserResponse | null>(null);
  selectedAvatar = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  showPassword = signal(false);

  // Địa chỉ 2 cấp (tỉnh/thành → phường/xã) — giống trang hồ sơ client
  provinces = signal<Province[]>([]);
  communes = signal<Commune[]>([]);
  provinceOptions = computed<SelectOption[]>(() =>
    this.provinces().map((p) => ({ value: String(p.code), label: p.name })),
  );
  communeOptions = computed<SelectOption[]>(() =>
    this.communes().map((c) => ({ value: String(c.code), label: c.name })),
  );

  // Route param
  userId = signal<string>('');

  // Form
  userForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
    provinceCode: [''],
    communeCode: [''],
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

  // Role options for checkbox display
  roleOptions = computed<SelectOption[]>(() =>
    this.roles().map((r) => ({ value: r.name, label: r.name })),
  );

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
    this.loadProvinces();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ================== ĐỊA CHỈ 2 CẤP ==================

  /** 34 tỉnh/thành sau sáp nhập — gọi API công khai, không qua BE. */
  loadProvinces(): void {
    this.locationService
      .getProvinces()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => this.provinces.set(list),
        error: () => {},
      });
  }

  onProvinceChange(provinceCode: string): void {
    this.userForm.get('communeCode')?.setValue('');
    this.communes.set([]);
    if (provinceCode) {
      this.loadCommunesFor(provinceCode);
    }
  }

  loadCommunesFor(provinceCode: string): void {
    this.locationService
      .getCommunes(provinceCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => this.communes.set(list),
        error: () => this.communes.set([]),
      });
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
      provinceCode: user.provinceCode || '',
      communeCode: user.communeCode || '',
      // Ô "Địa chỉ cụ thể" chỉ chứa phần đường; dữ liệu cũ có thể đã ghép
      // kèm phường/tỉnh → tách bỏ để không trùng với 2 select trên.
      address: this.streetPart(user),
      roleNames: user.roleNames || [],
      active: user.active ?? true,
    });

    // Nạp phường/xã của tỉnh đã lưu để select hiển thị đúng lựa chọn cũ
    if (user.provinceCode) {
      this.loadCommunesFor(user.provinceCode);
    }

    // Set avatar preview if exists
    if (user.avatar) {
      this.avatarPreview.set(user.avatar);
    }
  }

  /**
   * Bỏ phần phường/xã và tỉnh/thành ở CUỐI chuỗi address, chỉ giữ địa chỉ đường.
   * Dữ liệu cũ đã ghép kèm phường/tỉnh nên cần tách ra.
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
    this.avatarPreview.set(null);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      this.notification.warn('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.userForm.value;

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

    const addressFields = {
      address: formValue.address?.trim() || undefined,
      provinceCode: formValue.provinceCode || undefined,
      provinceName: provinceName || undefined,
      communeCode: formValue.communeCode || undefined,
      communeName: communeName || undefined,
    };

    if (this.isEditMode() && this.userId()) {
      const userData: UserUpdateRequest = {
        email: formValue.email,
        fullName: formValue.fullName,
        phone: formValue.phone || undefined,
        ...addressFields,
        roleNames: formValue.roleNames,
        active: formValue.active,
        ...(formValue.password ? { password: formValue.password } : {}),
        ...(this.selectedAvatar() ? { avatar: this.selectedAvatar()! } : {}),
      };
      this.userService.updateUser(this.userId(), userData).subscribe({
        next: () => {
          this.notification.success('Cập nhật người dùng thành công');
          this.router.navigate(['/admin/users']);
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.isSubmitting.set(false);
        },
      });
    } else {
      const userData: UserCreationRequest = {
        email: formValue.email,
        password: formValue.password,
        fullName: formValue.fullName,
        phone: formValue.phone || undefined,
        ...addressFields,
        roleNames: formValue.roleNames,
        ...(this.selectedAvatar() ? { avatar: this.selectedAvatar()! } : {}),
      };
      this.userService.createUser(userData).subscribe({
        next: () => {
          this.notification.success('Tạo người dùng thành công');
          this.router.navigate(['/admin/users']);
        },
        error: (error) => {
          console.error('Error creating user:', error);
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
  get address() {
    return this.userForm.get('address');
  }
  get roleNames() {
    return this.userForm.get('roleNames');
  }
  get active() {
    return this.userForm.get('active');
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.userForm.get(controlName);
    return (control?.touched && control?.hasError(errorName)) ?? false;
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
