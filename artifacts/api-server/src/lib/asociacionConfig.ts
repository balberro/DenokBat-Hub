import { db } from "@workspace/db";
import { configTable } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";

/** Claves en `db_config` (máx. 100 caracteres por clave). */
export const ASOCIACION_DB_KEYS = [
  "asociacion.nombre",
  "asociacion.nombre_eu",
  "asociacion.cif",
  "asociacion.direccion",
  "asociacion.codigo_postal",
  "asociacion.poblacion",
  "asociacion.provincia",
  "asociacion.pais",
  "asociacion.web",
  "asociacion.email",
  "asociacion.telefono",
  "asociacion.cuota_ingreso_socio",
  "asociacion.cuota_anual_socio",
  "asociacion.numero_cuenta_banco",
  "asociacion.iban_cuotas",
  "asociacion.texto_instrucciones_pago",
  "asociacion.metodos_pago_solicitud_json",
  "asociacion.grupos_campos_json",
] as const;

export type AsociacionDbKey = (typeof ASOCIACION_DB_KEYS)[number];

export type AsociacionDatosPublic = {
  nombre: string;
  nombreEu: string;
  cif: string;
  direccion: string;
  codigoPostal: string;
  poblacion: string;
  provincia: string;
  pais: string;
  web: string;
  email: string;
  telefono: string;
  cuotaIngresoSocio: string;
  cuotaAnualSocio: string;
  /** Número de cuenta (p. ej. CCC) para transferencias; distinto del IBAN si se desea mostrar ambos. */
  numeroCuentaBanco: string;
  ibanCuotas: string;
  textoInstruccionesPago: string;
  /** JSON (array de `{ id, label_es, label_eu }`) para solicitud de socio; vacío = usar otras fuentes. */
  metodosPagoSolicitudJson: string;
  /** Grupos de campos extra en solicitud de socio (JSON array o `{ "grupos": [...] }`). */
  gruposCamposJson: string;
};

const DB_TO_FIELD: Record<AsociacionDbKey, keyof AsociacionDatosPublic> = {
  "asociacion.nombre": "nombre",
  "asociacion.nombre_eu": "nombreEu",
  "asociacion.cif": "cif",
  "asociacion.direccion": "direccion",
  "asociacion.codigo_postal": "codigoPostal",
  "asociacion.poblacion": "poblacion",
  "asociacion.provincia": "provincia",
  "asociacion.pais": "pais",
  "asociacion.web": "web",
  "asociacion.email": "email",
  "asociacion.telefono": "telefono",
  "asociacion.cuota_ingreso_socio": "cuotaIngresoSocio",
  "asociacion.cuota_anual_socio": "cuotaAnualSocio",
  "asociacion.numero_cuenta_banco": "numeroCuentaBanco",
  "asociacion.iban_cuotas": "ibanCuotas",
  "asociacion.texto_instrucciones_pago": "textoInstruccionesPago",
  "asociacion.metodos_pago_solicitud_json": "metodosPagoSolicitudJson",
  "asociacion.grupos_campos_json": "gruposCamposJson",
};

const FIELD_TO_DB = Object.fromEntries(
  Object.entries(DB_TO_FIELD).map(([k, v]) => [v, k as AsociacionDbKey]),
) as Record<keyof AsociacionDatosPublic, AsociacionDbKey>;

export function emptyAsociacionDatos(): AsociacionDatosPublic {
  return {
    nombre: "",
    nombreEu: "",
    cif: "",
    direccion: "",
    codigoPostal: "",
    poblacion: "",
    provincia: "",
    pais: "",
    web: "",
    email: "",
    telefono: "",
    cuotaIngresoSocio: "",
    cuotaAnualSocio: "",
    numeroCuentaBanco: "",
    ibanCuotas: "",
    textoInstruccionesPago: "",
    metodosPagoSolicitudJson: "",
    gruposCamposJson: "",
  };
}

export async function loadAsociacionDatos(): Promise<AsociacionDatosPublic> {
  const out = emptyAsociacionDatos();
  const rows = await db
    .select()
    .from(configTable)
    .where(inArray(configTable.clave, [...ASOCIACION_DB_KEYS]));
  for (const row of rows) {
    const clave = row.clave as AsociacionDbKey;
    const field = DB_TO_FIELD[clave];
    if (field && row.valor != null) out[field] = String(row.valor);
  }
  return out;
}

export type MetodoPagoOpt = { id: string; label_es: string; label_eu: string };

export function parseMetodosPagoSolicitudJson(raw: string): MetodoPagoOpt[] | null {
  const valor = String(raw ?? "").trim();
  if (!valor) return null;
  try {
    const parsed = JSON.parse(valor) as unknown;
    if (!Array.isArray(parsed)) return null;
    const next: MetodoPagoOpt[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id = String(o.id ?? "").trim();
      if (!id) continue;
      next.push({
        id,
        label_es: String(o.label_es ?? o.labelEs ?? id),
        label_eu: String(o.label_eu ?? o.labelEu ?? o.label_es ?? id),
      });
    }
    return next.length > 0 ? next : null;
  } catch {
    return null;
  }
}

/** Valida el JSON de métodos; devuelve mensaje de error o null si es válido (o cadena vacía). */
export function validateMetodosPagoSolicitudJsonInput(raw: string): string | null {
  const valor = String(raw ?? "").trim();
  if (!valor) return null;
  const parsed = parseMetodosPagoSolicitudJson(valor);
  if (!parsed) return "metodosPagoSolicitudJson debe ser un JSON array no vacío con objetos { id, label_es, label_eu }";
  return null;
}

