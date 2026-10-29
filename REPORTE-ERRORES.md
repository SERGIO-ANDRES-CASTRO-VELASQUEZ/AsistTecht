# Reporte de errores

## ERR-001: El campo de usuario del Docente permite letras, aunque pide la cédula de ciudadanía

- **Estado:** Abierto (documentado, sin corregir)
- **Tipo:** Validación de entrada / inconsistencia de interfaz
- **Módulo:** Inicio de sesión (`/ingreso`), rol **Docente**

### Qué falla

Al elegir el rol **Docente**, la etiqueta del campo dice **"Cédula de Ciudadanía del Docente"** y el ejemplo muestra un número (`1075283910`). Una cédula es solo numérica, pero el input acepta cualquier carácter, incluidas letras y símbolos. El formulario no valida el formato ni en pantalla ni antes de enviar la petición.

### Dónde ocurre

| Archivo | Línea | Detalle |
| --- | --- | --- |
| [login.component.ts](web/src/app/pages/login.component.ts) | 64 | `<input [(ngModel)]="usuario" ... />` es de texto libre: no tiene `type`, `inputmode`, `pattern` ni `maxlength`. |
| [login.component.ts](web/src/app/pages/login.component.ts) | 217 | `etiquetaUsuario()` devuelve "Cédula de Ciudadanía del Docente" para el rol Profesor. |
| [login.component.ts](web/src/app/pages/login.component.ts) | 225 | `placeholderUsuario()` devuelve `Ej: 1075283910 (Cédula de ciudadanía)`. |
| [AuthController.cs](api/Controllers/AuthController.cs) | 29 | El backend solo aplica `Trim()` al usuario; no valida que sea numérico. |

### Comportamiento esperado

Con el rol Docente, el campo debería aceptar solo dígitos. Para eso conviene un teclado numérico (`inputmode="numeric"`), un `pattern="[0-9]*"` y filtrar los caracteres no numéricos.

### Referencia en el mismo proyecto

El formulario de alta de docentes en [admin.component.ts](web/src/app/pages/admin.component.ts) (línea 940) ya usa `inputmode="numeric"` y el texto "Solo números". El login no aplica esa misma restricción.

### Cómo reproducirlo

1. Abrir http://localhost:8080/ingreso.
2. Seleccionar el rol **Docente**.
3. Escribir letras en el campo "Cédula de Ciudadanía del Docente", por ejemplo `abc`.
4. El campo las acepta sin ningún aviso.

### Solución sugerida (no aplicada)

- Agregar `inputmode="numeric"` y `pattern="[0-9]*"` al input cuando el rol sea Docente.
- Validar en el frontend que el valor sean solo dígitos antes de llamar a `entrar()`.
- Opcional: validar también en `AuthController.Login` para el rol Profesor.

---

## ERR-002: No existe forma de eliminar notificaciones

- **Estado:** Abierto (documentado, sin corregir)
- **Tipo:** Funcionalidad faltante
- **Módulo:** Panel de notificaciones (campana 🔔 en la cabecera)
- **Roles afectados:** todos (Admin, Dirección, Docente, Estudiante y Familia), porque comparten el mismo panel y los mismos endpoints

### Qué falla

El panel de notificaciones solo permite **marcar como leídas** ("✓ Todo leído") y **refrescar**. No hay ningún botón para **borrar** una notificación ni para vaciar la lista. Las notificaciones leídas siguen mostrándose en "Todas" y se acumulan, de modo que la lista crece y el panel se llena sin que el usuario pueda limpiarlo.

### Dónde ocurre

| Archivo | Línea | Detalle |
| --- | --- | --- |
| [shell.component.ts](web/src/app/pages/shell.component.ts) | 210-290 | Plantilla del panel: solo tiene "✓ Todo leído", cerrar y "🔄 Refrescar"; ningún botón de eliminar. |
| [NotificacionesController.cs](api/Controllers/NotificacionesController.cs) | 18, 61, 73 | Solo hay endpoints `GET` (listar), `POST marcar-leida/{id}` y `POST marcar-todas`. No existe ningún `DELETE`. |
| [NotificacionesController.cs](api/Controllers/NotificacionesController.cs) | 18-58 | `Listar` devuelve las últimas 30 y nunca excluye las leídas. |

### Comportamiento esperado

El usuario debería poder eliminar una notificación individual y/o vaciar todas, por ejemplo con un botón "🗑️" por ítem y uno de "Borrar todas".

### Solución sugerida (no aplicada)

- Backend: agregar `DELETE api/notificaciones/{id}` y `DELETE api/notificaciones` (o `borrar-todas`), limitados a las notificaciones del usuario y rol autenticado.
- Frontend: añadir los botones de eliminar en `shell.component.ts` y llamar a los nuevos endpoints desde `api.service.ts`, actualizando la lista al terminar.
- Revisar que `marcar-leida/{id}` valide que la notificación pertenezca al usuario, para no afectar las de otros.

