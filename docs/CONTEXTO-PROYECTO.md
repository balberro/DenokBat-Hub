# Contexto del proyecto — Denok Bat

> **Documento vivo para retomar el trabajo entre sesiones de chat.**
> Actualízalo al final de cada bloque de cambios (ver *Registro de cambios*).
> Última actualización: **2026-05-27** (rama `test/dinahosting`, commits `6ae1388`, `91d40dc`).

---

## 1. Qué es

App web de la **Asociación de Jubilados Denok Bat** (Nafarroa). Bilingüe (Euskara/Español). Headless: frontend React + API Express + PostgreSQL local, con sincronización a **Odoo 17** por XML-RPC.

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
- **Aplicar SQL sin `psql` (servidor de test):** en el servidor de Dinahosting **no hay `psql`** instalado. Para aplicar migraciones `.sql` a mano se usa el script Node (usa `pg` del workspace `lib/db`):
  ```bash
  cd /home/denokbat0/www/azkendantza
  set -a; source scripts/dinahosting-test.env.local; set +a   # carga DATABASE_URL de test
  node scripts/apply-sql.mjs lib/db/fix-db-<...>.sql [...]
  ```
  Cada fichero se aplica en transacción y los scripts del repo son idempotentes. Si sale `must be owner of table`, usar una `DATABASE_URL` con usuario owner/superusuario.
- **`DATABASE_URL` de test:** la **correcta** (la que usa la app real vía Passenger) está en `app.local.js` (fuera de git): `postgres://denokdantza2026:***@pgsql03.dinaserver.com:5432/denokdantza`. La de `scripts/dinahosting-test.env.local` debe coincidir con esa; ojo con placeholders (`postgres://...`) o `localhost` (dan `ENOTFOUND`/`ECONNREFUSED`), y con contraseñas copiadas mal (`password authentication failed`).
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

`visitante` · `usuario` · `socio` · `delegado` · `directivo` · `contable` · `administrador`

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
| Convocatorias | Implementado (edición en cualquier estado, 2026-05-27) | `routes/convocatorias.ts` |
| **Actas** | Implementado (sincronización con convocatoria, 2026-05-27) | `routes/actas.ts` |
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

### Sincronización acta ↔ convocatoria (2026-05-27)
- Nuevo endpoint **`POST /admin/actas/:id/sincronizar-convocatoria`** (solo `contable`/admin; acta en `borrador` y con `convocatoria_id`).
- Recalcula los puntos del acta según el orden del día **actual** de la convocatoria: **añade** puntos nuevos, **actualiza** título/descripción de los existentes (preservando acuerdo/resultado/expediente/notas) y **propone eliminar** los puntos cuyo punto de convocatoria ya no existe (los puntos libres, `convocatoria_punto_id NULL`, se conservan). Renumera `orden`.
- **Doble fase:** sin `confirmar` → *dry-run* con `resumen`+`detalle`; con `confirmar:true` → aplica. Si hay eliminados **con datos escritos** y no llega `confirmar_datos:true`, no borra y devuelve `requiere_confirmacion:true`.
- **Frontend** (`GestionActas.tsx`): botón "Sincronizar con la convocatoria" en actas borrador con convocatoria + modal de confirmación con resumen y checkbox obligatorio si hay puntos con datos.

### Convocatorias — edición en cualquier estado (2026-05-27)
- Se permite editar cabecera y puntos en convocatorias `borrador`, `publicada` y `celebrada` (antes solo en `borrador`). Ver `GestionConvocatorias.tsx` / `routes/convocatorias.ts`.

### Robustez ante ausencia de `db_propuestas_junta` (2026-05-27)
- `actas.ts` y `convocatorias.ts` detectan si existe `db_propuestas_junta` (`to_regclass` cacheado) y usan variantes de las consultas **sin** `LEFT JOIN`/sin escritura al buzón cuando la tabla no está instalada. Evita el error `relation "db_propuestas_junta" does not exist` (que afectaba también a un simple `LEFT JOIN`) al crear actas/convocatorias en entornos sin el módulo del buzón.

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

### 2026-05-27 — Sincronización acta↔convocatoria, edición de convocatorias y robustez del buzón
- **Rama:** `test/dinahosting`. **Commits:** `6ae1388` (sincronización + edición convocatorias + UX acta nueva), `91d40dc` (robustez `db_propuestas_junta` + `apply-sql.mjs`).
- **Backend `routes/actas.ts`:**
  - Nuevo `POST /admin/actas/:id/sincronizar-convocatoria` (dry-run + aplicar; ver sección 6). Solo acta en `borrador` con convocatoria; transaccional.
  - Helper `tablaExiste()`/`propuestasDisponibles()` (vía `to_regclass`, cacheado). Las consultas con `LEFT JOIN db_propuestas_junta` (listado/detalle/email/firmadas/from-convocatoria/sincronizar) y los bloques que resuelven propuestas (`crearComoCompleta`, `completar`) se adaptan/saltan si la tabla no existe.
- **Backend `routes/convocatorias.ts`:** mismo helper `tablaExisteConv()`; el `UPDATE db_propuestas_junta` al borrar convocatoria y el `SELECT` de propuestas al leer una convocatoria se ejecutan solo si la tabla existe. Se permite **editar en cualquier estado**.
- **Frontend:**
  - `GestionActas.tsx`: botón **"Sincronizar con la convocatoria"** + modal con resumen (añadidos/actualizados/eliminados) y checkbox obligatorio si hay puntos con datos. Mensaje bajo el botón de guardar en *nueva acta* ("No guardado, debe seleccionar convocatoria…" / "Guardado correctamente como borrador / como completa").
  - `GestionConvocatorias.tsx`: edición habilitada en `borrador`/`publicada`/`celebrada`.
  - `translations.ts`: claves `actas.sync.*` (es/eu).
- **Scripts:** nuevo **`scripts/apply-sql.mjs`** — aplica ficheros `.sql` vía `pg` (resuelto desde `lib/db`) sin necesitar `psql`; útil porque el servidor de Dinahosting no tiene `psql`. Cada fichero en transacción.
- **Despliegue/migraciones (test):**
  - `scripts/dinahosting-test.env.local` tenía una `DATABASE_URL` **errónea** (`localhost`/`denokbat_test`/usuario `denokdantza`). Corregida a la real de `app.local.js`: `postgres://denokdantza2026:***@pgsql03.dinaserver.com:5432/denokdantza`.
  - Migraciones del buzón aplicadas con `apply-sql.mjs`: `fix-db-propuestas-junta.sql`, `...-origenes-v2.sql`, `...-antecedentes.sql` → `OK` (base `denokdantza`, host `46.231.127.126`).
  - Copias obsoletas `dinahosting-test.env.local.save.1` / `.save.3` borradas en el servidor.
- **Estado:** probado en test ✅ — "Guardado correctamente como borrador" y "acta sincronizada con la convocatoria".

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
- **`scripts/dinahosting-test.env.local` vs `app.local.js`:** mantener sincronizadas las credenciales de test (la fuente de verdad de la app es `app.local.js`). Revisar si conviene que el deploy genere/valide ese `.env.local`.
- Migraciones del buzón ya aplicadas en **test**; pendiente aplicarlas igualmente en **local** como owner (en local daban `must be owner of table` con el usuario de app) y en futura **producción**.
