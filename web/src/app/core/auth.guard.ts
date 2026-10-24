import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const profesorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.rol() === 'Profesor' ? true : router.createUrlTree(['/ingreso']);
};

export const estudianteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.rol() === 'Estudiante' ? true : router.createUrlTree(['/ingreso']);
};
