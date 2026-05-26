# Definiciones — gestor integrado de expedientes / documentación

Documento vivo: acuerdos de producto y alcance. Actualizar aquí cuando cambien reglas de negocio, permisos o integraciones.

---

## Subvenciones (V1 de gestor)

El apartado **Subvenciones** del rol **contable** se gestiona como expediente ordinario con tipología `subvenciones`, no como un silo separado. La subvención nace al cargar el decreto PDF y queda enlazada a documentos, propuestas, convocatorias, actas, acciones y responsables.

Flujo previsto:

```text
Decreto PDF
  → expediente de subvención en preparación
  → propuesta inicial a la junta
  → convocatoria
  → acta
  → expediente en curso + acciones/responsables
  → solicitud enviada
  → resolución del Gobierno
  → justificación intermedia
  → contestación intermedia
  → justificación final
  → contestación final
  → propuesta de cierre a la junta
  → convocatoria
  → acta
  → cierre del expediente
```

### Entrada de menú

En el rol **contable**, `Subvenciones` muestra tres tarjetas:

- **Nueva**: alta de expediente desde decreto PDF (`/admin/subvenciones/nueva`).
- **En curso**: expedientes `preparando` y `en_curso` (`/admin/subvenciones/en-curso`).
- **Historial**: expedientes `cerrado` y `archivado` (`/admin/subvenciones/historial`), en modo consulta.

### Modelo de datos

- `db_expedientes`: registro principal. Para subvenciones usa `tipologia='subvenciones'`.
- Estados de expediente ampliados:
  - `preparando`: decreto cargado, pendiente de decisión de junta.
  - `en_curso`: la junta aprueba presentarse y se gestionan solicitud, acciones y justificaciones.
  - `cerrado`: la junta aprueba el cierre.
  - `archivado`: la junta rechaza presentarse o se abandona antes de abrir.
- `db_expediente_subvencion`: extensión 1:1 con datos propios de subvención:
  - organismo, código de convocatoria, plazos.
  - importes: disponible, solicitado, concedido, justificado/cobrado intermedio, justificado/cobrado final.
  - subestado administrativo (`preparando`, `aprobada_junta`, `solicitud_enviada`, `resuelta_concedida`, `resuelta_denegada`, `en_ejecucion`, `justif_intermedia_enviada`, `contestada_intermedia`, `justif_final_enviada`, `contestada_final`, `propuesta_cierre`).
  - propuesta inicial y propuesta de cierre.
- `db_expediente_documentos`: adjuntos genéricos de expediente. Para subvenciones se usan tipos: `decreto`, `solicitud`, `resolucion`, `justif_intermedia`, `contestacion_intermedia`, `justif_final`, `contestacion_final`, `otros`.

### Junta, acta y cierre

- La propuesta inicial usa `origen_tipo='subvencion'`, `origen_id=<expediente_id>` y solicita `abrir_expediente`.
- Al completar el acta con resultado `expediente_abierto`, el expediente de subvención pasa de `preparando` a `en_curso` y el subestado a `aprobada_junta`.
- La propuesta de cierre solicita `cerrar_expediente`.
- Al completar el acta con resultado `expediente_cerrado`, el expediente pasa a `cerrado` y se registra movimiento `cerrar`.
- Si la propuesta inicial se rechaza, el expediente queda `archivado`.

### Scripts idempotentes

- `lib/db/fix-db-expedientes-estados-v2.sql`
- `lib/db/fix-db-expediente-documentos.sql`
- `lib/db/fix-db-expediente-subvencion.sql`
- `lib/db/fix-db-propuestas-junta-origenes-v2.sql`
- `lib/db/fix-db-actas-resultados-v2.sql`

---

## Objetivo

- Aumentar **trazabilidad**, **transparencia** y **automatización** del trabajo asociado a sugerencias, aportaciones e iniciativas documentadas.
- **Usuarios** (parte pública): interacción acotada a **sugerencias y aportaciones** (y formularios que den origen a expediente, según se implemente).
- **Rol directivo**: gestión completa del expediente, seguimiento, cierre y archivo.

---

## Sugerencias y aportaciones

- Una **aportación** (fila hija con `parent_id` apuntando a la raíz) se trata como **una línea más** de la sugerencia.
- **El estado lo fija únicamente la sugerencia raíz**; las aportaciones lo heredan automáticamente:
  - Al crear una aportación, se guarda con el `estado` actual de la raíz.
  - Si la raíz cambia de estado, la API propaga el nuevo estado a todas sus aportaciones.
  - Los intentos de editar el `estado` directamente sobre una aportación se ignoran (log informativo).
- Script de back-fill para alinear filas existentes: `lib/db/fix-db-sugerencias-aportacion-estado.sql`.

## Propuestas a la junta (buzón)

Cuando una sugerencia, junto con sus aportaciones, se considera **suficientemente madurada**, la directiva la pasa a estado **`presentada`** y, en ese mismo paso, se **elabora una propuesta a la junta**.

> **Regla acordada (V1)**: pasar una sugerencia a `presentada` y crear su propuesta a la junta es un **acto atómico**: no se puede dejar una sugerencia en `presentada` sin propuesta asociada ni crear una propuesta sin que su sugerencia origen quede en `presentada`. La API lo implementa en una sola operación (transacción).

