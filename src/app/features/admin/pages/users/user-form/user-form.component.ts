import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserCreationRequest, UserUpdateRequest } from '../user.model';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css'
})
export class UserFormComponent implements OnInit {
  userForm: FormGroup;
  isLoading = false;
  roles: string[] = ['ADMIN', 'STAFF', 'USER']; // Default roles - ideally load from API

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; user: any }
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]], // Only required for create
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      roleNames: [[roleNames: [[], [Validators.required]]
    });
  }

  ngOnInit() {
    if (this.data.user) {
      // Edit mode - populate form with existing data
      this.userForm.patchValue({
        username: this.data.user.username,
        email: this.data.user.email,
        fullName: this.data.user.fullName
      });

      // Set roles (convert from roleNames string array to match expected format)
      if (this.data.user.roleNames) {
        this.userForm.patchValue({ roleNames: this.data.user.roleNames });
      }

      // Don't require password for edit unless explicitly provided
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  onSubmit() {
    if (this.userForm.valid) {
      this.isLoading = true;
      const formValue = this.userForm.value;

      const userData: UserCreationRequest | UserUpdateRequest = {
        username: formValue.username,
        email: formValue.email,
        fullName: formValue.fullName,
        roleNames: formValue.roleNames
      };

      // Only include password if provided (for create) or if in edit mode and password field has value
      if (this.data.user) {
        // Edit mode
        (userData as UserUpdateRequest).id = this.data.user.id;
        if (formValue.password) {
          (userData as UserUpdateRequest).password = formValue.password;
        }
      } else {
        // Create mode
        (userData as UserCreationRequest).password = formValue.password;
      }

      this.dialogRef.close(userData);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  // Convenience getter for easy access to form fields
  get f() {
    return this.userForm.controls;
  }
}