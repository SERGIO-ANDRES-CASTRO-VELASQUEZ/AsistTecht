# Guía Maestra de Infraestructura, Ejecución y Demostración Práctica
## Proyecto de Aula: Servidor Central Ubuntu Server — Gimnasio José Eustasio Rivera / AsisTecht

Este documento proporciona el paso a paso exacto para montar la infraestructura requerida, respaldar el proyecto sin riesgo de pérdida de datos y ejecutar con éxito las **4 pruebas prácticas obligatorias** que exige la rúbrica de evaluación docente.

---

## 1. Copia de Seguridad y Blindaje del Proyecto Existente (Completado)

Para garantizar que ningún cambio o manipulación dañe el código y las bases de datos desarrolladas:
1. Se ha generado un **Git Bundle Criptográfico Completo** con el 100% del historial, ramas y archivos en la carpeta:
   ```text
   C:\Users\Migue\OneDrive\Documentos\Proyecto De Aula\Backups_Seguridad_Proyecto\AsistTecht_Completo_20261111.bundle
   ```
2. Si alguna vez necesitas restaurar el proyecto completo en una carpeta nueva o en otra máquina, solo ejecutas:
   ```bash
   git clone AsistTecht_Completo_20261111.bundle AsistTecht_Restaurado
   ```

---

## 2. Arquitectura de Infraestructura Diseñada

```
 ┌──────────────────────────────────────────────────────────────┐
 │                      RED LOCAL (LAN / WIFI)                  │
 │                      Rango: ej. 192.168.1.0/24               │
 └──────────────┬───────────────────────────────┬───────────────┘
                │                               │
 ┌──────────────▼─────────────┐   ┌─────────────▼───────────────┐
 │       EQUIPO CLIENTE       │   │    SERVIDOR CENTRAL UBUNTU  │
 │  (Windows Host / Celular)  │   │     (Ubuntu Server 24.04)   │
 │                            │   │                             │
 │ • Navegador Web (8080/8443)│   │ • OpenSSH Server (Puerto 22)│
 │ • Cliente SSH (PowerShell) │   │ • Cortafuegos UFW Activo    │
 │ • App Móvil APK Android    │   │ • Prevención Fail2ban       │
 └────────────────────────────┘   │ • Auditoría kernel auditd   │
                                  │ • Control DAC (Ventas/Conta)│
                                  │ • Backups & Disaster Recov. │
                                  │ • AsisTecht (Docker Stack)  │
                                  └─────────────────────────────┘
```

---

## 3. Preparación de la Máquina Virtual Ubuntu Server

1. **Creación de la VM en VirtualBox / VMware:**
   * **SO:** Ubuntu Server 24.04 LTS (o 22.04 LTS).
   * **Memoria RAM:** Mínimo 2 GB (recomendado 3 o 4 GB).
   * **Disco:** 25 GB dinámico.
   * **Configuración de Red (CRÍTICO):** En la configuración de la VM en VirtualBox, en la sección **Red (Network)**, selecciona:
     * **Conectado a:** **Adaptador Puente (Bridged Adapter)**.
     * Esto permite que el Ubuntu Server obtenga su propia dirección IP en la red local y sea accesible desde tu computador y desde el celular.

2. **Copiar el Proyecto al Servidor Ubuntu:**
   Desde tu computador Windows (en PowerShell), envía la carpeta del proyecto al servidor mediante `scp` o clónalo con git:
   ```powershell
   # Desde Windows (reemplaza IP_UBUNTU por la IP de tu VM, ej. 192.168.1.50):
   scp -r "c:\Users\Migue\OneDrive\Documentos\Proyecto De Aula\AsistTecht" usuario@IP_UBUNTU:~/
   ```

