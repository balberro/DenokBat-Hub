/** Definición de grupos/campos extra (alineada con el backend `parseGruposCamposJson`). */

export type AsociacionCampoExtraUi = {
  id: string;
  label_es: string;
  label_eu: string;
  tipo: "text" | "textarea";
};

export type AsociacionGrupoCamposUi = {
  id: string;
  titulo_es: string;
  titulo_eu: string;
  campos: AsociacionCampoExtraUi[];
};

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function normTipo(raw: unknown): "text" | "textarea" {
  const t = String(raw ?? "text").trim().toLowerCase();
  return t === "textarea" ? "textarea" : "text";
}

/** `null` = JSON o estructura inválida; `[]` = sin grupos. */
export function parseGruposCamposJsonUi(raw: string): AsociacionGrupoCamposUi[] | null {
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
    const out: AsociacionGrupoCamposUi[] = [];
    for (const gItem of arr) {
      if (!gItem || typeof gItem !== "object") continue;
      const g = gItem as Record<string, unknown>;
      const gid = String(g.id ?? "").trim();
      if (!ID_RE.test(gid)) continue;
      const titulo_es = String(g.titulo_es ?? g.tituloEs ?? "").trim();
      const titulo_eu = String(g.titulo_eu ?? g.tituloEu ?? titulo_es).trim();
      const camposRaw = Array.isArray(g.campos) ? g.campos : [];
      if (camposRaw.length > 40) return null;
      const campos: AsociacionCampoExtraUi[] = [];
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