> **Origen V1**: las propuestas se generan **exclusivamente a partir de sugerencias** (raíz + aportaciones). Otras vías (propuesta libre por miembros, requisitos legales…) se contemplarán en versiones posteriores ampliando `origen_tipo`.

### Formulario "Propuesta a la junta"

Se abre desde la **ficha de sugerencia** (acción "Pasar a presentada → Elaborar propuesta") en el rol directivo.

Campos:

| Campo                  | Tipo                    | Valor inicial sugerido (precarga editable) |
| ---------------------- | ----------------------- | ------------------------------------------ |
| `denominacion`         | texto corto, **editable**, obligatorio | título / asunto de la sugerencia raíz. |
| `descripcion`          | texto largo, **editable**, obligatorio | mensaje de la sugerencia raíz + aportaciones concatenadas (cada aportación con su alias/fecha como cabecera). |
| `decision_solicitada`  | selector (1 entre 3), obligatorio | (sin valor por defecto, debe elegirlo el proponente) |

Opciones del selector `decision_solicitada`:

- **`rechazada`** — solicitar a la junta el rechazo formal.
- **`mas_aportaciones`** — solicitar a la junta devolver el caso para recoger más aportaciones.
- **`abrir_expediente`** — solicitar la **apertura de expediente** (entrada al *Gestor de expedientes*).

> La precarga inicial es solo punto de partida: el proponente puede reescribir libremente la denominación y descripción antes de enviar al buzón. El texto enviado a la junta queda **congelado** en la propuesta (no se ve afectado por ediciones posteriores de la sugerencia o sus aportaciones).

### Buzón de propuestas (UI V1 — implementada)

- Pantalla dedicada en `/admin/propuestas-junta` (rol **directivo**), accesible desde el menú de usuario ("Buzón de propuestas").
- Todas las propuestas generadas entran a un **buzón** común (bandeja de entrada de la junta).
- El buzón es **una de las fuentes** para generar el **orden del día** de la convocatoria de junta (junto con propuestas de origen directo de miembros, requisitos legales, etc.).
- Estados mínimos del item en buzón:
  - `pendiente`: a la espera de incluirse en una convocatoria.
  - `en_orden_dia`: incluido en el orden del día de una junta convocada (referencia a la junta).
  - `resuelta`: la junta ha decidido (con `resultado` y referencia al acta).
- Acciones sobre la propuesta en buzón (rol directivo):
  - **Editar** denominación / descripción / decisión solicitada / observaciones mientras está `pendiente`.
  - **Incluir en orden del día**: pasa a `en_orden_dia` (también se hace automáticamente al añadir la propuesta a una convocatoria).
  - **Devolver al buzón** (`reabrir`): vuelve de `en_orden_dia` a `pendiente`.
  - **Resolver** tras la junta con `resultado` (`rechazada`, `mas_aportaciones`, `expediente_abierto`); el efecto se propaga a la sugerencia origen (ver tabla más abajo).
- **Cómo se entra al buzón** (V1):
  - Botón **Presentar a la junta** en la **ficha de sugerencia** (rol directivo). Solo aparece para sugerencias **raíz** sin propuesta activa. El formulario abre con denominación y descripción **precargadas** desde la sugerencia + aportaciones (`GET /admin/propuestas-junta/preview/sugerencia/:id`); al confirmar se llama a `POST /admin/propuestas-junta/desde-sugerencia` y la operación es atómica: crea la propuesta en estado `pendiente` y marca la sugerencia (y aportaciones) como `presentada`.
  - **No** se pasa una sugerencia a `presentada` desde el selector de estado de la pantalla de sugerencias: el `PUT /sugerencias/:id` **rechaza con 409** transiciones manuales a `presentada`, `planificada` o `rechazada`. El selector de edición solo ofrece `nueva` y `aportaciones`.
- Trazabilidad: la propuesta guarda referencia a la **sugerencia origen** (cuando aplica) y, si la decisión final es **abrir expediente**, al **expediente** generado.

### Efectos según resolución de la junta

| Resultado en junta        | Efecto sobre la sugerencia origen                          | Efecto en otros módulos |
| ------------------------- | ---------------------------------------------------------- | ----------------------- |
| `rechazada`               | Sugerencia → estado **`rechazada`** + `observaciones`.    | —                       |
| `mas_aportaciones`        | Sugerencia → estado **`aportaciones`** (vuelve a abierta). | —                       |
| `expediente_abierto`      | Sugerencia → estado **`planificada`** + enlace al expediente. | **Gestor de expedientes**: se crea un expediente (tipología "sugerencias") referenciando la propuesta y heredando metadatos. |

> Las aportaciones heredan el cambio de estado por la regla ya descrita en *Sugerencias y aportaciones*.

### Permisos

- **Crear / editar / enviar al buzón**: rol **directivo** (a partir de una sugerencia o, en versiones siguientes, de origen directo).
- **Resolver propuestas**: rol **directivo** tras la junta correspondiente.
- **Lectura del buzón**: rol **directivo**.

### Esquema de datos (preliminar)

Pendiente de implementación; tabla candidata `db_propuestas_junta`:

