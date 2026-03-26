# Workspace — Denok Bat

## Overview

App web para la Asociación de Jubilados Denok Bat (País Vasco). Bilingüe (Euskara / Español). Integración con Odoo 17 via XML-RPC.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TailwindCSS, Wouter, Zustand, React Query

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (middleware hacia Odoo)
│   └── denok-bat/          # App web React + Vite (preview en /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
└── scripts/
```

## Arquitectura

- **Frontend** (React+Vite): `artifacts/denok-bat/` → preview en `/`
- **Backend/Middleware** (Express): `artifacts/api-server/` → expuesto en `/api`
- **Integración Odoo**: XML-RPC via librería `xmlrpc` → `artifacts/api-server/src/lib/odoo.ts`
- **Auth**: JWT tokens → `artifacts/api-server/src/lib/jwt.ts`

## Variables de entorno (secrets)

- `ODOO_URL` = https://vls18755.dinaserver.com
- `ODOO_DB` = dinaserver
- `ODOO_USERNAME` = dinaodooapi
- `ODOO_PASSWORD` (secret)
- `ODOO_API_KEY` (secret)
- `JWT_SECRET` (secret)
- `JWT_EXPIRES_IN` = 7d

## Secciones de la app

### Públicas
- `/` — Home con hero, accesos rápidos, eventos y noticias
- `/quienes-somos` — Quiénes somos / Nor gara
- `/actividades` — Jarduerak (filtros por categoría, inscripción)
- `/eventos` — Gertaerak (listado de eventos)
- `/divulgacion` — Dibulgazioa (noticias/blog)
- `/servicios` — Zerbitzuak (catálogo de servicios)
- `/sugerencias` — Iradokizunak (formulario de sugerencias)
- `/contacto` — Harremana (mapa, contacto, formulario)

### Privadas (requieren JWT)
- `/login` — Login contra Odoo
- `/panel` — Dashboard según rol (socio, delegado, directivo, contable, administrador)

## Roles de usuario (6)
usuario, socio, delegado, directivo, contable, administrador

## API Endpoints

- `POST /api/auth/login` — Autenticación contra Odoo
- `GET  /api/auth/me` — Perfil del usuario autenticado
- `GET  /api/actividades` — Lista actividades
- `GET  /api/actividades/:id` — Detalle actividad
- `POST /api/actividades/:id/inscribir` — Inscripción
- `DELETE /api/actividades/:id/inscribir` — Cancelar inscripción
- `GET  /api/eventos` — Lista eventos (desde Odoo event.event)
- `GET  /api/eventos/:id` — Detalle evento
- `GET  /api/noticias` — Lista noticias (desde Odoo blog.post)
- `GET  /api/noticias/:id` — Detalle noticia
- `GET  /api/servicios` — Lista servicios
- `POST /api/contacto` — Formulario de contacto → Odoo CRM lead
- `POST /api/sugerencias` — Sugerencias → Odoo helpdesk ticket

## Internacionalización

Sistema propio via `artifacts/denok-bat/src/i18n/translations.ts`:
- Hook `useTranslation()` → funciones `t(key)` y `tb(item, field)`
- Estado de idioma en Zustand store
- Preferencia guardada en localStorage

## Escalabilidad (preparado para futuro)
- Chat (Socket.io)
- Notificaciones push
- Reservas de instalaciones
- Pagos de cuotas (Stripe/Redsys)
- Directorio de socios con grupos y delegados
