# Despliegue de test en Dinahosting

Esta guía deja la app funcionando como **un único proceso Node.js**:
- API (`/api`, `/uploads`)
- Frontend estático (SPA React/Vite)

## 1) Requisitos en servidor

- Node.js 20+ (recomendado)
- pnpm habilitado (`corepack enable`)
- Base de datos PostgreSQL accesible desde el servidor

## 2) Instalar dependencias

```bash
pnpm install --frozen-lockfile
```

## 3) Configurar variables de entorno

```bash
cp scripts/dinahosting-test.env.example scripts/dinahosting-test.env.local
```

Edita `scripts/dinahosting-test.env.local` y ajusta:
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS` (dominio test real)
- Variables `ODOO_*` si procede

## 4) Build para test

```bash
pnpm run build:test
```

Esto genera:
- Frontend: `artifacts/denok-bat/dist/public`
- Backend: `artifacts/api-server/dist/index.cjs`

## 5) Arranque

```bash
bash ./scripts/start-test.sh
```

### Opción recomendada: PM2 (arranque persistente)

El repositorio incluye `ecosystem.config.cjs` para levantar la app en segundo plano.

1. Ajusta `cwd` en `ecosystem.config.cjs` con la ruta real del proyecto en tu servidor.
2. Crea carpeta de logs si no existe:

```bash
mkdir -p logs
```

3. Inicia con PM2:

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Comandos útiles:

```bash
pm2 status
pm2 logs denokbat-test
pm2 restart denokbat-test
```

## 6) Proxy web en Dinahosting

Configura el proxy inverso para apuntar al puerto de `PORT` (por ejemplo `8080`).

Plantillas incluidas:
- Nginx: `deploy/dinahosting/nginx-test.conf.example`
- Apache: `deploy/dinahosting/apache-test.conf.example`

La app ya responde:
- `/api/*` desde Express
- `/uploads/*` desde Express
- resto de rutas como SPA

## 7) Checklist rápido de validación

- `GET /api/healthz` devuelve 200
- Carga la home del frontend
- Navegación SPA funciona refrescando rutas internas
- CORS permite el dominio test configurado
