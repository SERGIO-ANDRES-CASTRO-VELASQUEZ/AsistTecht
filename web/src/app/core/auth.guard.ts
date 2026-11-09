import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const profesorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.rol() === 'Profesor' ? true : router.createUrlTree(['/ingreso']);
};

export const estudianteGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.rol() !== 'Estudiante') {
    return router.createUrlTree(['/ingreso']);
  }
  if (auth.debeCambiarPassword() && !state.url.includes('/clave')) {
    return router.createUrlTree(['/estudiante/clave']);
  }
  return true;
};

export const directorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.rol() === 'Director' ? true : router.createUrlTree(['/ingreso']);
};

export const acudienteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.rol() === 'Acudiente' ? true : router.createUrlTree(['/ingreso']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.rol() === 'Admin' ? true : router.createUrlTree(['/ingreso']);
};

