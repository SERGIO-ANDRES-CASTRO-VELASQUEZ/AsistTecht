#!/usr/bin/env bash
# ==============================================================================
# SCRIPT MAESTRO DE CONFIGURACIÓN AUTOMATIZADA — UBUNTU SERVER CENTRAL
# Proyecto de Aula: Infraestructura, Seguridad, Control de Acceso y Auditoría
# Gimnasio José Eustasio Rivera / AsisTecht
# ==============================================================================

set -euo pipefail

# Comprobar privilegios de superusuario (root)
if [ "$(id -u)" -ne 0 ]; then
    echo "❌ Error: Este script debe ejecutarse con permisos de superusuario (sudo)."
    exit 1
fi

echo "======================================================================"
echo "   INICIANDO CONFIGURACIÓN DE INFRAESTRUCTURA Y SERVIDOR CENTRAL     "
echo "                      GIMNASIO JOSÉ EUSTASIO RIVERA                   "
echo "======================================================================"

# 1. Actualización e Instalación de Paquetes Esenciales
echo -e "\n[1/7] Actualizando repositorios e instalando herramientas del servidor..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl \
    git \
    ufw \
    fail2ban \
    auditd \
    audispd-plugins \
    openssh-server \
    rsync \
    htop \
    net-tools \
    ca-certificates

# 2. Creación de Grupos y Usuarios Institucionales
echo -e "\n[2/7] Creando grupos y cuentas de usuario empresariales..."

# Crear grupos si no existen
groupadd -f grp_ventas
groupadd -f grp_contabilidad
groupadd -f grp_auditoria

# Crear usuario u_ventas
if ! id "u_ventas" &>/dev/null; then
    useradd -m -s /bin/bash -g grp_ventas -c "Ejecutivo de Ventas" u_ventas
    echo "u_ventas:Ventas2026*" | chpasswd
    echo "✔ Usuario 'u_ventas' creado (Clave: Ventas2026*)"
fi

# Crear usuario u_conta
if ! id "u_conta" &>/dev/null; then
    useradd -m -s /bin/bash -g grp_contabilidad -c "Contador General" u_conta
    echo "u_conta:Conta2026*" | chpasswd
    echo "✔ Usuario 'u_conta' creado (Clave: Conta2026*)"
fi

# Crear usuario u_auditor
if ! id "u_auditor" &>/dev/null; then
    useradd -m -s /bin/bash -g grp_auditoria -c "Auditor de Seguridad" u_auditor
    echo "u_auditor:Auditor2026*" | chpasswd
    echo "✔ Usuario 'u_auditor' creado (Clave: Auditor2026*)"
fi

# 3. Creación y Blindaje de Estructura de Archivos (/srv/empresa)
echo -e "\n[3/7] Configurando estructura de directorios y permisos estrictos (DAC)..."

mkdir -p /srv/empresa/ventas
mkdir -p /srv/empresa/contabilidad
mkdir -p /srv/empresa/datos_criticos

# Permisos para Ventas (770: solo root y miembros de grp_ventas)
chown -R root:grp_ventas /srv/empresa/ventas
chmod -R 770 /srv/empresa/ventas
chmod g+s /srv/empresa/ventas # SGID para que nuevos archivos hereden el grupo

# Permisos para Contabilidad (770: solo root y miembros de grp_contabilidad)
chown -R root:grp_contabilidad /srv/empresa/contabilidad
chmod -R 770 /srv/empresa/contabilidad
chmod g+s /srv/empresa/contabilidad

# Permisos para Datos Críticos Empresariales (para prueba de continuidad)
chown -R root:root /srv/empresa/datos_criticos
chmod -R 750 /srv/empresa/datos_criticos

# Crear archivos de prueba empresariales
cat << 'EOF' > /srv/empresa/contabilidad/estados_financieros_confidenciales.csv
Cuenta,Descripcion,Saldo_COP
1105,Caja General,45000000
1305,Cuentas por Cobrar Matriculas,18500000
2105,Obligaciones Financieras Banco,12000000
EOF

cat << 'EOF' > /srv/empresa/contabilidad/nomina_docentes_rectoria.csv
Documento,Docente,Asignacion_Mensual
1075283910,Lic. Carlos Restrepo,3800000
1075283911,Lic. Claudia Torres,3800000
1075283912,Lic. Martha Gomez,3800000
EOF

