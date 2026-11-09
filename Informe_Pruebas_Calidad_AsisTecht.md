# Informe Completo de Pruebas, Errores y Calidad de Software — AsisTecht

Documento formal de auditoría y aseguramiento de calidad de software para el Gimnasio José Eustasio Rivera.

## 1. Resumen Ejecutivo
Evaluación exhaustiva de extremo a extremo cubriendo pruebas funcionales, de integración, regresión, carga masiva (1000 peticiones) y ciberseguridad.

## 2. Métricas de Rendimiento Cuantitativo (Load Test)
- **Peticiones Totales:** 1000
- **Concurrencia:** 40 trabajadores simultáneos
- **Throughput:** 3141.65 req/s
- **Latencia Media:** 9.92 ms
- **Latencia p95:** 11.36 ms
- **Tasa de Éxito:** 100.0% (0 errores)

---

## 3. Matriz Integral de Defectos y Estado de Remediación

| ID Defecto | Severidad | Descripción del Hallazgo | Estado | Remediación Implementada |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-SEC-01** | **CRÍTICA** | Clave JWT fija en `docker-compose.yml`. | ✅ **CORREGIDO** | Parametrizada mediante variable inyectable `${JWT_SECRET:-...}`, plantilla `.env.example` añadida y advertencia en `Program.cs` en modo producción. |
| **BUG-UI-02** | **ALTA** | Falta de atributo explícito `type="text"` en inputs de `login.component.ts`. | ✅ **CORREGIDO** | Atributo `type="text"` agregado en campo de login unificado y modal de recuperación para soporte de gestores de claves y accesibilidad. |
| **BUG-NET-03** | **MEDIA** | Bloqueo de cámara WebRTC en celular al acceder vía `http://` en lugar de `https://:8443`. | ✅ **CORREGIDO** | Implementado detector de contexto seguro, banner de alerta y overlay de cámara interactivo con botón de redirección inmediata a HTTPS (puerto 8443), enlace a descarga de APK oficial y guía rápida de certificado SSL. |
| **BUG-DAT-04** | **MEDIA** | Falta de paginación server-side en `EstudiantesController` (potencial cuello de botella con > 1,000 registros). | ✅ **CORREGIDO** | Implementada paginación server-side en `api/Controllers/EstudiantesController.cs` con `pageIndex`, `pageSize`, `Skip()`, `Take()` y respuesta tipada en `api.service.ts` manteniendo retrocompatibilidad. |
| **BUG-SEC-05** | **BAJA** | Cabeceras HTTP de endurecimiento (CSP, X-Frame-Options, Permissions-Policy) ausentes en Nginx y Caddy. | ✅ **CORREGIDO** | Añadidas directivas `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` (habilitando explícitamente cámara), `Referrer-Policy`, HSTS y Content-Security-Policy en `web/nginx.conf` y `deploy/Caddyfile`. |

---

## 4. Requerimientos Complementarios de Auditoría Atendidos
- **Habeas Data & Ley 1581 de 2012:** Componente `<app-terminos-check>` integrado y validado con modal emergente en todos los formularios de matrícula y registro institucional:
  - Formulario de Estudiantes (`admin.component.ts`)
  - Formulario de Docentes por Cédula (`admin.component.ts`)
  - Formulario de Acudientes y Amarre Familiar (`admin.component.ts`)
  - Formulario de Matrícula General (`estudiantes.component.ts`)
  - Formulario de Matrícula en Dirección Académica (`director.component.ts`)
