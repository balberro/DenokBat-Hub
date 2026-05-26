import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  Inbox,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FilePlus2,
  Paperclip,
  Trash2,
  Download,
  Send,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Propuesta = {
  id: number;
  creado_en: string | null;
  actualizado_en: string | null;
  origen_tipo: string;
  origen_id: number | null;
  denominacion: string;
  descripcion: string;
  decision_solicitada: string;
  estado_buzon: string;
  junta_id: number | null;
  resultado: string | null;
  resuelta_en: string | null;
  expediente_id: number | null;
  observaciones: string | null;
  antecedentes: string | null;
  antecedentes_url: string | null;
  antecedentes_filename: string | null;
  antecedentes_size: number | null;
  antecedentes_subido_en: string | null;
};

type OrigenSugerencia = {
  id: number;
  numero_sugerencia?: number | null;
  numeroSugerencia?: number | null;
  estado: string;
  tema?: string | null;
} | null;

const ESTADOS_BUZON = ["borrador", "pendiente", "en_orden_dia", "resuelta"] as const;
const DECISIONES = ["rechazada", "mas_aportaciones", "abrir_expediente", "cerrar_expediente"] as const;
const RESULTADOS = ["rechazada", "mas_aportaciones", "expediente_abierto"] as const;
type Resultado = (typeof RESULTADOS)[number];
type Decision = (typeof DECISIONES)[number];

