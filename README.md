# Gestión Dalmata

App interna para gestionar los pedidos de cajas de Dalmata: stock de herrajes y placas, entregas, comprobantes internos con estado de cobro y exportación contable a Excel.

Perfiles:
- **Admin**: puede hacer todo, incluso gestionar usuarios y anular registros.
- **Taller**: stock, producción, entregas, precios y comprobantes.
- **Dalmata**: crea pedidos, ve el stock y registra la llegada de placas. También ve los comprobantes y el saldo.

Stack: Next.js 15, Prisma 6, PostgreSQL 17 y Docker.

---

## Desarrollo local

```bash
cp .env.example .env              # y completar
docker compose -f docker-compose.dev.yml up -d   # Postgres en localhost:5433
npm ci
npx prisma migrate deploy
npx prisma db seed                # materiales + admin (ADMIN_USERNAME / ADMIN_PASSWORD)
npm run dev                       # http://localhost:3000
npm test                          # tests contra la base gestiond_test
```

---

## Producción (VPS)

### 1. Variables de entorno

En la carpeta del proyecto del servidor (por ejemplo `/opt/gestiond`), creá un archivo `.env`. Docker Compose lo lee solo, y también lo usa el script de backup.

```dotenv
POSTGRES_PASSWORD=una-clave-larga-y-aleatoria
SESSION_SECRET=otra-clave-larga-y-aleatoria
ADMIN_USERNAME=alejo
ADMIN_PASSWORD=clave-inicial-del-admin   # solo se usa si el admin todavía no existe
APP_PORT=3000                            # puerto local; cambialo si 3000 ya está ocupado en el VPS
```

Para generar claves aleatorias: `openssl rand -base64 32`.

### 2. Primer arranque

```bash
git clone <repo> /opt/gestiond && cd /opt/gestiond
nano .env
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app
```

Cada vez que arranca, el contenedor hace tres cosas: aplica las migraciones (`prisma migrate deploy`), carga los materiales y crea el admin si todavía no existe.

La app escucha **solo en `127.0.0.1:${APP_PORT}`**, así que no queda expuesta a internet sin HTTPS.

Para actualizar a una versión nueva:

```bash
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Reverse proxy y HTTPS

Apuntá un subdominio (por ejemplo `gestion.tudominio.com`) a la IP del VPS.

**Nginx + certbot:**

```nginx
server {
    server_name gestion.tudominio.com;
    client_max_body_size 100m;            # mockups de hasta 20 MB c/u
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Después: `sudo certbot --nginx -d gestion.tudominio.com`.

**Caddy** (el certificado se gestiona solo):

```
gestion.tudominio.com {
    request_body { max_size 100MB }
    reverse_proxy 127.0.0.1:3000
}
```

La cookie de sesión es `Secure` en producción, así que hay que entrar siempre por **https**.

### 4. Backups diarios

`scripts/backup.sh` guarda en `/var/backups/gestiond/AAAA-MM-DD/` dos archivos:
- `gestiond.dump`: la base de datos, con `pg_dump -Fc`.
- `uploads.tar.gz`: los mockups.

También borra los backups de más de 30 días.

```bash
chmod +x scripts/backup.sh
sudo crontab -e
# agregar:
0 3 * * * cd /opt/gestiond && ./scripts/backup.sh >> /var/log/gestiond-backup.log 2>&1
```

Recomendado: copiar `/var/backups/gestiond` fuera del VPS cada tanto (rclone, scp o el backup de Hostinger).

### 5. Restaurar un backup

```bash
cd /opt/gestiond
B=/var/backups/gestiond/2026-11-12
docker compose -f docker-compose.prod.yml stop app

# Base de datos (reemplaza el contenido actual)
docker compose -f docker-compose.prod.yml exec -T db \
  pg_restore -U gestiond -d gestiond --clean --if-exists --no-owner < $B/gestiond.dump

# Mockups
docker compose -f docker-compose.prod.yml run --rm -T --no-deps --entrypoint sh app \
  -c "rm -rf /app/uploads/* && tar -xzf - -C /app" < $B/uploads.tar.gz

docker compose -f docker-compose.prod.yml start app
```
