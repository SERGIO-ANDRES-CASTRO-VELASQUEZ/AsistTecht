#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE RECUPERACIÓN ANTE DESASTRES (DISASTER RECOVERY) — ASISTECHT
# Proyecto de Aula: Infraestructura y Servidor Central Ubuntu
# ==============================================================================

set -euo pipefail

DESTINO="/var/backups/empresa"
BACKUP_A_RESTAURAR="${1:-$DESTINO/backup_latest.tar.gz}"

if [ ! -f "$BACKUP_A_RESTAURAR" ]; then
    echo "❌ Error: El archivo de backup no existe: $BACKUP_A_RESTAURAR"
    echo "Uso: sudo $0 [/ruta/al/backup.tar.gz]"
    exit 1
fi

echo "=================================================="
echo " [RESTORE] Iniciando Recuperación Ante Desastres"
echo " Archivo fuente: $BACKUP_A_RESTAURAR"
echo "=================================================="

# 1. Descomprimir contenedor maestro en carpeta temporal
DIR_TEMP=$(mktemp -d)
tar -xzf "$BACKUP_A_RESTAURAR" -C "$DIR_TEMP"

# 2. Restaurar archivos empresariales (/srv/empresa)
ARCHIVO_SRV=$(ls "$DIR_TEMP"/archivos_empresa_*.tar.gz 2>/dev/null | head -n 1 || true)
if [ -n "$ARCHIVO_SRV" ] && [ -f "$ARCHIVO_SRV" ]; then
    echo "[1/2] Restaurando estructura y archivos en /srv/empresa..."
    tar -xzf "$ARCHIVO_SRV" -C /
    echo "✔ Archivos de /srv/empresa restaurados con permisos originales."
else
    echo "⚠ No se encontró archivo de datos empresariales en el paquete."
fi

# 3. Restaurar Base de Datos PostgreSQL si aplica
ARCHIVO_SQL=$(ls "$DIR_TEMP"/db_asisqr_*.sql.gz 2>/dev/null | head -n 1 || true)
if [ -n "$ARCHIVO_SQL" ] && [ -f "$ARCHIVO_SQL" ]; then
    if docker ps --format '{{.Names}}' | grep -q "asisttecht-db-1"; then
        echo "[2/2] Restaurando Base de Datos PostgreSQL (asisqr)..."
        gunzip -c "$ARCHIVO_SQL" | docker exec -i asisttecht-db-1 psql -U asisqr -d asisqr
        echo "✔ Base de datos PostgreSQL restaurada correctamente."
    else
        echo "[2/2] Contenedor de base de datos no está encendido; se omite restore SQL."
    fi
fi

# Limpieza
rm -rf "$DIR_TEMP"

# Notificación a syslog
logger -t RESTORE_EMPRESARIAL "Recuperacion de desastres completada con exito desde: $BACKUP_A_RESTAURAR"

echo "=================================================="
echo "✔ Recuperación completada satisfactoriamente."
echo "=================================================="
