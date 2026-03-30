# Workspace — Denok Bat

## Overview

App web para la Asociación de Jubilados Denok Bat (País Vasco). Bilingüe (Euskara / Español). Integración con Odoo 17 via XML-RPC. Arquitectura headless: base de datos local PostgreSQL sincronizada con Odoo.

## Secciones principales (estructura actualizada)

| Ruta | Sección | Sub-secciones |
|------|---------|---------------|
| `/actividades` | **Zahartze Aktiboa / Envejecimiento Activo** | Yoga · Gimnasia · TaiChi · Montañismo · Mus (cada una con estado: prevista/abierta/en_curso/terminada) |
| `/eventos` | **Ekitaldiak / Eventos** | Fiestas (🎉) · Excursiones (🚌 próxima/previstas/realizadas) · Viajes (✈️ próximo/previstos/realizados) |
| `/divulgacion` | **Dibulgazioa / Divulgación** | Hoja Informativa · Pulunpe · Noticias · Artículos · Galería |
| `/quienes-somos` | **Nor Gara / Nosotros** | Presentación · Estatutos · Organigrama · Galería |

## Roles de usuario

- `socio` — acceso básico, inscripción actividades
- `delegado` — gestión grupo
- `directivo` — crear/editar contenido (Divulgación, Eventos, Actividades)
- `contable` — gestión contabilidad
- `administrador` — acceso total, panel de administración Odoo sync
- `superadmin` — acceso total más gestión de roles

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (Replit) + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TailwindCSS, Wouter, Zustand, React Query

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (middleware hacia Odoo + DB)
│   └── denok-bat/          # App web React + Vite (preview en /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
└── scripts/
```

## Arquitectura Headless

- **Frontend** (React+Vite): `artifacts/denok-bat/` → preview en `/`
- **Backend/Middleware** (Express): `artifacts/api-server/` → expuesto en `/api`
- **Base de datos local** (PostgreSQL Replit): fuente primaria para la app, siempre disponible
- **Integración Odoo**: XML-RPC via librería `xmlrpc` → fuente de verdad para datos compartidos
- **Sincronización**: `POST /api/sync` — importa datos de Odoo a la BD local (admin only)
- **Auth**: JWT tokens → `artifacts/api-server/src/lib/jwt.ts`

### Flujo de datos
1. App → API local → Base de datos local (rápido, siempre disponible)
2. Admin activa sync → API → Odoo XML-RPC → inserta/actualiza en BD local
3. Writes críticos (pagos) → BD local + Odoo en paralelo

## Tablas de Base de Datos

| Tabla | Descripción | Sync Odoo |
|-------|-------------|-----------|
| `db_socios` | Socios/miembros | Sí (res.partner) |
| `db_users` | Usuarios autenticados | No (gestionado por auth) |
| `db_grupos` | Grupos con delegado | No (gestión propia) |
| `db_eventos` | Eventos y excursiones | Sí (event.event) |
| `db_actividades` | Actividades regulares | Sí (event.tag) |
| `db_inscripciones` | Inscripciones a eventos/actividades | No |
| `db_pagos` | Pagos y cuotas | Sí (account.move) |
| `db_sugerencias` | Sugerencias de socios | No |
| `db_config` | Configuración de la app | No |
| `db_sync_log` | Log de sincronizaciones | No |

## Variables de entorno (secrets)

- `ODOO_URL` = https://vls18755.dinaserver.com
- `ODOO_DB` = dinaserver
- `ODOO_USERNAME` = dinaodooapi
- `ODOO_PASSWORD` (secret)
- `ODOO_API_KEY` (secret)
- `JWT_SECRET` (secret)
- `JWT_EXPIRES_IN` = 7d
- `DATABASE_URL` (secret — Replit PostgreSQL)

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
- `/login` — Login contra Odoo (fallback a mock en demo)
- `/panel` — Dashboard según rol
- `/perfil` — Mi perfil (editable)
- `/mis-eventos` — Eventos inscritos (socio)
- `/mis-inscripciones` — Historial inscripciones (socio)
- `/mis-pagos` — Pagos y recibos (socio)
- `/mis-sugerencias` — Sugerencias enviadas (socio)
- `/mi-grupo` — Mi grupo (delegado)
- `/inscripciones-grupo` — Inscripciones del grupo (delegado)
- `/admin/eventos` — Gestión de eventos (directivo)
- `/admin/actividades` — Gestión de actividades (directivo)
- `/admin/socios` — Gestión de socios (contable/admin)
- `/admin/contabilidad` — Contabilidad (contable)
- `/admin/roles` — Roles de usuario (admin)
- `/admin/proveedores` — Proveedores (admin)
- `/admin/textos` — Traducciones y textos (admin)
- `/admin/odoo` — Conexión Odoo + Sincronización (admin)
- `/admin/app` — Configuración de la app (admin)

## Roles de usuario (6)
usuario, socio, delegado, directivo, contable, administrador

## API Endpoints

### Auth
- `POST /api/auth/login` — Autenticación contra Odoo
- `GET  /api/auth/me` — Perfil del usuario autenticado

### Datos públicos (BD local → Odoo → mock)
- `GET  /api/actividades` — Lista actividades
- `GET  /api/actividades/:id` — Detalle actividad
- `GET  /api/eventos` — Lista eventos
- `GET  /api/eventos/:id` — Detalle evento
- `GET  /api/noticias` — Lista noticias
- `GET  /api/servicios` — Lista servicios

### Protegidos (requieren JWT)
- `POST /api/actividades/:id/inscribir` — Inscripción actividad
- `DELETE /api/actividades/:id/inscribir` — Cancelar inscripción
- `POST /api/eventos` — Crear evento (directivo/admin)
- `PUT  /api/eventos/:id` — Editar evento
- `DELETE /api/eventos/:id` — Eliminar evento
- `GET  /api/socios` — Lista socios (admin/directivo/delegado)
- `GET  /api/socios/:id` — Detalle socio
- `PUT  /api/socios/:id` — Actualizar socio (admin)
- `GET  /api/inscripciones` — Lista inscripciones
- `POST /api/inscripciones` — Nueva inscripción
- `DELETE /api/inscripciones/:id` — Cancelar inscripción
- `GET  /api/pagos` — Lista pagos
- `GET  /api/sugerencias` — Lista sugerencias
- `POST /api/sugerencias` — Nueva sugerencia
- `PUT  /api/sugerencias/:id` — Responder sugerencia (admin/directivo)
- `GET  /api/config` — Configuración app (admin)
- `PUT  /api/config/:clave` — Actualizar config (admin)
- `POST /api/sync` — Sincronizar Odoo → BD local (admin)
- `POST /api/contacto` — Formulario de contacto → Odoo CRM

## Internacionalización

Sistema propio via `artifacts/denok-bat/src/i18n/translations.ts`:
- Hook `useTranslation()` → funciones `t(key)` y `tb(item, field)`
- Estado de idioma en Zustand store (EU por defecto)
- Admin puede editar todos los textos en `/admin/textos`
- Overrides guardados en localStorage (`denok-bat-translations`)

## Modo demo

Si Odoo no está disponible, el sistema:
1. Autenticación → usa mock user (rol configurable en `use-mock-data.ts`)
2. Datos → lee desde BD local (si está vacía, usa mock data)
3. Banner "modo demo" visible en la app
