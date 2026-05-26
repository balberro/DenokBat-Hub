import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Plus, X, Save, Trash2 } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type GrupoListaRow = {
  id: number;
  nombre: string;
  nombre_eu: string | null;
  delegado_id: number | null;
  delegado_nombre: string | null;
  poblaciones: string[] | null;
  num_socios: number;
};

type SocioRow = {
  id: number;
  nombre: string | null;
  apellidos: string | null;
  poblacion: string | null;
  email: string | null;
  telefono: string | null;
  estado: string | null;
  grupoManual?: boolean | null;
};

type SocioHuerfano = {
  id: number;
  nombre: string | null;
  apellidos: string | null;
  poblacion: string | null;
  email: string | null;
  telefono: string | null;
  estado: string | null;
  grupo_manual: boolean;
  poblacion_huerfana: boolean;
};

type PoblacionHuerfana = { poblacion: string; num_socios: number };

type SocioMin = {
  id: number;
  nombre: string;
  apellidos: string;
  poblacion: string | null;
  grupoId: number | null;
};

type Form = {
  id: number | null;
  nombre: string;
  nombre_eu: string;
  delegado_id: string;
  poblaciones: string[];
};

const EMPTY_FORM: Form = {
  id: null,
  nombre: "",
  nombre_eu: "",
  delegado_id: "",
  poblaciones: [],
};

