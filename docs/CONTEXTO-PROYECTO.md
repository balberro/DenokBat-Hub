# Contexto del proyecto — Denok Bat

> **Documento vivo para retomar el trabajo entre sesiones de chat.**
> Actualízalo al final de cada bloque de cambios (ver *Registro de cambios*).
> Última actualización: **2026-05-26** (rama `test/dinahosting`, commits `5fab7f5`, `d1bf11e`).

---

## 1. Qué es

App web de la **Asociación de Jubilados Denok Bat** (País Vasco). Bilingüe (Euskara/Español). Headless: frontend React + API Express + PostgreSQL local, con sincronización a **Odoo 17** por XML-RPC.

## 2. Cómo trabajar en este repo (IMPORTANTE)

- **Monorepo** con pnpm workspaces. No usar npm/yarn.
- **Rama de trabajo/testeo:** `test/dinahosting` (es donde se despliega a test).
- **Remoto:** `git@github.com:balberro/DenokBat-Hub.git`.
- **Comandos clave:**
  - `corepack pnpm run typecheck` — typecheck de todo el workspace.
  - `corepack pnpm run build:test` — build de **web + API** (el que usa el deploy). Para el deploy **no** se usa `pnpm run build` (ese compila todos los artefactos, incluido `mockup-sandbox`, que falla sin `PORT`).
- **Despliegue a test:** push a `test/dinahosting` y, en el servidor Dinahosting, ejecutar:
  ```bash
  cd /home/denokbat0/www/azkendantza
  bash ./scripts/update-dinahosting-test.sh
  ```
  (equivale a `pnpm run update:dinahosting-test`). Hace `git pull` + `install` + `build:test` + `touch tmp/restart.txt` (Passenger).
- **Servidor de test (Dinahosting):** corre por **Passenger** (`app.js` → carga `dist/index.cjs`). El mensaje "PM2 no tiene app 'denokbat-test'" es **normal** y se puede ignorar (PM2 es una alternativa vía `ecosystem.config.cjs`).
- **Esquema de BD en runtime:** varios módulos aplican/garantizan su esquema en runtime (`ensure*Schema()`), de modo que en test normalmente **no hay que ejecutar SQL a mano**. Si falta permisos (usuario no-owner), la API devuelve **503 con hint SQL accionable**; entonces se aplica la migración como owner.
- **No** hacer commit de secretos: `scripts/*.env.local` y `app.local.js` están fuera de git.
- **Lint:** no hay script de lint configurado. Prettier está como devDependency.

### Flujo de datos / entornos
- Local (dev) → test (`test/dinahosting` en Dinahosting) → (futuro) producción.
- Traspaso de **datos** entre entornos: `scripts/export-table.sh`, `scripts/export-many.sh`, `scripts/publish-table.sh` (dumps a `scripts/exports/`), y `scripts/sync-db-config.sh` para `db_config`.

## 3. Estructura

```text
artifacts/
├── api-server/         # Express 5 (API en /api, uploads en /uploads)
│   ├── src/routes/     # routers por módulo (actas.ts, convocatorias.ts, ...)
│   ├── src/lib/        # helpers (version.ts, storage.ts, actaPdf.ts, jwt.ts, ...)
│   ├── build.ts        # build esbuild → dist/index.cjs
│   └── uploads/        # ficheros subidos (actas/, propuestas/, socios/, ...)
└── denok-bat/          # React + Vite + Tailwind + Wouter + Zustand
    └── src/pages/area/ # pantallas del área privada
lib/
├── db/
│   ├── src/schema/     # esquemas Drizzle (una tabla por fichero)
│   └── *.sql           # migraciones/scripts idempotentes fix-db-*.sql
├── api-spec / api-zod / api-client-react
scripts/                # deploy-dinahosting.sh, update-dinahosting-test.sh, export/publish, sync-db-config
docs/                   # documentación (incluye este CONTEXTO-PROYECTO.md)
```

