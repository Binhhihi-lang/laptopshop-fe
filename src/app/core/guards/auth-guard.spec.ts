import { expect } from '@angular-devkit/build-angular/node_modules/@angular/devkit/schematics/testing/test';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(authGuard).toBeTruthy();
  });

  it('should allow access when user is not authenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    expect(authGuard(null, null as any)).toBeTrue();
  });

  it('should deny access and redirect when user is authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);
    expect(authGuard(null, null as any)).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });
});