- `id` PK, `creado_en`, `creado_por` (FK `db_users`).
- `origen_tipo` (`sugerencia` por ahora; ampliable), `origen_id` (nullable; FK al recurso de origen).
- `denominacion` (text, NOT NULL), `descripcion` (text, NOT NULL).
- `decision_solicitada` (enum: `rechazada | mas_aportaciones | abrir_expediente`).
- `estado_buzon` (enum: `pendiente | en_orden_dia | resuelta`).
- `junta_id` (nullable; FK a `db_juntas` cuando exista).
- `resultado` (enum nullable: `rechazada | mas_aportaciones | expediente_abierto`).
- `expediente_id` (nullable; FK a `db_expedientes` cuando se cree).
- `observaciones` (text nullable; notas internas de la junta).

## Grupos de socios

- Un **grupo** agrupa socios por una o varias **poblaciones**. Datos:
  - `nombre` (obligatorio), `nombre_eu` (opcional), `delegado_id` (opcional, FK a `db_socios.id`), `poblaciones` (text[] obligatorio, al menos una).
- **Asignación automática** (regla acordada — opción A):
  - Al crear o editar un grupo, los socios **automáticos** cuya `poblacion` esté en la lista del grupo quedan asignados a ese grupo (`grupo_manual = FALSE`).
  - Los socios con **`grupo_manual = TRUE`** (decisión explícita del contable o del administrador en ficha) **no** son movidos ni desasignados por estos recálculos.
  - Si una población se quita del grupo, los socios **automáticos** que ya no encajen pierden `grupo_id` (NULL); los manuales no se tocan.
  - Al borrar un grupo: todos los socios de ese grupo pasan a `grupo_id = NULL` y **`grupo_manual = FALSE`** (el grupo deja de existir).
- **Población huérfana**: si la `poblacion` de un socio **no aparece en ningún grupo**, por defecto `grupo_id = NULL`. En la pestaña **Grupos** hay un listado de socios sin grupo (incluye huérfanos) para asignar manualmente o pulsar **Auto** (vuelve a la regla por población).
- **Marcar manual**: `PUT /admin/socios/:id/grupo` con `{ "grupo_id": <id|null> }` pone `grupo_manual = TRUE`. **Volver a automático**: `POST /admin/socios/:id/grupo-automatico` pone `grupo_manual = FALSE` y recalcula `grupo_id` según `poblaciones` de los grupos. En ficha de socio (admin), cambiar el ID de grupo y guardar con `PUT /socios/:id` también marca manual si el valor cambia; se puede enviar `grupo_automatico: true` en el mismo `PUT` para recalcular sin pasar por el endpoint admin.
- Permisos: `/admin/grupos` y `/admin/socios/.../grupo*`: `administrador` y `contable`. `PUT /socios/:id` sigue siendo solo **administrador**.
- Listado por grupo agrupado por **población** y dentro de cada población, **alfabético** por apellidos.
- Script idempotente: `lib/db/fix-db-grupos.sql` (tabla `db_grupos`, columna `db_socios.grupo_manual`, índices, back-fill respetando `grupo_manual`).
- **Delegado del grupo y cargos**: al guardar un grupo se sincroniza una línea en `db_historico_cargos` con el cargo `delegado_zona` para el socio delegado (cierre + apertura cuando cambia, cierre al borrar el grupo). Así el delegado aparece automáticamente en *Consulta de cargos* filtrando por ámbito *delegado*. Para sembrar líneas en datos previos: `lib/db/fix-db-grupos-historico-delegados.sql`.
- **Listado del delegado**: `GET /api/socios/mi-grupo` devuelve los grupos en los que el usuario logueado es delegado (cruce `db_users.socio_id` ↔ `db_grupos.delegado_id`) y la lista de socios con `grupo_id` en esos grupos. Lo consume la pantalla **Mi grupo** (`/mi-grupo`), accesible al rol `delegado`.

## Flujo canónico: Propuesta → Convocatoria → Acta → Expediente

El **flujo objetivo** del módulo, en este orden, es:

```text
Propuesta a la junta  →  Convocatoria  →  Acta  →  Expediente (Abrir | Continuar | Cerrar)
```

Regla de oro: **cada paso pre-rellena su formulario con la información del paso anterior**, y guarda una referencia al mismo. No se reescriben datos: se enlazan.

### Qué hereda cada paso

| Paso         | Hereda del anterior (precarga / referencias)                                                                                                                                                                       | Aporta de nuevo                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Propuesta** | (Origen V1) Sugerencia raíz + aportaciones (denominación = tema; descripción = texto raíz + aportaciones concatenadas).                                                                                            | Decisión solicitada (`rechazada` / `mas_aportaciones` / `abrir_expediente`), observaciones del proponente.                                                                     |
| **Convocatoria** | Una o varias propuestas del **buzón** entran al **orden del día** (estado `en_orden_dia`). La convocatoria toma de cada propuesta su denominación/descripción para componer el orden del día.                  | Fecha y hora de la reunión, lugar/canal, asistentes previstos, documentación adjunta a debatir.                                                                                |
| **Acta**     | Datos de la convocatoria (orden del día, fecha, asistentes). Para cada punto del orden del día se registra la **decisión** (resuelve la propuesta con `rechazada` / `mas_aportaciones` / `expediente_abierto`).      | Asistentes reales, acuerdos, votaciones, encargos a responsables, observaciones de junta.                                                                                      |
| **Expediente** | Del **acta** que origina su apertura: denominación/descripción (de la propuesta vehiculada), fecha del acuerdo, acta_id, responsables. Indirectamente, sigue enlazando con la propuesta y, vía ella, con la sugerencia. | Movimientos `abrir` / `continuar` / `cerrar` con notas, documentos del ciclo (PDF, imágenes, etc.), valoraciones de cierre.                                                  |

