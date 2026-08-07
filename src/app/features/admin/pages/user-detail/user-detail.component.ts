import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '@shared/material.module';
import { UserResponse } from '@core/models/user.model';

export interface UserDetailDialogData {
  user: UserResponse;
}

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, MaterialModule, MatDialogModule],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
})
export class UserDetailComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<UserDetailComponent>);
  private readonly data = inject<UserDetailDialogData>(MAT_DIALOG_DATA);

  user = signal<UserResponse | null>(null);
  isLoading = signal(false);

  ngOnInit(): void {
    this.user.set(this.data.user);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    this.dialogRef.close('edit');
  }

  getInitials(fullName: string): string {
    if (!fullName) return 'NA';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusText(user: UserResponse): string {
    return (user.isActive ?? true) ? 'Đang hoạt động' : 'Ngừng hoạt động';
  }

  getStatusBadgeClass(user: UserResponse): string {
    const active = user.isActive ?? true;
    return active ? 'badge-success' : 'badge-danger';
  }

  getStatusDotClass(user: UserResponse): string {
    const active = user.isActive ?? true;
    return active ? 'bg-emerald-500' : 'bg-red-500';
  }
}