## 4. Roles de usuario

`socio` · `delegado` · `directivo` · `contable` · `administrador` · `superadmin`

El gating de rutas privadas vive en `artifacts/denok-bat/src/pages/AreaPrivada.tsx` (`allowedRoles` + `components`), y las rutas en `App.tsx`.

## 5. Flujo canónico del módulo Documentación

```text
Propuesta a la junta  →  Convocatoria  →  Acta  →  Expediente (Abrir | Continuar | Cerrar)
```
Cada paso pre-rellena el siguiente y enlaza (no reescribe). Ver `docs/DEFINICIONES-GESTOR-EXPEDIENTES.md` para el detalle de negocio.

## 6. Módulos y estado (resumen)

| Módulo | Estado | Dónde |
|---|---|---|
| Socios, grupos, cargos | Implementado | `routes/socios.ts`, `grupos.ts`, `cargos` |
| Actividades, eventos, inscripciones, pagos | Implementado | `routes/actividades.ts`, `eventos.ts`, … |
| Sugerencias | Implementado | `routes/sugerencias.ts` |
| Propuestas a la junta (buzón) | Implementado | `routes/propuestasJunta.ts` |
| Convocatorias | Implementado | `routes/convocatorias.ts` |
| **Actas** | Implementado (refactor 2026-05-26) | `routes/actas.ts` |
| Expedientes + subvenciones | Implementado | `routes/expedientes.ts`, `subvenciones.ts` |
| Integración Odoo | Implementado | `routes/` + `lib/` |
| Panel de versión (`/api/version`) | Implementado | `routes/health.ts`, `lib/version.ts` |

### Actas — estados y PDF firmado (cambio reciente)
- Estados: **`borrador` → `completa` → `aceptada`**. El estado legado `firmada` se **normaliza a `aceptada`**.
  - `completa`: lista para firma (el proceso de firma es **externo** y puede tardar).
  - `aceptada`: se ha subido el **PDF firmado** (documento externo) → dispara el resto (email, visibilidad a socios…).
- **El PDF firmado vive en la tabla `db_actas_pdf`** (relación 1:1 con `db_actas`, índice parcial por `pdf_anyo_mes`), **no** en columnas de `db_actas`.
- La API sigue exponiendo los campos `pdf_*` al cliente (vía `LEFT JOIN db_actas_pdf`); las pantallas no han tenido que cambiar sus tipos.
- Endpoints relevantes: `POST /admin/actas/:id/firmar`, `POST /admin/actas/firmar-otro-mes`, `GET /admin/actas/:id/duplicados-mes`, `GET /actas-firmadas`, `GET /actas-firmadas/:id`.
- Migraciones: `lib/db/fix-db-actas.sql` (V1), **`lib/db/fix-db-actas-aceptada.sql`** (crea `db_actas_pdf`, migra desde columnas antiguas y ajusta el CHECK). `lib/db/fix-db-actas-pdf.sql` queda **DEPRECADO**.
- Schema: `lib/db/src/schema/actasPdf.ts` (`actasPdfTable`). `actas.ts` ya no tiene columnas `pdf_*`.

### Buscador de actas firmadas (cambio reciente)
- Pantalla `/admin/actas/firmadas` (`BuscadorActasFirmadas.tsx`), roles `directivo`/`contable`.

## 7. Base de datos — convenciones