### Convocatorias (módulo V1 — implementado)

- **Acceso**: **contable** escribe (crea, edita orden del día, publica, marca celebrada); **directivo** lee (consulta convocatorias y orden del día). Entrada de menú en ambos roles; el contable también accede desde *Documentación → Convocatorias*.
- **Estados V1**: `borrador` → `publicada` → `celebrada`.
- **Tipos V1** (varchar ampliable): `junta_directiva`, `asamblea_general`, `delegados`, `otros`.
- **Orden del día** (`db_convocatoria_puntos`):
  - **Punto ligado a propuesta**: al añadirlo, la propuesta pasa atómicamente de `pendiente` a `en_orden_dia` y se rellena `junta_id` con el id de la convocatoria. Al quitar el punto, vuelve a `pendiente` y `junta_id = NULL`. Una propuesta solo puede estar en una convocatoria a la vez (índice único parcial).
  - **Punto libre**: título/descripción manual (saludo, varios, lectura del acta anterior, etc.).
- **Cabecera** (`db_convocatorias`): número secuencial, tipo, título, fecha, hora, lugar/canal, observaciones.
- **Script idempotente**: `lib/db/fix-db-convocatorias.sql`.
- **API**: `artifacts/api-server/src/routes/convocatorias.ts` (CRUD cabecera, puntos, reordenar, publicar, celebrar).
- **UI**: `GestionConvocatorias.tsx` en `/admin/convocatorias`.
- **Siguiente paso**: módulo **Actas** (celebrar convocatoria → generar acta con resolución de cada punto del buzón).

### Actas (módulo V1 — implementado)

- **Acceso**: **contable** escribe; **directivo** lee. Entrada de menú en ambos roles; el contable también accede desde *Documentación → Actas de reuniones*.
- **Origen**: una acta se crea desde una convocatoria `publicada` o `celebrada`; copia la cabecera básica y todos los puntos del orden del día, incluidos puntos libres.
- **Estados V1**: `borrador` → `completa` → `firmada`.
- **Puntos del acta** (`db_acta_puntos`): cada punto guarda acuerdo, notas, resultado de propuesta (`rechazada`, `mas_aportaciones`, `expediente_abierto`) y acción prevista sobre expediente (`abrir`, `continuar`, `cerrar`).
- **Completar acta**: valida que las propuestas incluidas tengan resultado, marca el acta como `completa` y propaga las decisiones al buzón de propuestas y a las sugerencias de origen.
- **Firmar acta**: marca el acta como `firmada` después de estar completa.
- **Expediente**: si un punto se resuelve como `expediente_abierto`, queda disponible para que el gestor de expedientes abra el expediente posteriormente. `continuar` y `cerrar` quedan registrados como intención/decisión del acta para enlazarse con movimientos de expediente.
- **Script idempotente**: `lib/db/fix-db-actas.sql`.
- **API**: `artifacts/api-server/src/routes/actas.ts`.
- **UI**: `GestionActas.tsx` en `/admin/actas`.

### Estado intermedio (V1) y plan posterior

- **V1 Convocatorias**: implementado (ver sección anterior).
- **V1 Actas**: implementado (ver sección anterior).
- **V1 Expediente (transición)**: el acta resuelve la propuesta como `expediente_abierto`; el expediente se abre después desde el gestor de expedientes usando esa propuesta resuelta. En `db_expedientes`:
  - se enlaza `propuesta_id` y, vía ella, la sugerencia origen.
  - el movimiento `abrir` admite `acta_id` (nullable) y `fecha` para registrar manualmente esos datos hasta que se conecte el botón directo desde Actas.
- **V2 (con Acta)**: la apertura del expediente se hará **desde el acta**:
  - el formulario *Abrir expediente* en la pestaña correspondiente del acta precargará denominación/descripción desde la propuesta vehiculada por ese punto del orden del día,
  - se guardará `acta_id` (y, por trazabilidad, también `propuesta_id`),
  - el movimiento `abrir` quedará asociado al acta de forma automática.
- **Continuar / Cerrar**: cada movimiento podrá asociarse a un acta posterior (cuando exista). Mientras tanto, `acta_id` y `fecha` se introducen manualmente.

### Implicaciones para los esquemas

- `db_propuestas_junta` ya guarda `junta_id` (acta asociada cuando exista el módulo). Se mantiene.
- `db_expedientes` mantiene `propuesta_id` como **vínculo histórico** con la propuesta vehiculada al abrir. Cuando exista *Actas*, se añadirá `acta_apertura_id` (FK a `db_actas`) sin perder `propuesta_id` (los expedientes antiguos seguirán siendo consultables).
- `db_expediente_movimientos` ya tiene `acta_id` nullable previsto para enlazar cualquier movimiento con su acta correspondiente.

> Resumen operativo del flujo: **cada paso es un formulario nuevo, pero nunca se vuelve a teclear lo que ya estaba en el paso anterior**. El sistema lo arrastra y lo enlaza para mantener una **única cadena de trazabilidad** desde la sugerencia/aportaciones hasta el archivo del expediente.

