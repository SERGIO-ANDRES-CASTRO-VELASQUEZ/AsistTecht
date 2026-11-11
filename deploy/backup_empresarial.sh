#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE COPIA DE SEGURIDAD EMPRESARIAL Y BASE DE DATOS — ASISTECHT
# Proyecto de Aula: Infraestructura y Servidor Central Ubuntu
# ==============================================================================

set -euo pipefail

DESTINO="/var/backups/empresa"
FECHA=$(date +"%Y%m%d_%H%M%S")
ARCHIVO_BACKUP="$DESTINO/backup_empresarial_$FECHA.tar.gz"
LATEST="$DESTINO/backup_latest.tar.gz"

echo "=================================================="
echo " [BACKUP] Iniciando Copia de Seguridad: $FECHA"
echo "=================================================="

# Crear directorio de respaldos si no existe
mkdir -p "$DESTINO"

# 1. Respaldo de Archivos Empresariales Críticos
echo "[1/3] Empaquetando archivos empresariales de /srv/empresa..."
tar -czf "$DESTINO/archivos_empresa_$FECHA.tar.gz" -C / srv/empresa

# 2. Respaldo de Base de Datos PostgreSQL si el contenedor de Docker está activo
if docker ps --format '{{.Names}}' | grep -q "asisttecht-db-1"; then
    echo "[2/3] Exportando Base de Datos PostgreSQL (asisqr)..."
    docker exec asisttecht-db-1 pg_dump -U asisqr asisqr | gzip > "$DESTINO/db_asisqr_$FECHA.sql.gz"
else
    echo "[2/3] Contenedor asisttecht-db-1 no detectado en este momento (omitiendo pg_dump)..."
fi

# 3. Consolidar en archivo maestro y actualizar enlace latest
echo "[3/3] Consolidando copia de seguridad maestra..."
tar -czf "$ARCHIVO_BACKUP" -C "$DESTINO" \
    $(basename "$DESTINO/archivos_empresa_$FECHA.tar.gz") \
    $(ls "$DESTINO/db_asisqr_$FECHA.sql.gz" 2>/dev/null | xargs -n1 basename || true)

cp -f "$ARCHIVO_BACKUP" "$LATEST"

# Registrar en log del sistema (para auditoría e incidentes)
logger -t BACKUP_EMPRESARIAL "Copia de seguridad completada con exito: $ARCHIVO_BACKUP"

echo "=================================================="
echo "✔ Backup completado con éxito:"
echo "  Ruta: $ARCHIVO_BACKUP"
echo "  Enlace rápido: $LATEST"
echo "=================================================="