cat << 'EOF' > /srv/empresa/ventas/prospectos_matriculas_2026.csv
Id,Familia,Telefono,Grado_Interes
1,Familia Gonzalez,3154892211,Grado 10A
2,Familia Ramirez,3167593706,Grado 11A
EOF

cat << 'EOF' > /srv/empresa/datos_criticos/matriculas_oficiales_GIR_2026.csv
ID_Matricula,Estudiante,Grado,Estado
MAT-2026-001,Valentina Ospina,10A,ACTIVO
MAT-2026-002,Brayan Estiwen,10A,ACTIVO
MAT-2026-003,Miguel Angel Ramirez,10A,ACTIVO
EOF

echo "✔ Archivos empresariales creados con permisos restrictivos."

# 4. Configuración del Subsistema de Auditoría (auditd)
echo -e "\n[4/7] Configurando reglas del demonio de auditoría (auditd)..."
systemctl enable auditd
systemctl start auditd

# Regla para vigilar accesos a los libros contables
auditctl -W /srv/empresa/contabilidad -k auditoria_contabilidad 2>/dev/null || true
auditctl -w /srv/empresa/contabilidad -p warx -k auditoria_contabilidad

# Regla para vigilar accesos a contraseñas e identidades
auditctl -w /etc/shadow -p wa -k auditoria_seguridad_shadow 2>/dev/null || true

# Persistir reglas en archivo de configuración
cat << 'EOF' > /etc/audit/rules.d/asisttecht-audit.rules
-w /srv/empresa/contabilidad -p warx -k auditoria_contabilidad
-w /etc/shadow -p wa -k auditoria_seguridad_shadow
EOF

echo "✔ Reglas de auditoría cargadas y persistidas en /etc/audit/rules.d/."

# 5. Configuración de Seguridad Perimetral e Intrusión (UFW y Fail2ban)
echo -e "\n[5/7] Configurando cortafuegos (UFW) y prevención de intrusión (Fail2ban)..."

# Configurar UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH Administracion'
ufw allow 8080/tcp comment 'AsisTecht Web HTTP'
ufw allow 8443/tcp comment 'AsisTecht Web HTTPS Camara'
ufw --force enable

# Configurar Fail2ban para proteger SSH
cat << 'EOF' > /etc/fail2ban/jail.local
[DEFAULT]
bantime = 10m
findtime = 10m
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl restart fail2ban
systemctl enable fail2ban

echo "✔ Cortafuegos UFW activo y Fail2ban protegiendo puerto SSH (3 reintentos máx)."

# 6. Despliegue de Scripts de Backup y Restore Automatizados
echo -e "\n[6/7] Instalando scripts de continuidad operativa y copias de seguridad..."

mkdir -p /opt/scripts
mkdir -p /var/backups/empresa

# Copiar scripts desde el repositorio al sistema
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/backup_empresarial.sh" /opt/scripts/backup_empresarial.sh
cp "$SCRIPT_DIR/restore_empresarial.sh" /opt/scripts/restore_empresarial.sh
chmod +x /opt/scripts/backup_empresarial.sh
chmod +x /opt/scripts/restore_empresarial.sh

# Programar Backup diario en cron a las 02:00 AM
cat << 'EOF' > /etc/cron.d/backup_empresa_cron
0 2 * * * root /opt/scripts/backup_empresarial.sh > /var/log/backup_empresa.log 2>&1
EOF
chmod 644 /etc/cron.d/backup_empresa_cron

# Ejecutar el primer backup de inicio para tenerlo listo para la sustentación
/opt/scripts/backup_empresarial.sh

echo "✔ Scripts instalados en /opt/scripts/ y primer respaldo generado."

# 7. Resumen de Direccionamiento de Red y Estado
IP_SERVER=$(hostname -I | awk '{print $1}')
echo -e "\n======================================================================"
echo "    ✔ INSTALACIÓN Y BLINDAJE DE INFRAESTRUCTURA COMPLETADO            "
echo "======================================================================"
echo "IP del Servidor Ubuntu: $IP_SERVER"
echo "Servicios activos:"
echo " - SSH:                puerto 22 (Protegido por Fail2ban)"
echo " - AsisTecht HTTP:     http://$IP_SERVER:8080"
echo " - AsisTecht HTTPS:    https://$IP_SERVER:8443 (Camara activa)"
echo " - Copia de seguridad: /var/backups/empresa/backup_latest.tar.gz"
echo " - Usuarios de prueba: u_ventas (Ventas2026*), u_conta (Conta2026*)"
echo "======================================================================"
