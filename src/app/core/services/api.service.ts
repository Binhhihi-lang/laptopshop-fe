import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';
import { ApiResponse } from '@core/models/api-response.model';
import { Page } from '@core/models/page.model';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    // Re-throw the HttpErrorResponse to preserve error structure
    // Components can access error.error?.message, error.status, etc.
    return throwError(() => error);
  }

  // GET request
  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }
    const url = httpParams.toString()
      ? `${this.apiUrl}${endpoint}?${httpParams.toString()}`
      : `${this.apiUrl}${endpoint}`;
    return this.http.get<ApiResponse<T>>(url).pipe(
      map((response) => response.result),
      catchError(this.handleError),
    );
  }

  // GET request trả về Page<T> — dùng cho danh sách phân trang.
  // Trả về nguyên Page<T> (không unwrap content) để component vẫn thấy
  // totalElements, totalPages, number, size... cho việc render phân trang.
  getPage<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Observable<Page<T>> {
    return this.get<Page<T>>(endpoint, params);
  }

  // POST request , D là dữ liệu gửi lên , T là kiểu trả về
  post<T, D>(endpoint: string, data: D): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, data).pipe(
      map((response) => response.result),
      catchError(this.handleError),
    );
  }

  // PUT request
  put<T, D>(endpoint: string, data: D): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, data).pipe(
      map((response) => response.result), // map lọc lấy dữ liệu result từ response
      catchError(this.handleError),
    );
  }

  // PATCH request
  patch<T, D>(endpoint: string, data: D): Observable<T> {
    return this.http.patch<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, data).pipe(
      map((response) => response.result),
      catchError(this.handleError),
    );
  }

  // DELETE request
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.apiUrl}${endpoint}`).pipe(
      map((response) => response.result),
      catchError(this.handleError),
    );
  }

  // Upload file (FormData)
  upload<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, formData).pipe(
      map((response) => response.result),
      catchError(this.handleError),
    );
  }
}
