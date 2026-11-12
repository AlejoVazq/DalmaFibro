#!/bin/sh
set -e
echo "Aplicando migraciones..."
prisma migrate deploy --schema ./prisma/schema.prisma
echo "Cargando datos base (materiales y admin si falta)..."
node ./prisma/seed.js
echo "Iniciando la aplicación en el puerto ${PORT}..."
exec node server.js