- Esquemas Drizzle en `lib/db/src/schema/`, re-exportados en `schema/index.ts`.
- Scripts idempotentes `lib/db/fix-db-*.sql` (o `create-db-*.sql`). Si un cambio toca esquema, **añadir el `.sql` correspondiente** y, si aplica, garantizar el esquema en runtime (`ensure*Schema()` en la ruta).
- Patrón habitual: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` + `DO $$ ... IF NOT EXISTS (pg_constraint) ... $$` para constraints.

## 8. Verificación antes de desplegar a test

1. `corepack pnpm run typecheck` → todo verde.
2. `corepack pnpm run build:test` → `✓ built` (web) + `⚡ Done` (API).
3. Commit(s) claros por tema + `git push origin test/dinahosting`.
4. En el servidor: `bash ./scripts/update-dinahosting-test.sh`.
5. Probar funcionalmente en test (login admin → flujo afectado).
6. Opcional: `GET /api/version` (admin) para confirmar versión desplegada.

> Avisos **no bloqueantes** conocidos del build: `tooltip.tsx ... sourcemap` y `chunks larger than 500 kB`.

---

## 9. Registro de cambios

> Añadir una entrada por bloque de cambios, lo más reciente arriba.

### 2026-05-26 — Refactor actas: estado `aceptada` + PDF en `db_actas_pdf`
- **Rama:** `test/dinahosting`. **Commits:** `5fab7f5` (refactor actas), `d1bf11e` (buscador + panel versión).
- **Backend `routes/actas.ts`:** `ensureActasSchema` crea `db_actas_pdf` (1:1, constraint `db_actas_pdf_acta_uq`), normaliza `firmada`→`aceptada` y reafirma el CHECK `(borrador, completa, aceptada)`. `mapActa` lee el PDF del join (`pdf_pdf_*` → `pdf_*`). Listado/detalle/`actas-firmadas`/`enviar-email`/`duplicados-mes` con `LEFT JOIN db_actas_pdf`. `firmar` hace **upsert** en `db_actas_pdf` y deja el acta en `aceptada`; `firmar-otro-mes` es **transaccional**.
- **Frontend:** `GestionActas.tsx` (`ESTADOS`, flujo y bloque de estado usan `aceptada`), `ActaImpresion.tsx` (`esBorrador = estado !== "aceptada"`), `translations.ts` (nueva clave `actas.estado.aceptada`; `firmada` se conserva como legado).
- **Schema:** nuevo `lib/db/src/schema/actasPdf.ts`; `actas.ts` pierde las columnas `pdf_*`.
- **SQL:** nueva `lib/db/fix-db-actas-aceptada.sql`; `fix-db-actas-pdf.sql` → DEPRECADO; `fix-db-actas.sql` refleja estados nuevos.
- **Docs:** `docs/DEFINICIONES-GESTOR-EXPEDIENTES.md` actualizada.
- **Extra (mismo bloque):** helpers de mes/año en `lib/actaPdf.ts` (`normalizarAnyoMes`, `tituloActaAnyoMes`, `primerDiaAnyoMes`); pantalla `/admin/actas/firmadas` + registro de ruta/roles; endpoint `GET /api/version` + `AppVersionPanel` + versión embebida en build (`build.ts`); ajustes en `QuienesSomos.tsx`.
- **Estado:** probado y funcionando en test ✅.

### 2026-05-25 — Propuestas a la junta V2 (antecedentes) y UX actas V2
- Antecedentes (texto + adjunto PDF) en propuestas que viajan al orden del día como snapshot, sin copiarse al acta. Columna(s) nuevas en `db_propuestas_junta`; endpoints de adjunto. Migración `lib/db/fix-db-propuestas-junta-antecedentes.sql`.
- UX del acta V2: puntos siempre expandidos, autoguardado al blur, etiqueta "Pendiente", lectura ampliada para `delegado`, pestaña Actas en Quiénes Somos.
- Ver `docs/DEFINICIONES-GESTOR-EXPEDIENTES.md` (historial) para detalle.

---

## 10. Pendientes / ideas abiertas

- (Añadir aquí lo que quede por hacer o probar.)
- Considerar traspaso de datos de actas local→test con `export-table.sh`/`publish-table.sh` si se necesita contenido de prueba realista.
- Optimización de build (chunk > 500 kB) — opcional, no urgente.
- Aplicar `fix-db-actas-aceptada.sql` como owner si en algún entorno el usuario de la app no puede alterar `db_actas` (síntoma: 503 con hint SQL).