---

## ERR-003: Demostración de roles expuesta (riesgo de seguridad)

- **Estado:** Abierto (documentado, sin corregir)
- **Tipo:** Seguridad / exposición de credenciales
- **Módulo:** Pantalla de inicio de sesión y barra superior del portal
- **Roles afectados:** todos

### Qué falla

La aplicación muestra una "Demostración de roles" que permite entrar con un solo clic como Admin, Dirección, Docente, Estudiante o Familia, sin escribir credenciales. Para lograrlo, los usuarios y contraseñas reales están escritos en el código del frontend, de modo que cualquiera puede verlos y usarlos. Esto no debería existir en un sistema con datos de estudiantes, notas y asistencia. Cualquier persona que abra la página puede entrar como Admin Master.

### Dónde ocurre

| Archivo | Línea | Detalle |
| --- | --- | --- |
| [login.component.ts](web/src/app/pages/login.component.ts) | 88-105 | Sección "⚡ Demostración Rápida por Rol" con botones que llaman a `accesoRapido(usuario, clave, rol)` con credenciales escritas en el código. |
| [login.component.ts](web/src/app/pages/login.component.ts) | 233 | Método `accesoRapido`, que inicia sesión automáticamente con esas credenciales. |
| [shell.component.ts](web/src/app/pages/shell.component.ts) | 13-38 | Barra "Demostración de Roles" visible dentro del portal, que permite cambiar de rol en cualquier momento con `cambiarRolRapido(...)`, también con credenciales en el código. |
| [shell.component.ts](web/src/app/pages/shell.component.ts) | 332 | Selector equivalente para la vista móvil. |
| [README.md](README.md) | "Datos de prueba" | Las mismas credenciales están publicadas en la documentación. |

### Comportamiento esperado

- Eliminar los botones de demostración y el cambio rápido de rol de la versión que se use con datos reales.
- No dejar usuarios ni claves escritos en el código del frontend.
- Si se necesita una demo, ofrecerla solo en un entorno de pruebas separado, con datos ficticios, y no en producción.
- Cambiar las claves de prueba actuales, porque ya quedaron expuestas.

---

## ERR-004: Diseño de acceso por categoría de rol en vez de un único inicio de sesión

- **Estado:** Abierto (documentado, sin corregir)
- **Tipo:** Diseño de autenticación / experiencia de usuario
- **Módulo:** Pantalla de inicio de sesión (`/ingreso`) y endpoint `POST api/auth/login`
- **Roles afectados:** todos

### Qué falla

El inicio de sesión obliga al usuario a elegir primero su categoría (Admin, Dirección, Docente, Estudiantes, Familia), y el campo cambia según esa elección: unos piden cédula, otros documento y otros un usuario de texto. Debería existir **un solo inicio de sesión** para todos. Al ingresar, el sistema debería identificar al usuario y mostrar el portal según los **permisos** de su cuenta.

Además, el backend usa el rol que envía el cliente para decidir en qué tabla buscar. Esto deja la separación de roles en manos de la pantalla y no de los permisos de la cuenta.

### Dónde ocurre

| Archivo | Línea | Detalle |
| --- | --- | --- |
| [login.component.ts](web/src/app/pages/login.component.ts) | 28-56 | Selector visual de 5 roles previo al formulario. |
| [login.component.ts](web/src/app/pages/login.component.ts) | 213-231 | `etiquetaUsuario()` y `placeholderUsuario()` cambian según el rol elegido. |
| [login.component.ts](web/src/app/pages/login.component.ts) | 244-250 | `entrar()` envía el rol seleccionado junto al usuario y la clave. |
| [AuthController.cs](api/Controllers/AuthController.cs) | 26-95 | `Login` recibe `Rol` en la petición y busca en una tabla distinta (administradores, profesores, directores, estudiantes o acudientes) según ese valor. |

### Comportamiento esperado

- Un único formulario con usuario/documento y contraseña, sin selector de rol.
- El backend identifica la cuenta y devuelve el rol y los permisos que ya tiene asignados.
- Tras ingresar, el portal muestra solo las vistas y acciones permitidas para ese rol.
- Quien tenga varios roles podría elegir con cuál continuar después de autenticarse.

---

## ERR-005: No se puede editar ni eliminar una observación de convivencia escolar

- **Estado:** Abierto (documentado, sin corregir)
- **Tipo:** Funcionalidad faltante
- **Módulo:** Observador de Convivencia Escolar (`/profesor/convivencia`)
- **Roles afectados:** quienes registran observaciones (Docente y Dirección)

### Qué falla