export default function BuzonPropuestas() {
  const token = useStore((s) => s.token);
  const { t } = useTranslation();

  const labelEstado = (e: string) =>
    (ESTADOS_BUZON as readonly string[]).includes(e) ? t(`buzon.estado.${e}`) : e;
  const labelDecision = (d: string) =>
    (DECISIONES as readonly string[]).includes(d) ? t(`buzon.decision.${d}`) : d;
  const labelResultado = (r: string) =>
    (RESULTADOS as readonly string[]).includes(r) ? t(`buzon.resultado.${r}`) : r;

  const [estadoFiltro, setEstadoFiltro] = useState<string>("pendiente");
  const [decisionFiltro, setDecisionFiltro] = useState<string>("");
  const [items, setItems] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<{
    propuesta: Propuesta;
    origen_sugerencia: OrigenSugerencia;
  } | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    denominacion: "",
    descripcion: "",
    decision_solicitada: "abrir_expediente" as Decision,
    observaciones: "",
    antecedentes: "",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [adjuntoSaving, setAdjuntoSaving] = useState(false);

  const [resolverForm, setResolverForm] = useState<{
    open: boolean;
    resultado: Resultado;
    observaciones: string;
  }>({ open: false, resultado: "expediente_abierto", observaciones: "" });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (estadoFiltro) q.set("estado_buzon", estadoFiltro);
      if (decisionFiltro) q.set("decision_solicitada", decisionFiltro);
      const r = await fetch(`${API_BASE}/api/admin/propuestas-junta?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setItems((d.items as Propuesta[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, estadoFiltro, decisionFiltro]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadFicha = useCallback(
    async (id: number) => {
      if (!token) return;
      setSelectedId(id);
      setMsg(null);
      setEditMode(false);
      setResolverForm({ open: false, resultado: "expediente_abierto", observaciones: "" });
      const r = await fetch(`${API_BASE}/api/admin/propuestas-junta/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) {
        setDetalle(null);
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setDetalle(d);
      const p = d.propuesta as Propuesta;
      setEditForm({
        denominacion: p.denominacion,
        descripcion: p.descripcion,
        decision_solicitada: (DECISIONES.includes(p.decision_solicitada as Decision)
          ? p.decision_solicitada
          : "abrir_expediente") as Decision,
        observaciones: p.observaciones ?? "",
        antecedentes: p.antecedentes ?? "",
      });
    },
    [token, t],
  );

  async function guardarEdicion() {
    if (!token || !detalle) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/propuestas-junta/${detalle.propuesta.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          denominacion: editForm.denominacion,
          descripcion: editForm.descripcion,
          decision_solicitada: editForm.decision_solicitada,
          observaciones: editForm.observaciones,
          antecedentes: editForm.antecedentes,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("buzon.saved"));
      setEditMode(false);
      await loadList();
      await loadFicha(detalle.propuesta.id);
    } finally {
      setSaving(false);
    }
  }

  async function postSimple(path: string) {
    if (!token || !detalle) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/propuestas-junta/${detalle.propuesta.id}/${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("buzon.saved"));
      await loadList();
      await loadFicha(detalle.propuesta.id);
    } finally {
      setSaving(false);
    }
  }

  async function leerArchivoComoDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("read error"));
      reader.readAsDataURL(file);
    });
  }

  async function subirAdjunto(file: File) {
    if (!token || !detalle) return;
    if (file.type !== "application/pdf") {
      setMsg(t("buzon.antecedentes.solo_pdf"));
      return;
    }
    setAdjuntoSaving(true);
    setMsg(null);
    try {
      const dataUrl = await leerArchivoComoDataUrl(file);
      const r = await fetch(
        `${API_BASE}/api/admin/propuestas-junta/${detalle.propuesta.id}/antecedentes-adjunto`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pdf_data_url: dataUrl, original_name: file.name }),
        },
      );
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("buzon.antecedentes.subido"));
      await loadFicha(detalle.propuesta.id);
    } finally {
      setAdjuntoSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function borrarAdjunto() {
    if (!token || !detalle) return;
    if (!window.confirm(t("buzon.antecedentes.borrar_confirm"))) return;
    setAdjuntoSaving(true);
    setMsg(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/propuestas-junta/${detalle.propuesta.id}/antecedentes-adjunto`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("buzon.antecedentes.borrado"));
      await loadFicha(detalle.propuesta.id);
    } finally {
      setAdjuntoSaving(false);
    }
  }

  async function confirmarResolver() {
    if (!token || !detalle) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/propuestas-junta/${detalle.propuesta.id}/resolver`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resultado: resolverForm.resultado,
            observaciones: resolverForm.observaciones || undefined,
          }),
        },
      );
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("buzon.resuelta_ok"));
      setResolverForm({ open: false, resultado: "expediente_abierto", observaciones: "" });
      await loadList();
      await loadFicha(detalle.propuesta.id);
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <p className="p-8 text-center text-muted-foreground">{t("buzon.login_required")}</p>
    );
  }

  const p = detalle?.propuesta;
  const origen = detalle?.origen_sugerencia ?? null;
  const numeroSug = origen?.numero_sugerencia ?? origen?.numeroSugerencia ?? null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Inbox className="w-7 h-7 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">{t("buzon.title")}</h1>
      </div>
      <p className="text-sm text-muted-foreground">{t("buzon.intro")}</p>

      <div className="flex flex-wrap gap-4 items-end bg-white rounded-2xl border border-border p-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t("buzon.estado_label")}
          </label>
          <select
            className="px-3 py-2 rounded-lg border border-border"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="">{t("buzon.all")}</option>
            {ESTADOS_BUZON.map((e) => (
              <option key={e} value={e}>
                {labelEstado(e)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t("buzon.decision_label")}
          </label>
          <select
            className="px-3 py-2 rounded-lg border border-border"
            value={decisionFiltro}
            onChange={(e) => setDecisionFiltro(e.target.value)}
          >
            <option value="">{t("buzon.all")}</option>
            {DECISIONES.map((d) => (
              <option key={d} value={d}>
                {labelDecision(d)}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadList()}>
          {t("buzon.refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold">
            {t("buzon.list")} ({items.length})
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t("buzon.empty")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">{t("buzon.denominacion")}</th>
                    <th className="text-left p-2">{t("buzon.decision_label")}</th>
                    <th className="text-left p-2">{t("buzon.estado_label")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-border cursor-pointer hover:bg-muted/30 ${
                        selectedId === row.id ? "bg-primary/10" : ""
                      }`}
                      onClick={() => void loadFicha(row.id)}
                    >
                      <td className="p-2">{row.id}</td>
                      <td className="p-2 line-clamp-2">{row.denominacion}</td>
                      <td className="p-2">{labelDecision(row.decision_solicitada)}</td>
                      <td className="p-2">{labelEstado(row.estado_buzon)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-lg font-bold">{t("buzon.detail")}</h2>
          {!p ? (
            <p className="text-sm text-muted-foreground">{t("buzon.pick_row")}</p>
          ) : (
            <>
              <div className="text-xs space-y-1 text-muted-foreground border-b border-border pb-3">
                <p>
                  <span className="font-semibold text-foreground">ID:</span> {p.id}
                </p>
                <p>
                  <span className="font-semibold text-foreground">{t("buzon.estado_colon")}</span>{" "}
                  {labelEstado(p.estado_buzon)}
                </p>
                {p.junta_id ? (
                  <p>
                    <span className="font-semibold text-foreground">{t("buzon.junta_colon")}</span> #
                    {p.junta_id}
                  </p>
                ) : null}
                {p.resultado ? (
                  <p>
                    <span className="font-semibold text-foreground">{t("buzon.resultado_colon")}</span>{" "}
                    {labelResultado(p.resultado)}
                  </p>
                ) : null}
                {origen ? (
                  <p>
                    <span className="font-semibold text-foreground">{t("buzon.origen_colon")}</span>{" "}
                    {t("buzon.sugerencia")} #{origen.id}
                    {numeroSug != null ? ` (n.º ${numeroSug})` : ""} — {labelEstado(String(origen.estado ?? ""))}
                  </p>
                ) : null}
              </div>

              {!editMode ? (
                <>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {t("buzon.denominacion")}
                    </p>
                    <p className="font-medium">{p.denominacion}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {t("buzon.descripcion")}
                    </p>
                    <pre className="whitespace-pre-wrap text-sm font-sans">{p.descripcion}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {t("buzon.solicitud_concreta")}
                    </p>
                    <p className="text-sm">{labelDecision(p.decision_solicitada)}</p>
                  </div>
                  {p.antecedentes ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {t("buzon.antecedentes.titulo")}
                      </p>
                      <pre className="whitespace-pre-wrap text-sm font-sans bg-muted/30 rounded-lg p-3 border border-border">
                        {p.antecedentes}
                      </pre>
                    </div>
                  ) : null}
                  {p.antecedentes_url ? (
                    <div className="text-sm flex items-center gap-2 flex-wrap">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={`${API_BASE}${p.antecedentes_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {p.antecedentes_filename ?? t("buzon.antecedentes.adjunto")}
                      </a>
                      {p.antecedentes_size ? (
                        <span className="text-xs text-muted-foreground">
                          ({Math.max(1, Math.round(p.antecedentes_size / 1024))} KB)
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {p.observaciones ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {t("buzon.observaciones")}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{p.observaciones}</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t("buzon.denominacion")}</label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      value={editForm.denominacion}
                      onChange={(e) => setEditForm((f) => ({ ...f, denominacion: e.target.value }))}
                      placeholder={t("buzon.denominacion_placeholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {t("buzon.descripcion")}
                    </label>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("buzon.descripcion_ayuda")}
                    </p>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm min-h-[200px] font-mono"
                      value={editForm.descripcion}
                      onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {t("buzon.solicitud_concreta")}
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      value={editForm.decision_solicitada}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          decision_solicitada: e.target.value as Decision,
                        }))
                      }
                    >
                      {DECISIONES.map((d) => (
                        <option key={d} value={d}>
                          {labelDecision(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {t("buzon.antecedentes.titulo")}
                    </label>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("buzon.antecedentes.ayuda")}
                    </p>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm min-h-[140px]"
                      value={editForm.antecedentes}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, antecedentes: e.target.value }))
                      }
                    />
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void subirAdjunto(f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={adjuntoSaving}
                      >
                        <Paperclip className="w-4 h-4" />
                        {p.antecedentes_url
                          ? t("buzon.antecedentes.reemplazar_pdf")
                          : t("buzon.antecedentes.subir_pdf")}
                      </Button>
                      {p.antecedentes_url ? (
                        <>
                          <a
                            href={`${API_BASE}${p.antecedentes_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary underline"
                          >
                            <Download className="w-4 h-4" />
                            {p.antecedentes_filename ?? t("buzon.antecedentes.adjunto")}
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            className="gap-1.5 text-destructive"
                            onClick={() => void borrarAdjunto()}
                            disabled={adjuntoSaving}
                          >
                            <Trash2 className="w-4 h-4" />
                            {t("common.delete")}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t("buzon.observaciones")}</label>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm min-h-[72px]"
                      value={editForm.observaciones}
                      onChange={(e) => setEditForm((f) => ({ ...f, observaciones: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {msg ? <p className="text-sm text-primary font-medium">{msg}</p> : null}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                {(p.estado_buzon === "pendiente" || p.estado_buzon === "borrador") && !editMode && (
                  <Button type="button" onClick={() => setEditMode(true)}>
                    {t("buzon.edit")}
                  </Button>
                )}
                {p.estado_buzon === "borrador" && !editMode && (
                  <Button
                    type="button"
                    className="gap-1.5"
                    onClick={() => void postSimple("presentar")}
                    disabled={saving}
                  >
                    <Send className="w-4 h-4" />
                    {t("buzon.presentar_a_junta")}
                  </Button>
                )}
                {p.estado_buzon === "pendiente" && !editMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => void postSimple("incluir-orden-dia")}
                    disabled={saving}
                  >
                    <CalendarClock className="w-4 h-4" />
                    {t("buzon.incluir_od")}
                  </Button>
                )}
                {p.estado_buzon === "en_orden_dia" && !editMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => void postSimple("reabrir")}
                    disabled={saving}
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t("buzon.reabrir")}
                  </Button>
                )}
                {(p.estado_buzon === "pendiente" || p.estado_buzon === "en_orden_dia") && !editMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() =>
                      setResolverForm({
                        open: true,
                        resultado: "expediente_abierto",
                        observaciones: "",
                      })
                    }
                    disabled={saving}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t("buzon.resolver")}
                  </Button>
                )}
                {editMode && (
                  <>
                    <Button type="button" onClick={() => void guardarEdicion()} disabled={saving}>
                      {saving ? t("common.saving") : t("common.save")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditMode(false)}>
                      {t("common.cancel")}
                    </Button>
                  </>
                )}
              </div>

              {resolverForm.open && (
                <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FilePlus2 className="w-4 h-4" /> {t("buzon.resolver_title")}
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {t("buzon.resultado_colon")}
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      value={resolverForm.resultado}
                      onChange={(e) =>
                        setResolverForm((f) => ({ ...f, resultado: e.target.value as Resultado }))
                      }
                    >
                      {RESULTADOS.map((r) => (
                        <option key={r} value={r}>
                          {labelResultado(r)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("buzon.resolver_help")}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {t("buzon.observaciones")}
                    </label>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm min-h-[72px]"
                      value={resolverForm.observaciones}
                      onChange={(e) =>
                        setResolverForm((f) => ({ ...f, observaciones: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => void confirmarResolver()} disabled={saving}>
                      {saving ? t("common.saving") : t("buzon.resolver_confirm")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setResolverForm({
                          open: false,
                          resultado: "expediente_abierto",
                          observaciones: "",
                        })
                      }
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