export default function GestionGrupos() {
  const token = useStore((s) => s.token);
  const { t, lang } = useTranslation();

  const [items, setItems] = useState<GrupoListaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [poblacionesDisponibles, setPoblacionesDisponibles] = useState<string[]>([]);
  const [socios, setSocios] = useState<SocioMin[]>([]);
  const [huerfanos, setHuerfanos] = useState<SocioHuerfano[]>([]);
  const [poblacionesHuerfanas, setPoblacionesHuerfanas] = useState<PoblacionHuerfana[]>([]);
  const [asignacionHuerfano, setAsignacionHuerfano] = useState<Record<number, string>>({});
  const [asignandoId, setAsignandoId] = useState<number | null>(null);
  const [filtroHuerfanos, setFiltroHuerfanos] = useState<
    { tipo: "todos" } | { tipo: "poblacion"; valor: string } | null
  >(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [poblacionInput, setPoblacionInput] = useState("");
  const [detalle, setDetalle] = useState<{
    grupo: GrupoListaRow & { updated_at?: string };
    socios_por_poblacion: Record<string, SocioRow[]>;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const loadGrupos = useCallback(async (): Promise<GrupoListaRow[] | null> => {
    if (!token) return null;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/grupos`, { headers });
      const d = await r.json();
      if (r.ok) {
        const list = (d.items ?? []) as GrupoListaRow[];
        setItems(list);
        return list;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadPoblaciones = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE}/api/admin/grupos/poblaciones-disponibles`, { headers });
      const d = await r.json();
      if (r.ok) setPoblacionesDisponibles(d.items ?? []);
    } catch {
      //
    }
  }, [token]);

  const loadSocios = useCallback(async () => {
    if (!token) return;
    try {
      const all: SocioMin[] = [];
      const limit = 100;
      for (let page = 1; page <= 50; page += 1) {
        const r = await fetch(`${API_BASE}/api/socios?page=${page}&limit=${limit}`, { headers });
        if (!r.ok) break;
        const d = await r.json();
        const items = Array.isArray(d.items) ? d.items : [];
        for (const s of items) {
          all.push({
            id: Number(s.id),
            nombre: String(s.nombre ?? ""),
            apellidos: String(s.apellidos ?? ""),
            poblacion: s.poblacion != null ? String(s.poblacion) : null,
            grupoId: s.grupoId != null ? Number(s.grupoId) : null,
          });
        }
        if (items.length < limit) break;
      }
      setSocios(all);
    } catch {
      //
    }
  }, [token]);

  const loadHuerfanos = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE}/api/admin/grupos/socios-huerfanos`, { headers });
      const d = await r.json();
      if (r.ok) {
        setHuerfanos(d.socios_sin_grupo ?? []);
        setPoblacionesHuerfanas(d.poblaciones_huerfanas ?? []);
      }
    } catch {
      //
    }
  }, [token]);

  useEffect(() => {
    void loadGrupos();
    void loadPoblaciones();
    void loadSocios();
    void loadHuerfanos();
  }, [loadGrupos, loadPoblaciones, loadSocios, loadHuerfanos]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMsg(null);
  }

  function openEdit(row: GrupoListaRow) {
    setForm({
      id: row.id,
      nombre: row.nombre ?? "",
      nombre_eu: row.nombre_eu ?? "",
      delegado_id: row.delegado_id != null ? String(row.delegado_id) : "",
      poblaciones: Array.isArray(row.poblaciones) ? [...row.poblaciones] : [],
    });
    setShowForm(true);
    setMsg(null);
  }

  function addPoblacion(p: string) {
    const v = p.trim();
    if (!v) return;
    if (form.poblaciones.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    setForm((f) => ({ ...f, poblaciones: [...f.poblaciones, v] }));
    setPoblacionInput("");
  }
  function removePoblacion(p: string) {
    setForm((f) => ({ ...f, poblaciones: f.poblaciones.filter((x) => x !== p) }));
  }

  async function guardar() {
    if (!token) return;
    if (!form.nombre.trim()) {
      setMsg(t("gestion_grupos.name_required"));
      return;
    }
    if (form.poblaciones.length === 0) {
      setMsg(t("gestion_grupos.populations_required"));
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        nombre: form.nombre.trim(),
        nombre_eu: form.nombre_eu.trim() || null,
        delegado_id: form.delegado_id ? parseInt(form.delegado_id, 10) : null,
        poblaciones: form.poblaciones,
      };
      const url = form.id ? `${API_BASE}/api/admin/grupos/${form.id}` : `${API_BASE}/api/admin/grupos`;
      const method = form.id ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { ...(headers ?? {}), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("gestion_grupos.saved"));
      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadGrupos();
      await loadHuerfanos();
    } finally {
      setSaving(false);
    }
  }

  async function borrar(row: GrupoListaRow) {
    if (!token) return;
    const ok = window.confirm(t("gestion_grupos.delete_confirm").replace("{name}", row.nombre));
    if (!ok) return;
    const r = await fetch(`${API_BASE}/api/admin/grupos/${row.id}`, { method: "DELETE", headers });
    const d = await r.json();
    if (!r.ok) {
      setMsg(String(d?.error ?? t("common.error")));
      return;
    }
    setDetalle(null);
    await loadGrupos();
    await loadHuerfanos();
  }

  async function abrirDetalle(row: GrupoListaRow) {
    if (!token) return;
    setDetalle(null);
    setMsg(null);
    const r = await fetch(`${API_BASE}/api/admin/grupos/${row.id}`, { headers });
    const d = await r.json();
    if (!r.ok) {
      setMsg(String(d?.error ?? t("common.error")));
      return;
    }
    setDetalle({
      grupo: { ...row, ...d.grupo },
      socios_por_poblacion: d.socios_por_poblacion ?? {},
    });
  }

  async function asignarGrupoHuerfano(socioId: number) {
    if (!token) return;
    const raw = asignacionHuerfano[socioId];
    if (!raw) {
      setMsg(t("gestion_grupos.select_group"));
      return;
    }
    const grupoId = parseInt(raw, 10);
    if (!Number.isFinite(grupoId)) {
      setMsg(t("gestion_grupos.invalid_group"));
      return;
    }
    setAsignandoId(socioId);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/socios/${socioId}/grupo`, {
        method: "PUT",
        headers: { ...(headers ?? {}), "Content-Type": "application/json" },
        body: JSON.stringify({ grupo_id: grupoId }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setAsignacionHuerfano((prev) => {
        const next = { ...prev };
        delete next[socioId];
        return next;
      });
      const fresh = await loadGrupos();
      await loadHuerfanos();
      if (detalle && fresh) {
        const gRow = fresh.find((g) => g.id === detalle.grupo.id);
        if (gRow) await abrirDetalle(gRow);
      }
      setMsg(t("gestion_grupos.assignment_saved"));
    } finally {
      setAsignandoId(null);
    }
  }

  async function volverGrupoAutomatico(socioId: number) {
    if (!token) return;
    setAsignandoId(socioId);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/socios/${socioId}/grupo-automatico`, {
        method: "POST",
        headers: headers ?? {},
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      const fresh = await loadGrupos();
      await loadHuerfanos();
      if (detalle && fresh) {
        const gRow = fresh.find((g) => g.id === detalle.grupo.id);
        if (gRow) await abrirDetalle(gRow);
      }
      setMsg(t("gestion_grupos.auto_applied"));
    } finally {
      setAsignandoId(null);
    }
  }

  const delegadoCandidatos = useMemo(() => {
    const pobs = new Set(form.poblaciones.map((p) => p.trim().toLowerCase()).filter(Boolean));
    const elegibles = pobs.size === 0
      ? []
      : socios.filter((s) => s.poblacion && pobs.has(s.poblacion.trim().toLowerCase()));
    const currentId = form.delegado_id ? parseInt(form.delegado_id, 10) : NaN;
    if (Number.isFinite(currentId) && !elegibles.some((s) => s.id === currentId)) {
      const actual = socios.find((s) => s.id === currentId);
      if (actual) elegibles.push(actual);
    }
    return elegibles.sort((a, b) =>
      `${a.apellidos ?? ""} ${a.nombre ?? ""}`.trim().localeCompare(
        `${b.apellidos ?? ""} ${b.nombre ?? ""}`.trim(),
        "es",
      ),
    );
  }, [socios, form.poblaciones, form.delegado_id]);

  const huerfanosFiltrados = useMemo(() => {
    if (!filtroHuerfanos) return [];
    if (filtroHuerfanos.tipo === "todos") return huerfanos;
    const target = filtroHuerfanos.valor.trim().toLowerCase();
    return huerfanos.filter(
      (h) => (h.poblacion ?? "").trim().toLowerCase() === target,
    );
  }, [huerfanos, filtroHuerfanos]);

  const sugerenciasPoblacion = useMemo(() => {
    const yaPuestas = new Set(form.poblaciones.map((p) => p.toLowerCase()));
    const filtro = poblacionInput.trim().toLowerCase();
    return poblacionesDisponibles
      .filter((p) => !yaPuestas.has(p.toLowerCase()))
      .filter((p) => (filtro ? p.toLowerCase().includes(filtro) : true))
      .slice(0, 8);
  }, [poblacionesDisponibles, form.poblaciones, poblacionInput]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t("gestion_grupos.title")}</h2>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          {t("gestion_grupos.new")}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-2xl border-2 border-primary/30 bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">
              {form.id ? t("gestion_grupos.edit") : t("gestion_grupos.new")}
            </h3>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t("gestion_grupos.name_es")} *
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t("gestion_grupos.name_eu")}
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                value={form.nombre_eu}
                onChange={(e) => setForm({ ...form, nombre_eu: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">
                {t("gestion_grupos.populations")} *
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.poblaciones.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary text-xs">
                    {p}
                    <button type="button" className="hover:text-red-600" onClick={() => removePoblacion(p)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 rounded-lg border border-border text-sm"
                  placeholder={t("gestion_grupos.populations_placeholder")}
                  value={poblacionInput}
                  onChange={(e) => setPoblacionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPoblacion(poblacionInput);
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={() => addPoblacion(poblacionInput)}>
                  {t("gestion_grupos.add")}
                </Button>
              </div>
              {sugerenciasPoblacion.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">
                    {t("gestion_grupos.suggestions_label")}
                  </span>
                  {sugerenciasPoblacion.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="text-xs px-2 py-0.5 rounded-full border border-border hover:bg-muted/40"
                      onClick={() => addPoblacion(p)}
                    >
                      + {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">
                {t("gestion_grupos.delegate_optional")}
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                value={form.delegado_id}
                onChange={(e) => setForm({ ...form, delegado_id: e.target.value })}
                disabled={form.poblaciones.length === 0}
              >
                <option value="">{t("gestion_grupos.no_delegate")}</option>
                {delegadoCandidatos.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {`${s.apellidos ?? ""} ${s.nombre ?? ""}`.trim() || `#${s.id}`}
                    {s.poblacion ? ` — ${s.poblacion}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {form.poblaciones.length === 0
                  ? t("gestion_grupos.add_populations_first")
                  : t("gestion_grupos.delegate_from_group_only")}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" disabled={saving} onClick={() => void guardar()} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? t("gestion_grupos.saving") : t("gestion_grupos.save")}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
              {t("gestion_grupos.cancel")}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">{t("gestion_grupos.save_help")}</p>
        </div>
      )}

      {msg ? <p className="text-sm text-primary font-medium">{msg}</p> : null}

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 space-y-3">
        <h3 className="text-base font-semibold text-foreground">{t("gestion_grupos.orphans_title")}</h3>
        <p className="text-xs text-muted-foreground">{t("gestion_grupos.orphans_help")}</p>
        <div className="flex flex-wrap gap-2 text-xs items-center">
          {poblacionesHuerfanas.length > 0 && (
            <>
              <span className="font-semibold text-foreground">{t("gestion_grupos.orphan_populations")}</span>
              {poblacionesHuerfanas.map((p) => {
                const activo =
                  filtroHuerfanos?.tipo === "poblacion" &&
                  filtroHuerfanos.valor.trim().toLowerCase() === p.poblacion.trim().toLowerCase();
                return (
                  <button
                    key={p.poblacion}
                    type="button"
                    onClick={() =>
                      setFiltroHuerfanos(
                        activo ? null : { tipo: "poblacion", valor: p.poblacion },
                      )
                    }
                    className={`px-2 py-0.5 rounded-full border transition-colors ${
                      activo
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    {p.poblacion} ({p.num_socios})
                  </button>
                );
              })}
            </>
          )}
          <button
            type="button"
            onClick={() =>
              setFiltroHuerfanos(
                filtroHuerfanos?.tipo === "todos" ? null : { tipo: "todos" },
              )
            }
            className={`ml-auto px-3 py-1 rounded-full border font-semibold transition-colors ${
              filtroHuerfanos?.tipo === "todos"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white border-amber-300 hover:bg-amber-100"
            }`}
          >
            {t("gestion_grupos.orphans_all_btn")} ({huerfanos.length})
          </button>
        </div>

        {filtroHuerfanos && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-foreground">
              {t("gestion_grupos.orphans_filter_label")}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {filtroHuerfanos.tipo === "todos"
                ? t("gestion_grupos.orphans_filter_all")
                : `${t("gestion_grupos.orphans_filter_population")} ${filtroHuerfanos.valor}`}
            </span>
            <button
              type="button"
              className="underline text-muted-foreground hover:text-foreground"
              onClick={() => setFiltroHuerfanos(null)}
            >
              {t("gestion_grupos.orphans_clear_filter")}
            </button>
          </div>
        )}

        {!filtroHuerfanos ? (
          huerfanos.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("gestion_grupos.no_pending")}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("gestion_grupos.orphans_pick")}</p>
          )
        ) : huerfanosFiltrados.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("gestion_grupos.orphans_no_matches")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-2">{t("gestion_grupos.col_socio")}</th>
                  <th className="p-2">{t("gestion_grupos.col_population")}</th>
                  <th className="p-2">{t("gestion_grupos.col_notes")}</th>
                  <th className="p-2">{t("gestion_grupos.col_group")}</th>
                  <th className="p-2 w-[220px]"></th>
                </tr>
              </thead>
              <tbody>
                {huerfanosFiltrados.map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="p-2">
                      {`${h.apellidos ?? ""} ${h.nombre ?? ""}`.trim() || `#${h.id}`}
                    </td>
                    <td className="p-2">{h.poblacion || "—"}</td>
                    <td className="p-2 text-xs">
                      {h.poblacion_huerfana ? (
                        <span className="text-amber-800 font-medium">{t("gestion_grupos.orphan_population")}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {h.grupo_manual ? (
                        <span className="ml-1 text-primary">{t("gestion_grupos.manual_mark")}</span>
                      ) : null}
                    </td>
                    <td className="p-2">
                      <select
                        className="w-full max-w-[200px] px-2 py-1 rounded border border-border text-xs"
                        value={asignacionHuerfano[h.id] ?? ""}
                        onChange={(e) => setAsignacionHuerfano((prev) => ({ ...prev, [h.id]: e.target.value }))}
                      >
                        <option value="">{t("gestion_grupos.group_short")}</option>
                        {items.map((g) => (
                          <option key={g.id} value={String(g.id)}>
                            {lang === "eu" ? g.nombre_eu || g.nombre : g.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        disabled={asignandoId === h.id}
                        onClick={() => void asignarGrupoHuerfano(h.id)}
                      >
                        {t("gestion_grupos.assign")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-1"
                        disabled={asignandoId === h.id}
                        onClick={() => void volverGrupoAutomatico(h.id)}
                      >
                        {t("gestion_grupos.auto")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold">
            {t("gestion_grupos.list")}
          </div>
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">{t("gestion_grupos.loading")}</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("gestion_grupos.no_groups_yet")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left p-2">{t("gestion_grupos.col_name")}</th>
                  <th className="text-left p-2">{t("gestion_grupos.col_populations")}</th>
                  <th className="text-left p-2">{t("gestion_grupos.col_delegate")}</th>
                  <th className="text-right p-2">{t("gestion_grupos.col_socios")}</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2">
                      <button className="text-primary hover:underline font-medium" onClick={() => void abrirDetalle(row)}>
                        {lang === "eu" ? row.nombre_eu || row.nombre : row.nombre}
                      </button>
                    </td>
                    <td className="p-2">
                      <span className="text-xs text-muted-foreground">
                        {Array.isArray(row.poblaciones) && row.poblaciones.length > 0
                          ? row.poblaciones.join(", ")
                          : "—"}
                      </span>
                    </td>
                    <td className="p-2 text-xs">{row.delegado_nombre || "—"}</td>
                    <td className="p-2 text-right">{row.num_socios}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                        {t("gestion_grupos.edit_btn")}
                      </Button>
                      <Button size="sm" variant="ghost" className="ml-1 text-red-600" onClick={() => void borrar(row)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <h3 className="text-base font-semibold">{t("gestion_grupos.detail")}</h3>
          {!detalle ? (
            <p className="text-sm text-muted-foreground">{t("gestion_grupos.pick_group")}</p>
          ) : (
            <>
              <div className="text-xs space-y-1 text-muted-foreground border-b border-border pb-3">
                <p>
                  <span className="font-semibold text-foreground">{t("gestion_grupos.group_colon")}</span>{" "}
                  {lang === "eu" ? detalle.grupo.nombre_eu || detalle.grupo.nombre : detalle.grupo.nombre}
                </p>
                <p>
                  <span className="font-semibold text-foreground">{t("gestion_grupos.populations_colon")}</span>{" "}
                  {(detalle.grupo.poblaciones ?? []).join(", ") || "—"}
                </p>
                <p>
                  <span className="font-semibold text-foreground">{t("gestion_grupos.delegate_colon")}</span>{" "}
                  {detalle.grupo.delegado_nombre || "—"}
                </p>
              </div>

              {Object.keys(detalle.socios_por_poblacion).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("gestion_grupos.no_members_yet")}</p>
              ) : (
                Object.entries(detalle.socios_por_poblacion)
                  .sort(([a], [b]) => a.localeCompare(b, "es"))
                  .map(([poblacion, lista]) => (
                    <div key={poblacion}>
                      <p className="font-semibold text-sm text-foreground border-b border-border/60 pb-1 mb-2">
                        {poblacion}{" "}
                        <span className="text-xs text-muted-foreground font-normal">({lista.length})</span>
                      </p>
                      <ul className="text-sm space-y-1">
                        {lista.map((s) => (
                          <li key={s.id} className="flex justify-between gap-3 items-center">
                            <span className="text-foreground">
                              {`${s.apellidos ?? ""} ${s.nombre ?? ""}`.trim() || `#${s.id}`}
                              {s.grupoManual ? (
                                <span className="ml-2 text-[10px] uppercase tracking-wide text-primary font-semibold">
                                  {t("gestion_grupos.manual_tag")}
                                </span>
                              ) : null}
                            </span>
                            <span className="text-xs text-muted-foreground">{s.estado ?? ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