Si un docente carga mal una anotación (alumno equivocado, tipo de falta incorrecto, error de redacción en los hechos o en el compromiso), **no hay forma de corregirla**. Cada registro solo muestra su contenido y su "ID de Registro", sin botones de **editar** ni **eliminar**. El error queda permanente en el historial del estudiante, aunque estas anotaciones pueden afectar su proceso disciplinario.

### Dónde ocurre

| Archivo | Línea | Detalle |
| --- | --- | --- |
| [convivencia.component.ts](web/src/app/pages/convivencia.component.ts) | 200-240 | Tarjeta de cada observación: solo muestra datos y el "ID de Registro"; no tiene acciones de editar o eliminar. |
| [convivencia.component.ts](web/src/app/pages/convivencia.component.ts) | 27, 83-135 | El formulario solo sirve para crear registros nuevos. |
| [ConvivenciaController.cs](api/Controllers/ConvivenciaController.cs) | 18, 72 | Solo existen `GET` (listar) y `POST` (crear). No hay `PUT`/`PATCH` ni `DELETE`. |

### Comportamiento esperado

- Poder **editar** una observación ya registrada, con restricciones: solo quien la creó o Dirección, dentro de un plazo razonable.
- Poder **anular o eliminar** un registro hecho por error.
- Guardar un historial de cambios (quién modificó, cuándo y qué cambió), porque son registros disciplinarios con valor formal.
- Si la observación ya fue notificada a la familia, avisar la corrección.

### Solución sugerida (no aplicada)

- Backend: agregar `PUT api/convivencia/{id}` y `DELETE api/convivencia/{id}` (o un estado "Anulada"), validando que el usuario sea el autor o Dirección.
- Frontend: añadir los botones "Editar" y "Anular" en la tarjeta y reutilizar el formulario existente para la edición.
- Registrar auditoría de las modificaciones.

---

## ERR-006: Al abrir el formulario de nueva anotación siguen visibles los indicadores y el listado

- **Estado:** Abierto (documentado, sin corregir)
- **Tipo:** Experiencia de usuario / flujo de pantalla
- **Módulo:** Observador de Convivencia Escolar (`/profesor/convivencia`)
- **Roles afectados:** Docente y Dirección

### Qué falla

Al hacer clic en **"➕ Registrar Anotación"**, el formulario aparece **debajo** del panel de indicadores (Total registros, Méritos y felicitaciones, Tipo I, Tipo II y III) y arriba del listado. En pantallas pequeñas el usuario tiene que desplazarse por todas las tarjetas para llegar al formulario. Al registrar una anotación, la atención debería estar solo en el formulario.

### Dónde ocurre

| Archivo | Línea | Detalle |
| --- | --- | --- |
| [convivencia.component.ts](web/src/app/pages/convivencia.component.ts) | 27-29 | El botón alterna `mostrarFormulario`, pero solo cambia su texto. |
| [convivencia.component.ts](web/src/app/pages/convivencia.component.ts) | 41-79 | Bloque de indicadores (`kpi-grid`) sin condición: siempre se muestra. |
| [convivencia.component.ts](web/src/app/pages/convivencia.component.ts) | 82-135 | El formulario se muestra con `@if (mostrarFormulario())`, pero se agrega debajo de los indicadores. |
| [convivencia.component.ts](web/src/app/pages/convivencia.component.ts) | 149-264 | Filtros, buscador, listado y paginación también quedan visibles junto al formulario. |

### Comportamiento esperado

- Al pulsar "Registrar Anotación", ocultar los indicadores, los filtros y el listado, y mostrar **solo el formulario** de nueva anotación.
- Al guardar o pulsar "Cerrar" / "Cancelar", volver a mostrar el panel con indicadores y listado, ya actualizado.

### Solución sugerida (no aplicada)

- Envolver el bloque de indicadores, los filtros y el listado en una condición contraria a `mostrarFormulario()` (por ejemplo `@if (!mostrarFormulario()) { ... }`), de modo que formulario y panel nunca se vean al mismo tiempo.

---

## ERR-007: El selector de estudiante carga y lista a todos los estudiantes, sin búsqueda

- **Estado:** Abierto (documentado, sin corregir)
- **Tipo:** Usabilidad / rendimiento / escalabilidad
- **Módulo:** Observador de Convivencia Escolar, formulario "Registrar Evento en el Observador"
- **Roles afectados:** Docente y Dirección

### Qué falla

El campo **"Estudiante Objeto de la Anotación"** es una lista desplegable (`<select>`) que contiene a **todos los estudiantes** de una sola vez. No hay barra de búsqueda ni filtro. Con pocos estudiantes funciona, pero con cientos o miles (o 100.000) es inutilizable: el usuario tendría que desplazarse uno por uno y la página tendría que descargar y dibujar todos los registros solo para abrir el formulario.

### Dónde ocurre