---

## Fuentes de expediente

| Origen              | Descripción breve                          |
| ------------------- | ------------------------------------------ |
| Sugerencias         | Entrada típica desde canal de sugerencias. |
| Formulario “nuevo”  | Iniciación propia (alta de expediente).    |
| Aportaciones        | Contempladas en el ámbito usuario (ver permisos). |

*(Añadir aquí nuevas fuentes cuando existan: p. ej. otros formularios, importación.)*

---

## Ciclo de vida (estados)

| Estado    | Significado |
| --------- | ----------- |
| En curso  | Expediente creado por **acción Abrir** y todo periodo posterior con **acciones Continuar**. Puede automatizarse notificación / espejo Odoo. |

> Nota V1: no se distingue un estado "iniciado" separado de "en curso"; el expediente nace directamente en `en_curso`.

**Estado final único (v1):** un solo valor en producto/BD que cubre a la vez el significado de **cerrado** y **archivado**:

- **Cerrado (semántica):** ya no se espera trabajo administrativo habitual.
- **Archivado (semántica):** congelado para edición, optimizado para **lectura y retención** a largo plazo.

> Etiqueta mostrada en UI (“Cerrado”, “Archivado” o “Cerrado / archivado”) se decide en diseño; el importante es **un solo estado terminal** en la primera versión. Si más adelante se separan dos estados técnicos, actualizar esta sección.

---

## Permisos: quién ve qué

| Rol        | Alcance |
| ---------- | ------- |
| Usuario    | Solo **sugerencias** y **aportaciones** (alcance acordado para rol no directivo en la parte pública/autor). |
| Directiva  | **Todo** el expediente, incluida posible **nota interna** no visible al usuario/ autor estándar. |

---

## Identidad y anonimato

- Las sugerencias pueden ser **anónimas** o con **alias** indicado en el envío.
- Implica decisiones explícitas sobre:
  - **Notificaciones** (canal, sin PII si es anónimo puro).
  - **Reapertura / seguimiento** por el mismo interlocutor sin cuenta.
  - **RGPD**: conservación, base legal, derecho de supresión vs interés legítimo de archivo.

*(Detallar política concreta en subsección cuando esté aprobada.)*

---

## Odoo

- El **expediente canónico** vive en **esta aplicación**.
- **Odoo** actúa como **espejo / lead** (sincronización o creación reflejada según diseño técnico).
- Evitar dos “hilos de verdad” sin reglas: documentar qué campos se espejan y con qué frecuencia o disparadores.

---

## Clonación “para nuevo”

- No es solo copiar texto: es **clonación de expediente** con **metadatos** y **adjuntos seleccionados** por quien clona (directiva u operador autorizado).
- Definir en implementación: qué estados puede tener el clon (p. ej. siempre “iniciado”), qué historial se excluye por defecto.

---

## Archivo consultable (a largo plazo)

Debe poder consultarse años después, entre otros:

- PDF u otros **justificativos** relevantes.
- **Hilo** acorde a políticas de visibilidad (y exportación si aplica).
- **Adjuntos** indexados con metadatos (tipo, fecha, autor).
- **Enlaces** a registros en Odoo u otros sistemas.
- Resultado de **clonación** como acelerador de casos similares, sin sustituir el registro del expediente original.

---

## Gestor de expedientes (módulo Documentación)

Se incorpora como una opción más dentro del módulo **Documentación**, junto a las existentes. Reúne los requisitos previos sobre gestor documental y añade los siguientes:

### Captura y almacenamiento

- La **apertura de expediente** se produce por **decisión de la junta directiva**, a partir de solicitudes presentadas por sus miembros y que pueden proceder de **delegados**, **sugerencias**, **requisitos legales** u otras fuentes.
- Doble almacenamiento: en **esta aplicación** (registro canónico) y en **Odoo** lo que le atañe (espejo / lead, ver sección *Odoo*).
- Los expedientes contienen **documentos anexos** en formatos heterogéneos (**PDF, imágenes, doc, hoja de cálculo, etc.**). En todos los casos se guarda la **URL** del archivo en la base de datos, organizándose los archivos en **carpetas** del repositorio documental.

### Indexación y metadatos

- Cada documento se **etiqueta** para clasificación con, al menos: **número**, **denominación**, **acta**, **fecha**, **id de origen** y campos equivalentes.
- El catálogo de etiquetas debe ser **ampliable** en el futuro y permitir **modificar las existentes** para adecuarlas a nuevas etiquetas (sin perder los enlaces de los documentos ya clasificados).

### Agrupación de expedientes (expedientes virtuales)

- Los documentos se **agruparán en expedientes virtuales** para facilitar consultas: un mismo documento puede pertenecer a (o referenciarse desde) más de un expediente sin duplicarse físicamente.

### Estructura tipológica

- Tipologías iniciales de expediente:
  - **Sugerencias**
  - **Eventos**
  - **Actividades**
  - **Administración**
  - **Subvenciones**
- Tabla ampliable: añadir nuevas tipologías sin migración disruptiva.

### Gestión de accesos

El gestor de expedientes está disponible **simultáneamente** para dos roles, ubicado en menús distintos pero apuntando al mismo módulo:

| Rol         | Ubicación en menú                         | Alcance |
| ----------- | ----------------------------------------- | ------- |
| Contable    | Dentro de **Documentación**               | Acceso completo: **Abrir**, **Continuar** y **Cerrar** expedientes (valoración, cierre de cuentas, archivo, informes…). |
| Directivo   | Entrada propia **Gestión de expedientes** | Acceso a **Abrir** y **Continuar** expedientes. **No** ejecuta cierre. |
| Delegado    | (consultas)                               | Consultas dirigidas a su ámbito de información. |
| Socio       | (consultas)                               | Consultas acotadas a la información que le corresponda (la suya y la pública). |

> Las reglas finas de filtrado por expediente/tipología se definen al implementar cada vista. Toda consulta queda registrada para auditoría.

### Acciones de junta sobre un expediente

Desde el **acta** de la junta se toman tres tipos de decisión sobre un expediente. Cada decisión queda registrada como un **movimiento** del expediente, con referencia al acta:

| Acción      | Cuándo               | Efecto típico                                                                                                                                                                | Roles que pueden ejecutarla |
| ----------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Abrir**   | Acta de junta        | **Crear** un expediente **exclusivamente** a partir de una *propuesta a la junta* resuelta como `expediente_abierto`. Estado pasa a `en_curso`.                              | Contable, Directivo         |
| **Continuar** | En curso         | Registrar **seguimiento**: nuevas acciones, asignación de responsables, hitos, plazos, documentos generados. Estado se mantiene en `en_curso`.                              | Contable, Directivo         |
| **Cerrar**  | Final del ciclo      | **Valoración**, **cierre de cuentas**, **archivo**, **informes finales**. Estado pasa al terminal único (`cerrado` / archivado). El expediente queda inmutable salvo lectura/exportación. | Contable                    |

> En V1 el cierre lo gestiona **exclusivamente** Contable. El directivo puede dejar el expediente preparado para cierre (con un movimiento *continuar* que incluya observaciones), pero el cambio de estado terminal lo realiza Contable, garantizando trazabilidad contable y de archivo.

#### Estados del expediente (V1)

| Estado     | Cuándo aplica |
| ---------- | ------------- |
| `en_curso` | Desde la **acción Abrir** y mientras haya cualquier **Continuar**. |
| `cerrado`  | Tras la **acción Cerrar** (cierre semántico + archivo). |

#### Registro de movimientos

Cada acción de junta queda persistida como una fila en `db_expediente_movimientos` con:

- `expediente_id` (FK a `db_expedientes.id`).
- `tipo` (`abrir | continuar | cerrar`).
- `acta_id` (nullable; FK a `db_actas` cuando exista el módulo de actas).
- `fecha` (fecha del acta / decisión).
- `autor_user_id` (FK a `db_users.id`, usuario directivo/contable que registra).
- `notas` (texto libre con seguimiento, responsables, hitos, informes, etc.).

Así puede reconstruirse el historial completo: cuándo se abrió, qué decisiones de continuación se tomaron, y cuándo (y por quién) se cerró.

### Búsqueda rápida

- Localización **instantánea** de documentos por **palabras clave**, **fecha** o **tipo de documento** (PDF, imagen, doc…).
- Búsqueda combinable con los filtros de metadatos / etiquetas y por tipología de expediente.

### Control de versiones

- Se mantiene **historial de modificaciones** de cada documento.
- La aplicación garantiza que las consultas y firmas usan **la versión más reciente** (con acceso al histórico cuando proceda).

### Firma digital

- Posibilidad de **firmar documentos** por:
  - **Miembros de la junta** (actas, resoluciones, justificantes internos).
  - **Socios** (autorizaciones, consentimientos, inscripciones que lo requieran).
- Se registra trazabilidad de quién firma, cuándo y sobre qué versión.

### Integración con módulo documental (API)

- La base de datos de **socios** de la app se conecta vía **API** con un **repositorio documental seguro en la nube**.
- El repositorio aloja los archivos físicos; la app guarda las URLs, metadatos y permisos.
- "**Seguridad de nivel bancario**": cifrado en tránsito y en reposo, control de accesos por rol, registros de acceso (audit log).

### Automatización de flujos

- **Alertas** y **avisos automáticos** en fechas indicadas del proceso del expediente (vencimientos, recordatorios, plazos legales).
- **Facilidad para generar el siguiente documento** del flujo aportando los datos ya conocidos del expediente. Ejemplos:
  - Generar **acta** a partir de los datos de la **convocatoria** (orden del día, asistentes previstos, fecha, sede).
  - Generar **memoria/justificación** a partir del expediente de subvención.
- Mapear cada tipología de expediente a su flujo y sus disparadores.

### Objetivos del módulo

- **Reducir el tiempo de búsqueda** de información y el uso de papel.
- **Centralizar la información** con seguridad de nivel bancario, evitando pérdidas de documentos sensibles.
- Ofrecer a los socios una **experiencia profesional y rápida** para sus trámites, con consultas disponibles para su seguimiento.
- Facilitar el **cumplimiento de normativa de protección de datos** controlando quién accede a cada documento.

---

## Historial de este documento

