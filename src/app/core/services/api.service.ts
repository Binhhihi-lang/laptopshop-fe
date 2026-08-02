import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      return throwError(() => new Error(`Error: ${error.error.message}`));
    } else {
      // Backend error
      return throwError(
        () => new Error(
          `Backend returned code ${error.status}, body was: ${error.error}`
        )
      );
    }
  }

  // GET request
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.apiUrl}${endpoint}`).pipe(
      map(response => response.result),
      catchError(this.handleError)
    );
  }

  // POST request
  post<T, D>(endpoint: string, data: D): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, data).pipe(
      map(response => response.result),
      catchError(this.handleError)
    );
  }

  // PUT request
  put<T, D>(endpoint: string, data: D): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, data).pipe(
      map(response => response.result),
      catchError(this.handleError)
    );
  }

  // DELETE request
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.apiUrl}${endpoint}`).pipe(
      map(response => response.result),
      catchError(this.handleError)
    );
  }

  // Upload file (FormData)
  upload<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, formData).pipe(
      map(response => response.result),
      catchError(this.handleError)
    );
  }
}