| Archivo | Línea | Detalle |
| --- | --- | --- |
| [convivencia.component.ts](web/src/app/pages/convivencia.component.ts) | 95-100 | `<select>` con una `<option>` por cada estudiante de `listaEstudiantes()`. |
| [convivencia.component.ts](web/src/app/pages/convivencia.component.ts) | 335-340 | `ngOnInit` llama a `api.estudiantes()` y carga la lista completa al abrir la pantalla, aunque el formulario no se use. |

### Comportamiento esperado

- Reemplazar el desplegable por un **buscador** (autocompletado) por nombre, documento o grupo.
- Consultar al servidor **por demanda** y con **paginación**, devolviendo solo unos pocos resultados (por ejemplo, 10) a medida que se escribe, con un pequeño retraso antes de buscar.
- Al elegir un estudiante, mostrar su nombre, grupo y documento como seleccionado, con la opción de cambiarlo.
- No cargar todos los estudiantes al abrir la pantalla.

### Solución sugerida (no aplicada)

- Backend: agregar un parámetro de búsqueda y de límite al listado de estudiantes (por ejemplo `?q=texto&limite=10`).
- Frontend: sustituir el `<select>` por un campo de texto con lista de resultados, usando una espera (debounce) y cancelando consultas anteriores.

---

## ERR-008: Crear docente — el campo de cédula acepta letras aunque dice "Solo números"

- **Estado:** Abierto (documentado, sin corregir)
- **Tipo:** Validación de entrada
- **Módulo:** Admin → "Registrar Nuevo Docente con Cédula"
- **Roles afectados:** Admin

### Qué falla

El campo "Cédula de Ciudadanía (Usuario de Ingreso)" muestra el texto "Solo números" y usa `inputmode="numeric"`, pero eso solo cambia el teclado en celulares. En computador se pueden escribir letras y símbolos, y el formulario las acepta y las envía. No hay validación de formato.

### Dónde ocurre

| Archivo | Línea | Detalle |
| --- | --- | --- |
| [admin.component.ts](web/src/app/pages/admin.component.ts) | 940 | Input de la cédula: solo `inputmode="numeric"`, sin `pattern` ni filtro de caracteres. |
| [admin.component.ts](web/src/app/pages/admin.component.ts) | 1774 | Se usa `this.docUsuario.trim()` sin comprobar que sean solo dígitos. |

### Comportamiento esperado

La cédula debe aceptar **solo dígitos**: filtrar los demás caracteres al escribir, validar antes de enviar y mostrar un mensaje claro como "La cédula solo debe contener números".

### Solución sugerida (no aplicada)

- Agregar `pattern="[0-9]*"` y filtrar los caracteres no numéricos mientras se escribe.
- Validar en el frontend antes de crear el docente y también en el backend.

---

## ERR-009: Mensajes de error genéricos y campos obligatorios sin asterisco

- **Estado:** Abierto (documentado, sin corregir)
- **Tipo:** Validación de formulario / usabilidad
- **Módulo:** Admin → "Registrar Nuevo Docente con Cédula" (el mismo patrón se repite en otros formularios)
- **Roles afectados:** Admin

### Qué falla

1. **El mensaje de error es genérico.** Si se llena solo la cédula y se deja vacío el nombre, aparece "Datos Incompletos: Nombre y cédula de ciudadanía son obligatorios". El mensaje nombra ambos campos aunque solo falte uno, así que no dice qué falta realmente.
2. **No se marcan los campos obligatorios.** Las etiquetas "Nombre y Apellidos Completos" y "Cédula de Ciudadanía" no tienen asterisco (`*`) que indique que son obligatorios.

### Dónde ocurre

| Archivo | Línea | Detalle |
| --- | --- | --- |
| [admin.component.ts](web/src/app/pages/admin.component.ts) | 936, 939 | Etiquetas y inputs de nombre y cédula, sin asterisco. |
| [admin.component.ts](web/src/app/pages/admin.component.ts) | 1774-1777 | Validación: un solo `if` para ambos campos y un único mensaje genérico. |

El mismo mensaje genérico se repite en otros formularios del mismo archivo (líneas 1678, 1830, 1902, 1968 y 2048: "Nombre y documento son obligatorios", "Nombre y usuario son obligatorios", etc.).

### Comportamiento esperado

- Los mensajes deben decir **exactamente qué falta**, por ejemplo "Falta el nombre completo" o "Falta la cédula".
- Los campos obligatorios deben llevar **asterisco (\*)** en la etiqueta y resaltarse cuando estén vacíos o incorrectos.

### Solución sugerida (no aplicada)

- Validar cada campo por separado y mostrar el mensaje específico, idealmente debajo del campo correspondiente.
- Añadir `*` a las etiquetas de los campos obligatorios en este y en los demás formularios con el mismo patrón.