3. **Ejecutar el Script Automatizado de Infraestructura:**
   Inicia sesión por SSH o terminal en Ubuntu Server y ejecuta:
   ```bash
   cd ~/AsistTecht/deploy
   chmod +x setup_infraestructura_ubuntu.sh backup_empresarial.sh restore_empresarial.sh
   sudo ./setup_infraestructura_ubuntu.sh
   ```
   *El script configurará en 2 minutos: usuarios, grupos, cortafuegos UFW, fail2ban, auditd, carpetas empresariales seguras y la rutina de copias de seguridad.*

4. **Levantar el Sistema AsisTecht en el Servidor Ubuntu:**
   ```bash
   cd ~/AsistTecht
   sudo docker compose up -d
   ```

---

## 4. Guión de Ejecución para las 4 Pruebas Obligatorias ante el Docente

Aquí tienes el procedimiento exacto y los comandos que debes teclear frente al evaluador para demostrar el funcionamiento real de cada requerimiento.

---

### PRUEBA 1: SEGURIDAD (Identificar un Evento Sospechoso en los Registros)

> **Objetivo:** Demostrar que el servidor detecta intentos de intrusión/ataque y los bloquea automáticamente.

1. **En la pantalla del Ubuntu Server (Terminal 1):**
   Pon a monitorear los registros de autenticación del sistema en vivo:
   ```bash
   sudo tail -f /var/log/auth.log
   ```
2. **Desde el Equipo Cliente (Computador Windows o Terminal 2):**
   Simula un ataque de fuerza bruta conectándote por SSH con contraseñas falsas o usuario inexistente:
   ```powershell
   ssh hacker@IP_DEL_SERVIDOR
   # Escribe cualquier clave incorrecta 3 veces
   ```
3. **Qué mostrarle al profesor:**
   * En la **Terminal 1**, muéstrale cómo aparece el evento sospechoso registrado:
     ```text
     sshd[...]: Failed password for invalid user hacker from 192.168.1.X port ... ssh2
     ```
   * Ahora muestra que el sistema de mitigación activa (**Fail2ban**) detectó y bloqueó al atacante:
     ```bash
     sudo fail2ban-client status sshd
     ```
   * **Resultado observado:** Aparece la IP del cliente en la lista: `Banned IP list: 192.168.1.X`. Si el cliente intenta conectarse de nuevo, la conexión será rechazada de inmediato.

---

### PRUEBA 2: CONTINUIDAD (Recuperar Archivo Empresarial desde Copia de Seguridad)

> **Objetivo:** Demostrar recuperación ante desastres (Disaster Recovery) tras la pérdida accidental o maliciosa de información crítica.

1. **Mostrar el archivo empresarial original:**
   ```bash
   ls -la /srv/empresa/datos_criticos/
   cat /srv/empresa/datos_criticos/matriculas_oficiales_GIR_2026.csv
   ```
   *(Muestra que el archivo existe y contiene las matrículas de los estudiantes)*.

2. **Simular el desastre (Borrado de archivo crítico):**
   ```bash
   sudo rm /srv/empresa/datos_criticos/matriculas_oficiales_GIR_2026.csv
   ls -la /srv/empresa/datos_criticos/
   ```
   *(El directorio aparece vacío. Ocurrió la pérdida de información)*.

3. **Ejecutar la recuperación en vivo:**
   ```bash
   sudo /opt/scripts/restore_empresarial.sh
   ```
   *El script procesará automáticamente el respaldo maestro `/var/backups/empresa/backup_latest.tar.gz`.*

4. **Qué mostrarle al profesor:**
   ```bash
   ls -la /srv/empresa/datos_criticos/
   cat /srv/empresa/datos_criticos/matriculas_oficiales_GIR_2026.csv
   ```
   *El archivo y su contenido se recuperaron 100% íntegros con sus permisos de sistema originales.*

---

### PRUEBA 3: CONTROL DE ACCESO (Ventas no puede entrar a Contabilidad)

> **Objetivo:** Demostrar la gestión de identidades, grupos y permisos de acceso del sistema de archivos (DAC).

