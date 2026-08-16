import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';
import { ApiResponse } from '@core/models/api-response.model';
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
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.apiUrl}${endpoint}`).pipe(
      map((response) => response.result),
      catchError(this.handleError),
    );
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