| Fecha      | Cambio |
| ---------- | ------ |
| *(rellenar en commits o a mano)* | Creación del documento con definiciones iniciales acordadas en diseño. |
| 2026-05-21 | Sección **Gestor de expedientes (módulo Documentación)**: captura/almacenamiento, metadatos/etiquetas ampliables, expedientes virtuales, tipologías, accesos por rol, búsqueda rápida, versiones, firma digital, integración API con repositorio cloud, automatización de flujos y objetivos. |
| 2026-05-21 | Sección **Propuestas a la junta (buzón)**: formulario "Propuesta a la junta" (denominación, descripción, decisión solicitada), buzón como fuente del orden del día, efectos de la resolución sobre la sugerencia origen y enlace al gestor de expedientes. Esquema preliminar `db_propuestas_junta`. |
| 2026-05-21 | Decisiones V1 reforzadas: paso a `presentada` + creación de propuesta es **atómico**; **origen V1 = solo sugerencias**; descripción precargada = sugerencia raíz + aportaciones concatenadas con cabecera. |
| 2026-05-22 | Gestor de expedientes accesible desde **Contable** (dentro de *Documentación*) y **Directivo** (entrada propia *Gestión de expedientes*). Tres acciones de junta: **Abrir**, **Continuar**, **Cerrar**. Cierre **exclusivo de Contable**; directivo solo Abrir/Continuar. |
| 2026-05-22 | **Flujo canónico** documentado: `Propuesta → Convocatoria → Acta → Expediente`. Cada paso pre-rellena su formulario con la información del anterior. V1 abre el expediente directamente desde propuesta (atajo); V2 lo abrirá desde el acta. |
| 2026-05-22 | **Convocatorias V1** implementadas: `db_convocatorias` + `db_convocatoria_puntos`, estados `borrador/publicada/celebrada`, orden del día (propuestas del buzón + puntos libres), sincronización atómica con el buzón. Contable escribe; directivo lee. |
| 2026-05-22 | **Actas V1** implementadas: `db_actas` + `db_acta_puntos`, estados `borrador/completa/firmada`, creación desde convocatoria, acuerdos por punto, resolución de propuestas y registro de acción prevista sobre expediente. |
| 2026-05-22 | **Buzón de propuestas V1** con UI propia (`/admin/propuestas-junta`): listado por estado, ficha, edición en `pendiente`, incluir en OD, devolver al buzón y resolver. La sugerencia ya no se pasa a `presentada` desde el selector de la pantalla de sugerencias: se usa el botón **Presentar a la junta** que crea la propuesta atómicamente. Los estados `presentada`, `planificada` y `rechazada` se vuelven **automáticos por flujo**: el selector de edición solo permite `nueva` y `aportaciones`; el backend rechaza con 409 transiciones directas a los demás. `planificada` y `rechazada` se aplican como efecto de resolver una propuesta (o de completar un acta). |
| 2026-05-22 | **Distribución del acta** (V1). Botón **Imprimir** en la ficha del acta y en el histórico de socios: abre una ruta dedicada (`/actas/:id/imprimir`) sin layout, con CSS `@media print`; en estado distinto a `firmada` aparece banner BORRADOR. El histórico de socios (`/historial-actas`) muestra solo actas firmadas y es accesible desde el menú de socio (también para delegado/directivo/contable/administrador). Botón **Enviar por email** disponible cuando el acta está firmada: modal con preselección de la junta (`directivo` + `contable` + `delegado`, query a `db_user_roles`), buscador para añadir socios concretos y campo libre de emails adicionales. Cada envío queda registrado en `db_acta_envios` (asunto, mensaje, lista de destinatarios JSON, total, ok/error). Endpoints públicos: `GET /actas-firmadas` y `GET /actas-firmadas/:id` (autenticación + rol socio o superior). Si SMTP no está configurado, el envío se simula y se loguea. |
| 2026-05-22 | **Integración Acta → Expediente** y **Acciones del expediente** (V1). Nueva tabla `db_expediente_acciones` con responsable (FK `db_users`), estado (`pendiente / hecha / cancelada`), plazo opcional y enlace opcional al movimiento que las creó. Endpoints `POST /admin/actas/:id/puntos/:puntoId/abrir-expediente` y `.../continuar-expediente` que, atómicamente, abren/continúan el expediente, registran el movimiento ligado al acta y crean/editan las acciones. Al **completar el acta**, el backend exige que todo punto con `expediente_accion ∈ {abrir, continuar}` esté ya materializado (`expediente_id` no NULL). En la UI de actas aparece por punto un botón **Configurar expediente** con formulario: para abrir → denominación/descripción/tipología precargados + lista de acciones (mín. 1); para continuar → selector de expediente en curso, acciones existentes (editables/borrables) y nuevas acciones. La ficha del expediente incorpora la **sección de acciones** (alta, edición, marcar hecha/cancelada, borrado) y el botón **Volver a presentar a junta**, que crea una propuesta en el buzón con `origen_tipo='expediente'` (índice único parcial impide duplicados activos). |
| 2026-05-25 | **UX del acta (V2)**: los puntos del orden del día se muestran **siempre expandidos** (sin botón Editar) y se **autoguardan al hacer blur** en cada campo. Cabecera con etiqueta **Pendiente** en cada punto sin acuerdo (o sin resolución si proviene de propuesta) y banner-aviso al pie de cabecera resumiendo cuántos puntos faltan por decidir antes de poder marcar el acta como `completa`. El selector de *resolución de propuesta* solo se habilita cuando el punto procede de una propuesta. **Lectura ampliada**: el rol **`delegado`** puede entrar al gestor de actas como solo-lectura y únicamente ve actas en estado `completa` o `firmada`; el listado y el detalle filtran borradores automáticamente. **Visibilidad para socios**: la página pública *Quiénes Somos* (`/quienes-somos`) incorpora una pestaña **Actas** visible para roles `socio` y superiores, que reutiliza el componente `HistorialActas` en modo embebido y muestra las actas firmadas con visor e impresión. Se mantiene la ruta directa `/historial-actas` y la entrada del menú de socio como atajo redundante. |
| 2026-05-25 | **Archivo PDF del acta firmada** (V1). El acta se firma subiendo el **PDF firmado** desde el modal `Firmar acta y archivar PDF`. El archivo se guarda en `artifacts/api-server/uploads/actas/<YYYY>/<MM>/` con nombre `YYYY-MM-<slug-del-titulo>.pdf` para que la búsqueda alfabética coincida con el orden cronológico. Si ya hay otra acta firmada con la misma clave `YYYY-MM`, se muestra el aviso de duplicados (lista con número, título, fecha y enlace) y el nuevo PDF recibe sufijo numérico (`-2`, `-3`, ...). Se añaden a `db_actas` las columnas `pdf_url`, `pdf_filename`, `pdf_anyo_mes`, `pdf_size`, `pdf_subido_en`, `pdf_subido_por` y un índice parcial por `pdf_anyo_mes`. Endpoints `GET /admin/actas/:id/duplicados-mes` (preconsulta de duplicados) y `POST /admin/actas/:id/firmar` (body `{ pdf_data_url }`, valida `data:application/pdf;base64,...`, tope de 25 MB, devuelve `suffix` y `duplicados_mes`). En la ficha del acta firmada, en el histórico de socios y en la vista de impresión aparece el botón **Descargar PDF**. Migración idempotente: `lib/db/fix-db-actas-pdf.sql`. |
| 2026-05-25 | **Propuesta a la junta V2 — estado `borrador`**. Se separa **crear** de **presentar**: el modal "Generar propuesta" desde la ficha de la sugerencia ofrece dos botones: **Crear propuesta (borrador)** y **Presentar a la junta**. La propuesta nace como `borrador` (privada del directivo, no aparece en el buzón con su filtro por defecto) o directamente como `pendiente` (visible para todo el equipo). Mientras la propuesta esté en `borrador`, la sugerencia origen NO se marca como `presentada` (lo hará al pasar a `pendiente`). Nuevo estado `borrador` en `PROPUESTA_ESTADOS_BUZON`. El PUT y los endpoints de adjunto admiten ahora ambos estados (`borrador` y `pendiente`). Endpoint nuevo `POST /admin/propuestas-junta/:id/presentar`: pasa la propuesta de `borrador` a `pendiente` y, si procede de sugerencia, propaga el estado `presentada` a la raíz y aportaciones. Los índices únicos parciales `db_propuestas_junta_sugerencia_activa_uq` y `..._expediente_activa_uq` incluyen ahora `borrador` (DROP + CREATE en la migración). UI: `BuzonPropuestas` lista el filtro `borrador`, permite editar la propuesta en ese estado y muestra el botón **Presentar a la junta** cuando corresponde. |
| 2026-05-25 | **Propuesta a la junta V2 — antecedentes** y separación documental respecto al acta. Una propuesta tiene ahora tres bloques editables principales: **Denominación** (título), **Descripción** (un único campo de texto largo con plantilla rellenable para `Objetivo`, `Necesidad que cubre`, `Pasos a dar` y `Beneficios esperados`) y **Solicitud concreta** (label visible de `decision_solicitada`, sin cambio de columna). Se añade el bloque **Antecedentes**: campo de texto largo precargado con la sugerencia y sus aportaciones (o con los datos del expediente) más, opcionalmente, un **adjunto PDF**. Los antecedentes y el adjunto **viajan al orden del día** (`db_convocatoria_puntos.antecedentes`, `antecedentes_url`, `antecedentes_filename`) como snapshot al añadir el punto desde el buzón, pero **no se copian al acta**: el `INSERT INTO db_acta_puntos` sigue limitándose a `titulo`/`descripcion`/`notas`. Columnas nuevas en `db_propuestas_junta`: `antecedentes`, `antecedentes_url`, `antecedentes_filename`, `antecedentes_size`, `antecedentes_subido_en`, `antecedentes_subido_por`. Endpoints: `POST /admin/propuestas-junta/:id/antecedentes-adjunto` (body `{ pdf_data_url, original_name? }`, tope 25 MB, almacena en `artifacts/api-server/uploads/propuestas/<id>/<slug>-<uuid>.pdf`) y `DELETE` para borrarlo. El PUT acepta `antecedentes` (texto). El preview desde sugerencia/expediente devuelve ahora `{ denominacion, descripcion (plantilla), antecedentes }`. UI: `BuzonPropuestas` y `AdminGestionSugerencias` muestran y editan los nuevos campos; `GestionConvocatorias` despliega los antecedentes y el enlace al adjunto bajo cada punto del orden del día; `GestionActas` ignora deliberadamente los antecedentes en preview y en la edición del acta. Migración idempotente: `lib/db/fix-db-propuestas-junta-antecedentes.sql`. |
