import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import { PermissionResponse } from '@core/models/permission.model';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private apiUrl = `${API_ENDPOINTS.PERMISSIONS}`;

  constructor(private api: ApiService) {}

  // Chỉ giữ GET danh sách + khóa/kích hoạt hàng loạt. Tên permission là hằng số
  // do code sở hữu (seed + @PreAuthorize) nên KHÔNG tạo/sửa/xóa tên qua UI —
  // tránh sinh "quyền chết" (permission không có @PreAuthorize tương ứng).
  getPermissions(): Observable<PermissionResponse[]> {
    return this.api.get<PermissionResponse[]>(this.apiUrl);
  }

  bulkUpdatePermissionStatus(ids: string[], active: boolean): Observable<void> {
    return this.api.patch<void, { ids: string[]; active: boolean }>(`${this.apiUrl}/bulk-status`, {
      ids,
      active,
    });
  }
}