1. **Mostrar la estructura y los permisos establecidos:**
   ```bash
   ls -ld /srv/empresa/ventas
   ls -ld /srv/empresa/contabilidad
   ```
   *Observarás que `/srv/empresa/ventas` pertenece a `root:grp_ventas` con permisos `770` (`rwxrwx---`), y `/srv/empresa/contabilidad` a `root:grp_contabilidad` con permisos `770` (`rwxrwx---`).*

2. **Ingresar como usuario de Ventas (`u_ventas`):**
   ```bash
   su - u_ventas
   ```
3. **Probar acceso a su propia área (Permitido):**
   ```bash
   cd /srv/empresa/ventas
   ls -la
   echo "Reporte de ventas hoy" > prueba_ventas.txt
   ```
   *(Opera con normalidad porque pertenece al grupo `grp_ventas`)*.

4. **Intentar vulnerar el área de Contabilidad (Denegado):**
   ```bash
   cd /srv/empresa/contabilidad
   ```
   **Resultado en pantalla:**
   ```text
   bash: cd: /srv/empresa/contabilidad: Permission denied
   ```
5. **Salir y probar lo contrario con Contabilidad:**
   ```bash
   exit
   su - u_conta
   cd /srv/empresa/contabilidad   # -> PERMITIDO
   cd /srv/empresa/ventas         # -> bash: cd: /srv/empresa/ventas: Permission denied
   exit
   ```
   *Demostración contundente de segregación de funciones y aislamiento de datos confidenciales.*

---

### PRUEBA 4: AUDITORÍA (Mostrar Registros de Actividades Relevantes de un Usuario)

> **Objetivo:** Demostrar trazabilidad legal y forense mediante el subsistema de auditoría del kernel Linux (`auditd`).

1. **Realizar una acción relevante en el área auditada:**
   Como usuario de contabilidad o administrador, modifica un archivo sensible:
   ```bash
   su - u_conta
   echo "Ajuste presupuestal no autorizado" >> /srv/empresa/contabilidad/estados_financieros_confidenciales.csv
   exit
   ```

2. **Consultar la auditoría forense con `ausearch`:**
   ```bash
   sudo ausearch -k auditoria_contabilidad --format text
   ```
   *El sistema desplegará el registro exacto donde consta:*
   * **Fecha y Hora exacta.**
   * **Usuario que ejecutó la acción:** `uid=1001(u_conta)`.
   * **Comando o binario utilizado:** `comm="bash"` o `comm="nano"`.
   * **Archivo afectado:** `/srv/empresa/contabilidad/estados_financieros_confidenciales.csv`.
   * **Resultado de la operación:** `success=yes`.

3. **Generar un Informe Consolidado de Auditoría con `aureport`:**
   ```bash
   sudo aureport -f -i
   ```
   *Genera una tabla formal de auditoría de modificaciones de archivos perfecta para anexar al informe o proyectar en clase.*

---

## 5. Resumen de Usuarios y Claves de Demostración

| Usuario | Clave | Grupo Primario | Directorio Autorizado |
| :--- | :--- | :--- | :--- |
| **`u_ventas`** | `Ventas2026*` | `grp_ventas` | `/srv/empresa/ventas` |
| **`u_conta`** | `Conta2026*` | `grp_contabilidad` | `/srv/empresa/contabilidad` |
| **`u_auditor`** | `Auditor2026*` | `grp_auditoria` | Informes de auditoría (`auditd`) |
| **`root` / `admin`** | Clave del servidor | `root` / `sudo` | Control total del servidor |

---

## 6. Verificación del Sistema AsisTecht Funcionando en el Servidor

Desde cualquier equipo cliente en la misma red local (computador o celular):
* **Web HTTP:** `http://IP_DEL_SERVIDOR_UBUNTU:8080`
* **Web HTTPS (Cámara activa):** `https://IP_DEL_SERVIDOR_UBUNTU:8443`
* **Credenciales del Sistema Escolar:**
  * Administrador: `admin` / `Admin2026*`
  * Director: `director` / `AsisTecht2026`
  * Docente: `carlos.restrepo` / `Profesor2026*`