export type AsociacionCampoExtraDef = {
  id: string;
  label_es: string;
  label_eu: string;
  tipo: "text" | "textarea";
};

export type AsociacionGrupoCamposDef = {
  id: string;
  titulo_es: string;
  titulo_eu: string;
  campos: AsociacionCampoExtraDef[];
};

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function normTipo(raw: unknown): "text" | "textarea" {
  const t = String(raw ?? "text").trim().toLowerCase();
  return t === "textarea" ? "textarea" : "text";
}

/** Lista vacía si `raw` vacío; `null` si JSON inválido o estructura incorrecta. */
export function parseGruposCamposJson(raw: string): AsociacionGrupoCamposDef[] | null {
  const valor = String(raw ?? "").trim();
  if (!valor) return [];
  try {
    const parsed = JSON.parse(valor) as unknown;
    let arr: unknown[] | null = null;
    if (Array.isArray(parsed)) arr = parsed;
    else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { grupos?: unknown }).grupos)) {
      arr = (parsed as { grupos: unknown[] }).grupos;
    }
    if (!arr) return null;
    if (arr.length > 24) return null;
    const out: AsociacionGrupoCamposDef[] = [];
    for (const gItem of arr) {
      if (!gItem || typeof gItem !== "object") continue;
      const g = gItem as Record<string, unknown>;
      const gid = String(g.id ?? "").trim();
      if (!ID_RE.test(gid)) continue;
      const titulo_es = String(g.titulo_es ?? g.tituloEs ?? "").trim();
      const titulo_eu = String(g.titulo_eu ?? g.tituloEu ?? titulo_es).trim();
      const camposRaw = Array.isArray(g.campos) ? g.campos : [];
      if (camposRaw.length > 40) return null;
      const campos: AsociacionCampoExtraDef[] = [];
      for (const cItem of camposRaw) {
        if (!cItem || typeof cItem !== "object") continue;
        const c = cItem as Record<string, unknown>;
        const cid = String(c.id ?? "").trim();
        if (!ID_RE.test(cid)) continue;
        campos.push({
          id: cid,
          label_es: String(c.label_es ?? c.labelEs ?? cid).trim() || cid,
          label_eu: String(c.label_eu ?? c.labelEu ?? c.label_es ?? cid).trim() || cid,
          tipo: normTipo(c.tipo),
        });
      }
      out.push({ id: gid, titulo_es: titulo_es || gid, titulo_eu: titulo_eu || titulo_es || gid, campos });
    }
    return out;
  } catch {
    return null;
  }
}

export function validateGruposCamposJsonInput(raw: string): string | null {
  const valor = String(raw ?? "").trim();
  if (!valor) return null;
  const p = parseGruposCamposJson(valor);
  if (p === null) return "gruposCamposJson: JSON inválido o estructura incorrecta (máx. 24 grupos, ids [a-zA-Z0-9_-]{1,64}).";
  return null;
}

const MAX_DATOS_EXTRA_VAL = 8000;

/** Filtra el cuerpo `datos_extra` del solicitante según la definición de grupos en config. */
export function sanitizeSolicitudDatosExtra(rawBody: unknown, gruposCamposJsonFromConfig: string): string {
  const grupos = parseGruposCamposJson(gruposCamposJsonFromConfig);
  if (!grupos || grupos.length === 0) return "{}";
  if (rawBody == null || typeof rawBody !== "object" || Array.isArray(rawBody)) return "{}";
  const allowed = new Set<string>();
  for (const g of grupos) {
    for (const c of g.campos) {
      allowed.add(`${g.id}.${c.id}`);
    }
  }
  if (allowed.size === 0) return "{}";
  const src = rawBody as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(src)) {
    if (!allowed.has(k)) continue;
    out[k] = String(v ?? "").slice(0, MAX_DATOS_EXTRA_VAL);
  }
  return JSON.stringify(out);
}

export async function upsertAsociacionConfigRows(
  entries: { clave: AsociacionDbKey; valor: string }[],
): Promise<void> {
  const now = new Date();
  for (const { clave, valor } of entries) {
    await db
      .insert(configTable)
      .values({
        clave,
        valor,
        descripcion: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: configTable.clave,
        set: { valor, updatedAt: now },
      });
  }
}

/** Actualiza solo campos presentes en `patch` (parcial). */
export async function applyAsociacionDatosPatch(
  patch: Partial<Record<keyof AsociacionDatosPublic, unknown>>,
): Promise<{ error?: string }> {
  const err = validateMetodosPagoSolicitudJsonInput(
    patch.metodosPagoSolicitudJson != null ? String(patch.metodosPagoSolicitudJson) : "",
  );
  if (err && String(patch.metodosPagoSolicitudJson ?? "").trim()) return { error: err };

  const errGr = validateGruposCamposJsonInput(
    patch.gruposCamposJson != null ? String(patch.gruposCamposJson) : "",
  );
  if (errGr && String(patch.gruposCamposJson ?? "").trim()) return { error: errGr };

  const rows: { clave: AsociacionDbKey; valor: string }[] = [];
  for (const key of Object.keys(patch) as (keyof AsociacionDatosPublic)[]) {
    if (!(key in FIELD_TO_DB)) continue;
    const v = patch[key];
    if (v === undefined) continue;
    const clave = FIELD_TO_DB[key];
    rows.push({ clave, valor: String(v ?? "").trim() });
  }
  if (rows.length === 0) return {};
  await upsertAsociacionConfigRows(rows);
  return {};
}

export function fieldKeys(): (keyof AsociacionDatosPublic)[] {
  return Object.keys(FIELD_TO_DB) as (keyof AsociacionDatosPublic)[];
}
