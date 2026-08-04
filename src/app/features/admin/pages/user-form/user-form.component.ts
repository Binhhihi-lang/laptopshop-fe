import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '@shared/material.module';
import { UserService } from '@core/services/user.service';
import { UserCreationRequest, UserUpdateRequest } from '@core/models/user.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MaterialModule,
  ],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
})
export class UserFormComponent implements OnInit {
  userForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  userId: number | null = null;

  avatarFile: File | null = null;
  avatarPreview: string | null = null;

  roles: string[] = ['ADMIN', 'STAFF', 'USER']; // TODO: thay bằng RoleService.getRoles() nếu muốn load động

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      roleNames: [[], [Validators.required]],
    });
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.userId = Number(idParam);
      this.loadUser(this.userId);
      // Edit mode: password không bắt buộc
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  loadUser(id: number) {
    this.isLoading = true;
    this.userService.getUserById(id).subscribe({
      next: (user) => {
        this.userForm.patchValue({
          username: user.username,
          email: user.email,
          fullName: user.phone,
          roleNames: user.roleNames,
        });
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.avatarFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => (this.avatarPreview = reader.result as string);
      reader.readAsDataURL(this.avatarFile);
    }
  }

  onSubmit() {
    if (this.userForm.invalid) return;

    this.isLoading = true;
    const formValue = this.userForm.value;

    if (this.isEditMode && this.userId) {
      const userData: UserUpdateRequest = {
        id: this.userId,
        username: formValue.username,
        email: formValue.email,
        fullName: formValue.fullName,
        roleNames: formValue.roleNames,
        ...(formValue.password ? { password: formValue.password } : {}),
        ...(this.avatarFile ? { avatar: this.avatarFile } : {}),
      };
      this.userService.updateUser(this.userId, userData).subscribe({
        next: () => this.router.navigate(['/admin/users']),
        error: () => (this.isLoading = false),
      });
    } else {
      const userData: UserCreationRequest = {
        username: formValue.username,
        email: formValue.email,
        password: formValue.password,
        fullName: formValue.fullName,
        roleNames: formValue.roleNames,
        ...(this.avatarFile ? { avatar: this.avatarFile } : {}),
      };
      this.userService.createUser(userData).subscribe({
        next: () => this.router.navigate(['/admin/users']),
        error: () => (this.isLoading = false),
      });
    }
  }

  onCancel() {
    this.router.navigate(['/admin/users']);
  }

  get f() {
    return this.userForm.controls;
  }
}
