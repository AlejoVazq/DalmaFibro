#!/usr/bin/env bash
# Backup diario de Gestión Dalmata: base de datos + mockups subidos.
# Uso: scripts/backup.sh            (desde la carpeta del proyecto)
# Cron (03:00 todos los días):
#   0 3 * * * cd /opt/gestiond && ./scripts/backup.sh >> /var/log/gestiond-backup.log 2>&1
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/gestiond}"
KEEP_DAYS="${KEEP_DAYS:-30}"
DEST="$BACKUP_ROOT/$(date +%F)"

mkdir -p "$DEST"
echo "[$(date '+%F %T')] Backup en $DEST"

# 1) Base de datos (formato custom de pg_dump, ya comprimido).
docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U gestiond -d gestiond -Fc > "$DEST/gestiond.dump"

# 2) Archivos subidos (mockups).
docker compose -f "$COMPOSE_FILE" exec -T app tar -czf - -C /app uploads > "$DEST/uploads.tar.gz"

# 3) Borra backups de más de KEEP_DAYS días.
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +

ls -lh "$DEST"
echo "[$(date '+%F %T')] Listo"
