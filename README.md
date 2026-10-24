# AsisTecht

Sistema web de asistencia para el Gimnasio José Eustasio Rivera. El director crea a los profesores. El docente registra materias, grupos y estudiantes. Cada estudiante descarga un QR que solo contiene un identificador opaco y, si guarda su rostro, también puede ser reconocido en clase. La cámara permanece abierta. Si el mismo estudiante sigue a la vista, encima aparece el nombre y si ya estaba marcado. Las planillas de asistencia y de notas se editan como una hoja.

La aplicación corre en el navegador, así que sirve en el computador y en el celular. En la red local se abre por HTTP en el equipo donde está Docker y por HTTPS en los demás dispositivos de esa red. Las mismas imágenes se pueden llevar después a un servidor.

## Qué hay que tener

- Docker y Docker Compose.
- En el celular, Chrome. La lectura de varios QR en el mismo cuadro usa el detector del navegador, disponible en Chrome y Edge. En Firefox la cámara sigue abierta y los códigos se leen de uno en uno.

Para llevarlo a otro computador, sigue [GUIA-OTRO-PC.md](GUIA-OTRO-PC.md).

## Arrancar

En esta carpeta:

```bash
docker compose up --build
```

La primera vez descarga las imágenes y compila la API y Angular. Puede tardar varios minutos.

- En el mismo computador: http://localhost:8080
- En un celular de la misma red: https://IP-DEL-COMPUTADOR:8443

La cámara del celular solo funciona por HTTPS. La primera vez el navegador advierte que el certificado es local. Hay que aceptarlo. Si después de aceptarlo la cámara sigue bloqueada, exporta la autoridad de Caddy e instálala en el teléfono:

```bash
docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt ./asisqr-local.crt
```

La IP del computador se ve con `hostname -I`.

## Datos de prueba

| Rol | Ingreso | Clave |
| --- | --- | --- |
| Dirección | director | AsisTecht2026 |
| Profesor | profesor | AsisQR2026 |
| Estudiante | 1000000001 | Estudiante2026 |
| Estudiante | 1000000002 | Estudiante2026 |

Ya existen la materia Matemáticas, el grupo 10A y esos dos estudiantes. Conviene cambiar las claves desde la pantalla Clave antes de usarlo en el colegio.

## Cómo se usa

1. La dirección entra y crea las cuentas de los profesores.
2. El profesor crea materias y grupos, y marca qué materias ve cada grupo. Varios profesores pueden dictar materias distintas al mismo grupo.
3. Registra a cada estudiante con documento, nombre, clave y grupo. Ahí se crea el QR.
4. El estudiante, o el profesor desde la ficha, guarda la foto y las cinco poses del rostro. Con eso se descarga el carnet.
5. El profesor abre Clase, elige materia y grupo, y deja la cámara en QR o en Rostro.
6. Cada marca queda una sola vez. El globo dice «Asistencia anotada» o «Ya estaba anotado». En Planillas se corrige a mano y se cargan las notas.

El historial guarda la clase por materia, grupo y fecha, en hora de Colombia.

## Subir a un servidor de pruebas

El mismo `docker compose` sirve en un VPS. Para que el celular abra la cámara sin instalar certificados, ese servidor necesita un dominio y HTTPS público. En ese caso se cambia el bloque `:443` del `deploy/Caddyfile` por el dominio, se quita `tls internal` y Caddy pide el certificado solo. La clave JWT del compose hay que reemplazarla por otra larga antes de salir de la red local.
