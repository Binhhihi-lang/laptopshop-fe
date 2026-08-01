import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({ providedIn: 'root' })
export class JwtHelper {
  private jwtHelper = new JwtHelperService();

  decodeToken(token: string): any {
    return this.jwtHelper.decodeToken(token);
  }

  getUserIdFromToken(token: string): number | null {
    const decoded = this.decodeToken(token);
    return decoded?.userId ?? null;
  }

  getRoleNamesFromToken(token: string): string[] {
    const decoded = this.decodeToken(token);
    const scope = decoded?.scope ?? '';
    return scope
      .split(' ')
      .filter((s: string) => s.startsWith('ROLE_'))
      .map((s: string) => s.replace('ROLE_', ''));
  }

  getPermissionsFromToken(token: string): string[] {
    const decoded = this.decodeToken(token);
    const permissions = decoded?.permissions ?? '';
    return permissions.split(' ').filter(Boolean);
  }

  isTokenExpired(token: string): boolean {
    return this.jwtHelper.isTokenExpired(token);
  }

  getFullNameFromToken(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.sub ?? null;
  }
}