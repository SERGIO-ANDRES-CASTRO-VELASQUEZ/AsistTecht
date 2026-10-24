# Correr AsisQR en otro computador

En el otro equipo no hace falta instalar .NET ni Angular. Docker construye la aplicación. Hay que llevar la carpeta completa `AsisQR` y tener Docker en marcha.

## 1. Instalar Docker en el otro PC

Elige el sistema de ese computador:

- **Windows:** instala [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/). Al terminar, ábrelo y espera a que diga que está en ejecución. Si Windows pide reiniciar o activar WSL, acepta.
- **macOS:** instala [Docker Desktop para Mac](https://docs.docker.com/desktop/setup/install/mac-install/) y ábrelo hasta que esté en ejecución.
- **Linux:** instala Docker Engine y el complemento Compose. En Ubuntu o Debian:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
```

Cierra la sesión y vuelve a entrar para que el grupo `docker` quede activo. Comprueba con:

```bash
docker compose version
```

Tiene que mostrar un número de versión, sin pedir permisos de administrador.

## 2. Llevar la carpeta

Copia toda la carpeta `AsisQR`. Tiene que incluir `docker-compose.yml`, `api`, `web`, `deploy` y esta guía. No copies solo un archivo suelto.

Desde el computador donde ya está el proyecto, puedes armar un comprimido:

```bash
cd /home/quind/Descargas
tar -czf AsisQR.tar.gz AsisQR
```

Pasa `AsisQR.tar.gz` con una memoria USB, Drive o un correo. En el otro PC descomprímelo. En Linux o Mac:

```bash
tar -xzf AsisQR.tar.gz
cd AsisQR
```

En Windows, clic derecho sobre el `.tar.gz` y extrae. Luego abre **PowerShell** o **Terminal** dentro de la carpeta `AsisQR`. La ruta se ve en la barra del explorador. Un ejemplo:

```powershell
cd C:\Users\TuUsuario\Descargas\AsisQR
```

## 3. Arrancar

Dentro de `AsisQR`:

```bash
docker compose up --build
```

La primera vez descarga imágenes y compila. Puede tardar varios minutos y la pantalla se llena de texto. Cuando deje de avanzar y se vean los servicios en marcha, ya está listo. Deja esa ventana abierta: si la cierras, el sistema se detiene.

Para dejarlo corriendo en segundo plano y recuperar la terminal:

```bash
docker compose up --build -d
```

## 4. Abrirlo

En **ese mismo computador**, en Chrome o Edge:

http://localhost:8080

Entra con los datos de prueba:

| Quién | Ingreso | Clave |
| --- | --- | --- |
| Profesor | profesor | AsisQR2026 |
| Estudiante | 1000000001 | Estudiante2026 |
| Estudiante | 1000000002 | Estudiante2026 |

Ya existen la materia Matemáticas, el grupo 10A y esos dos estudiantes. Cambia las claves en la pantalla **Clave** antes de usarlo en el colegio.

## 5. Usar el celular o la tableta en la misma red

El celular y el computador tienen que estar en el mismo Wi‑Fi. La cámara del celular no funciona con `http://`. Usa la dirección segura.

1. Averigua la IP del computador donde corre Docker.
   - Linux: `hostname -I` y toma el primer número, por ejemplo `192.168.1.20`.
   - Windows, en PowerShell: `ipconfig` y busca la **Dirección IPv4** del Wi‑Fi.
   - Mac: `ipconfig getifaddr en0`
2. En el celular abre Chrome y entra a `https://192.168.1.20:8443`, cambiando la IP por la real.
3. El navegador avisará que el certificado no es de una autoridad conocida. Es el certificado local de este proyecto. Entra de todos modos (Avanzado → Continuar).
4. Cuando la página pida la cámara, permite el acceso.

Si después de aceptar el aviso la cámara sigue bloqueada, instala el certificado en el teléfono:

```bash
docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt ./asisqr-local.crt
```

Pasa `asisqr-local.crt` al celular e instálalo como certificado de confianza. En Android suele estar en Ajustes → Seguridad → Instalar certificado. Luego vuelve a abrir `https://IP:8443`.

En el computador donde corre Docker, la cámara de la clase se usa en http://localhost:8080. Ahí no hace falta el certificado.

## 6. Si Windows o el antivirus bloquean la red

La tableta no va a entrar si el firewall cierra los puertos. En Windows, la primera vez que Docker publique puertos, permite el acceso en redes **privadas**. Si no pregunta, abre el Firewall de Windows y permite las entradas **8080** y **8443** para redes privadas.

El computador y el celular tienen que verse entre sí. Un Wi‑Fi de invitados que aísla los equipos impide la conexión.

## 7. Parar y volver a abrir

Para detenerlo sin borrar materias, estudiantes ni asistencias:

```bash
docker compose down
```

Otro día, en la misma carpeta:

```bash
docker compose up -d
```

La segunda vez es más rápida porque ya no tiene que compilar.

Esto borra la base y los certificados locales. Úsalo solo si quieres dejar el sistema como recién instalado, con los datos de prueba otra vez:

```bash
docker compose down -v
docker compose up --build -d
```

## 8. Si algo falla

- `docker: command not found` o Docker no responde: abre Docker Desktop y espera a que esté en ejecución. En Linux, revisa que tu usuario esté en el grupo `docker`.
- El puerto 8080 o 8443 ya está ocupado: cierra el otro programa que lo use, o cambia en `docker-compose.yml` la parte izquierda de `"8080:80"` y `"8443:443"` por otros números libres, por ejemplo `"8090:80"` y `"8444:443"`. Luego entra por esos números.
- La página no abre en el celular: confirma que la IP es la del Wi‑Fi, que usas `https` y el puerto `8443`, y que el firewall dejó pasar ese puerto.
- La cámara no aparece en Firefox del celular: usa Chrome. En Firefox la cámara puede quedar abierta, pero los QR se leen de uno en uno.
