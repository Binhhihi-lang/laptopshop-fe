import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { API_ENDPOINTS } from '@core/utils/constants';
import { Observable } from 'rxjs';
import { DashboardRange, DashboardStats } from '@core/models/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = `${API_ENDPOINTS.DASHBOARD}/stats`;

  constructor(private api: ApiService) {}

  /** Số liệu tổng hợp cho Bảng điều khiển trong một khoảng thời gian. */
  getStats(range: DashboardRange = 'LAST_30_DAYS'): Observable<DashboardStats> {
    return this.api.get<DashboardStats>(`${this.apiUrl}?range=${range}`);
  }

  /** Tải báo cáo Excel (.xlsx) theo kỳ — chỉ ADMIN có quyền READ_USER. */
  exportReport(range: DashboardRange = 'LAST_30_DAYS'): Observable<Blob> {
    return this.api.getBlob(`${API_ENDPOINTS.DASHBOARD}/export`, { range });
  }
}
