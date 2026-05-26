import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore, getUserRoles } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Plus,
  PlayCircle,
  XCircle,
  Send,
  Trash2,
  CheckCheck,
  ListTodo,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Expediente = {
  id: number;
  numero: number | null;
  denominacion: string;
  descripcion: string;
  tipologia: string;
  estado: string;
  propuesta_id: number | null;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  observaciones: string | null;
};

type Movimiento = {
  id: number;
  expediente_id: number;
  tipo: string;
  acta_id: number | null;
  fecha: string;
  autor_user_id: number | null;
  notas: string | null;
  creado_en: string | null;
};

type PropuestaAbrir = {
  id: number;
  denominacion: string;
  descripcion: string;
  origen_tipo: string;
  origen_id: number | null;
  resuelta_en: string | null;
};

type Usuario = { id: number; nombre: string | null; username: string | null; email: string | null };
type Accion = {
  id: number;
  expediente_id: number;
  movimiento_id: number | null;
  descripcion: string;
  responsable_user_id: number | null;
  responsable_nombre: string | null;
  responsable_username: string | null;
  estado: string;
  plazo: string | null;
  observaciones: string | null;
};

const TIPOLOGIAS = ["sugerencias", "eventos", "actividades", "administracion", "subvenciones"] as const;
const ACCION_ESTADOS = ["pendiente", "hecha", "cancelada"] as const;
const PROPUESTA_DECISIONES = ["rechazada", "mas_aportaciones", "abrir_expediente"] as const;
type PropuestaDecisionLocal = (typeof PROPUESTA_DECISIONES)[number];

export default function GestionExpedientes() {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const { t } = useTranslation();

  const roles = user ? getUserRoles(user) : [];
  const puedeCerrar = roles.includes("contable");
  const puedeAbrirContinuar = roles.includes("directivo") || roles.includes("contable");

  const [vista, setVista] = useState<"listado" | "abrir">("listado");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [tipologiaFiltro, setTipologiaFiltro] = useState("");
  const [items, setItems] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<{ expediente: Expediente; movimientos: Movimiento[] } | null>(null);
  const [propuestas, setPropuestas] = useState<PropuestaAbrir[]>([]);
  const [propuestaSel, setPropuestaSel] = useState<number | null>(null);
  const [formAbrir, setFormAbrir] = useState({
    denominacion: "",
    descripcion: "",
    tipologia: "sugerencias",
    notas: "",
    fecha: "",
    acta_id: "",
  });
  const [formMov, setFormMov] = useState({ notas: "", fecha: "", acta_id: "", observaciones: "" });
  const [accionMov, setAccionMov] = useState<"continuar" | "cerrar" | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosLoaded, setUsuariosLoaded] = useState(false);
  const [nuevaAccion, setNuevaAccion] = useState({
    descripcion: "",
    responsable_user_id: "",
    plazo: "",
    observaciones: "",
  });
  const [editAccionId, setEditAccionId] = useState<number | null>(null);
  const [editAccion, setEditAccion] = useState({
    descripcion: "",
    responsable_user_id: "",
    plazo: "",
    observaciones: "",
    estado: "pendiente",
  });
  const [presentForm, setPresentForm] = useState<{
    open: boolean;
    loading: boolean;
    denominacion: string;
    descripcion: string;
    decision: PropuestaDecisionLocal;
    observaciones: string;
  }>({
    open: false,
    loading: false,
    denominacion: "",
    descripcion: "",
    decision: "abrir_expediente",
    observaciones: "",
  });

  const labelEstado = (e: string) =>
    e === "en_curso" ? t("expedientes.estado.en_curso") : e === "cerrado" ? t("expedientes.estado.cerrado") : e;
  const labelMov = (tipo: string) => {
    if (tipo === "abrir") return t("expedientes.mov.abrir");
    if (tipo === "continuar") return t("expedientes.mov.continuar");
    if (tipo === "cerrar") return t("expedientes.mov.cerrar");
    return tipo;
  };

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (estadoFiltro) q.set("estado", estadoFiltro);
      if (tipologiaFiltro) q.set("tipologia", tipologiaFiltro);
      const r = await fetch(`${API_BASE}/api/admin/expedientes?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setItems(d.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, estadoFiltro, tipologiaFiltro]);

  const loadPropuestas = useCallback(async () => {
    if (!token) return;
    const r = await fetch(`${API_BASE}/api/admin/expedientes/propuestas-pendientes-abrir`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (r.ok) setPropuestas(d.items ?? []);
  }, [token]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (vista === "abrir") void loadPropuestas();
  }, [vista, loadPropuestas]);

  const loadAcciones = useCallback(
    async (expedienteId: number) => {
      if (!token) return;
      const r = await fetch(`${API_BASE}/api/admin/expedientes/${expedienteId}/acciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setAcciones((d.items as Accion[]) ?? []);
    },
    [token],
  );

  const ensureUsuarios = useCallback(async () => {
    if (!token || usuariosLoaded) return;
    try {
      const r = await fetch(`${API_BASE}/api/admin/expedientes/usuarios-seleccionables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setUsuarios((d.items as Usuario[]) ?? []);
      setUsuariosLoaded(true);
    } catch {
      setUsuariosLoaded(true);
    }
  }, [token, usuariosLoaded]);

  async function loadDetalle(id: number) {
    if (!token) return;
    setSelectedId(id);
    setMsg(null);
    setEditAccionId(null);
    setPresentForm((p) => ({ ...p, open: false }));
    const r = await fetch(`${API_BASE}/api/admin/expedientes/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (!r.ok) {
      setDetalle(null);
      setAcciones([]);
      setMsg(String(d?.error ?? t("common.error")));
      return;
    }
    setDetalle(d);
    setFormMov((p) => ({ ...p, observaciones: String(d.expediente?.observaciones ?? "") }));
    await loadAcciones(id);
    await ensureUsuarios();
  }

  async function crearAccion() {
    if (!token || !selectedId) return;
    if (nuevaAccion.descripcion.trim().length < 2) {
      setMsg(t("acciones.error_descripcion"));
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/expedientes/${selectedId}/acciones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          descripcion: nuevaAccion.descripcion,
          responsable_user_id: nuevaAccion.responsable_user_id || null,
          plazo: nuevaAccion.plazo || null,
          observaciones: nuevaAccion.observaciones || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setNuevaAccion({ descripcion: "", responsable_user_id: "", plazo: "", observaciones: "" });
      await loadAcciones(selectedId);
    } finally {
      setSaving(false);
    }
  }

  async function guardarEdicionAccion(accionId: number) {
    if (!token || !selectedId) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/expedientes/${selectedId}/acciones/${accionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            descripcion: editAccion.descripcion,
            responsable_user_id: editAccion.responsable_user_id || null,
            plazo: editAccion.plazo || null,
            observaciones: editAccion.observaciones || null,
            estado: editAccion.estado,
          }),
        },
      );
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setEditAccionId(null);
      await loadAcciones(selectedId);
    } finally {
      setSaving(false);
    }
  }

  async function cambiarEstadoAccion(accionId: number, estado: string) {
    if (!token || !selectedId) return;
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/expedientes/${selectedId}/acciones/${accionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ estado }),
        },
      );
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      await loadAcciones(selectedId);
    } catch {
      setMsg(t("common.network_error"));
    }
  }

  async function borrarAccion(accionId: number) {
    if (!token || !selectedId) return;
    if (!window.confirm(t("acciones.confirm_delete"))) return;
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/expedientes/${selectedId}/acciones/${accionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      await loadAcciones(selectedId);
    } catch {
      setMsg(t("common.network_error"));
    }
  }

  async function abrirPresentarJunta() {
    if (!token || !selectedId) return;
    setPresentForm((p) => ({ ...p, open: true, loading: true }));
    setMsg(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/propuestas-junta/preview/expediente/${selectedId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        setPresentForm((p) => ({ ...p, open: false, loading: false }));
        return;
      }
      setPresentForm((p) => ({
        ...p,
        loading: false,
        denominacion: String(d.denominacion ?? ""),
        descripcion: String(d.descripcion ?? ""),
      }));
    } catch {
      setMsg(t("common.network_error"));
      setPresentForm((p) => ({ ...p, open: false, loading: false }));
    }
  }

  async function confirmarPresentarJunta() {
    if (!token || !selectedId) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/propuestas-junta/desde-expediente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          expediente_id: selectedId,
          denominacion: presentForm.denominacion,
          descripcion: presentForm.descripcion,
          decision_solicitada: presentForm.decision,
          observaciones: presentForm.observaciones || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("expedientes.presentar.ok"));
      setPresentForm((p) => ({ ...p, open: false }));
    } finally {
      setSaving(false);
    }
  }

  const propuestaActual = useMemo(
    () => propuestas.find((p) => p.id === propuestaSel) ?? null,
    [propuestas, propuestaSel],
  );

  useEffect(() => {
    if (!propuestaActual) return;
    setFormAbrir((p) => ({
      ...p,
      denominacion: propuestaActual.denominacion,
      descripcion: propuestaActual.descripcion,
      tipologia: propuestaActual.origen_tipo === "sugerencia" ? "sugerencias" : p.tipologia,
    }));
  }, [propuestaActual]);

  async function abrirExpediente() {
    if (!token || !propuestaSel) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/expedientes/abrir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propuesta_id: propuestaSel,
          denominacion: formAbrir.denominacion,
          descripcion: formAbrir.descripcion,
          tipologia: formAbrir.tipologia,
          notas: formAbrir.notas,
          fecha: formAbrir.fecha || undefined,
          acta_id: formAbrir.acta_id || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("expedientes.msg.abierto"));
      setVista("listado");
      setPropuestaSel(null);
      await loadList();
      const newId = Number(d.expediente?.id);
      if (Number.isFinite(newId)) await loadDetalle(newId);
    } catch {
      setMsg(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  }

  async function ejecutarMovimiento() {
    if (!token || !selectedId || !accionMov) return;
    if (accionMov === "cerrar" && !puedeCerrar) return;
    setSaving(true);
    setMsg(null);
    try {
      const path =
        accionMov === "continuar"
          ? `${API_BASE}/api/admin/expedientes/${selectedId}/continuar`
          : `${API_BASE}/api/admin/expedientes/${selectedId}/cerrar`;
      const r = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notas: formMov.notas,
          fecha: formMov.fecha || undefined,
          acta_id: formMov.acta_id || undefined,
          observaciones: formMov.observaciones,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(
        accionMov === "cerrar" ? t("expedientes.msg.cerrado") : t("expedientes.msg.continuado"),
      );
      setAccionMov(null);
      setFormMov({ notas: "", fecha: "", acta_id: "", observaciones: "" });
      await loadList();
      await loadDetalle(selectedId);
    } catch {
      setMsg(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  }

  const exp = detalle?.expediente;
  const enCurso = exp?.estado === "en_curso";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("menu.gestion_expedientes")}</h1>
            <p className="text-sm text-muted-foreground">{t("expedientes.intro")}</p>
          </div>
        </div>
        {puedeAbrirContinuar && (
          <div className="flex gap-2">
            <Button
              variant={vista === "listado" ? "default" : "outline"}
              onClick={() => setVista("listado")}
            >
              {t("expedientes.tab.listado")}
            </Button>
            <Button
              variant={vista === "abrir" ? "default" : "outline"}
              onClick={() => setVista("abrir")}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("expedientes.tab.abrir")}
            </Button>
          </div>
        )}
      </div>

      {msg && (
        <p className="mb-4 text-sm text-muted-foreground bg-muted/40 rounded-xl px-4 py-2">{msg}</p>
      )}

      {vista === "abrir" && puedeAbrirContinuar && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4 mb-8">
          <h2 className="text-lg font-semibold">{t("expedientes.abrir.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("expedientes.abrir.hint")}</p>
          <select
            value={propuestaSel ?? ""}
            onChange={(e) => setPropuestaSel(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background"
          >
            <option value="">{t("expedientes.abrir.select_propuesta")}</option>
            {propuestas.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} — {p.denominacion}
              </option>
            ))}
          </select>
          {propuestaSel != null && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1 text-muted-foreground">
                  {t("expedientes.field.denominacion")}
                </label>
                <input
                  value={formAbrir.denominacion}
                  onChange={(e) => setFormAbrir((p) => ({ ...p, denominacion: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-muted-foreground">
                  {t("expedientes.field.descripcion")}
                </label>
                <textarea
                  value={formAbrir.descripcion}
                  onChange={(e) => setFormAbrir((p) => ({ ...p, descripcion: e.target.value }))}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background resize-y"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-muted-foreground">
                    {t("expedientes.field.tipologia")}
                  </label>
                  <select
                    value={formAbrir.tipologia}
                    onChange={(e) => setFormAbrir((p) => ({ ...p, tipologia: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background"
                  >
                    {TIPOLOGIAS.map((tb) => (
                      <option key={tb} value={tb}>
                        {t(`expedientes.tipologia.${tb}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-muted-foreground">
                    {t("expedientes.field.fecha_acta")}
                  </label>
                  <input
                    type="date"
                    value={formAbrir.fecha}
                    onChange={(e) => setFormAbrir((p) => ({ ...p, fecha: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-muted-foreground">
                  {t("expedientes.field.notas_abrir")}
                </label>
                <textarea
                  value={formAbrir.notas}
                  onChange={(e) => setFormAbrir((p) => ({ ...p, notas: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background resize-y"
                />
              </div>
              <Button onClick={() => void abrirExpediente()} disabled={saving}>
                {saving ? t("common.saving") : t("expedientes.action.abrir")}
              </Button>
            </>
          )}
        </div>
      )}

      {vista === "listado" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border text-sm"
              >
                <option value="">{t("expedientes.filter.todos_estados")}</option>
                <option value="en_curso">{t("expedientes.estado.en_curso")}</option>
                <option value="cerrado">{t("expedientes.estado.cerrado")}</option>
              </select>
              <select
                value={tipologiaFiltro}
                onChange={(e) => setTipologiaFiltro(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border text-sm"
              >
                <option value="">{t("expedientes.filter.todas_tipologias")}</option>
                {TIPOLOGIAS.map((tb) => (
                  <option key={tb} value={tb}>
                    {t(`expedientes.tipologia.${tb}`)}
                  </option>
                ))}
              </select>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("expedientes.empty")}</p>
            ) : (
              <ul className="divide-y divide-border max-h-[520px] overflow-y-auto">
                {items.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => void loadDetalle(row.id)}
                      className={`w-full text-left px-3 py-3 hover:bg-muted/30 transition-colors ${
                        selectedId === row.id ? "bg-primary/5" : ""
                      }`}
                    >
                      <p className="font-semibold text-foreground">
                        {row.numero != null ? `#${row.numero} · ` : ""}
                        {row.denominacion}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {labelEstado(row.estado)} · {t(`expedientes.tipologia.${row.tipologia}`)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-4 min-h-[320px]">
            {!exp ? (
              <p className="text-sm text-muted-foreground">{t("expedientes.select_one")}</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {exp.numero != null ? `Expediente n.º ${exp.numero}` : `Expediente #${exp.id}`}
                  </h2>
                  <p className="text-sm font-medium text-foreground mt-1">{exp.denominacion}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {labelEstado(exp.estado)} · {t(`expedientes.tipologia.${exp.tipologia}`)}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto border border-border rounded-xl p-3">
                  {exp.descripcion}
                </div>
                {exp.observaciones && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">{t("expedientes.field.observaciones")}: </span>
                    {exp.observaciones}
                  </p>
                )}

                {enCurso && puedeAbrirContinuar && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setAccionMov("continuar");
                        setFormMov({ notas: "", fecha: "", acta_id: "", observaciones: exp.observaciones ?? "" });
                      }}
                    >
                      <PlayCircle className="w-4 h-4" />
                      {t("expedientes.action.continuar")}
                    </Button>
                    {puedeCerrar && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-red-700 border-red-200"
                        onClick={() => {
                          setAccionMov("cerrar");
                          setFormMov({ notas: "", fecha: "", acta_id: "", observaciones: exp.observaciones ?? "" });
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                        {t("expedientes.action.cerrar")}
                      </Button>
                    )}
                    {roles.includes("directivo") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => void abrirPresentarJunta()}
                      >
                        <Send className="w-4 h-4" />
                        {t("expedientes.action.presentar_junta")}
                      </Button>
                    )}
                  </div>
                )}

                {accionMov && (
                  <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                    <h3 className="font-semibold text-sm">
                      {accionMov === "cerrar"
                        ? t("expedientes.form.cerrar_title")
                        : t("expedientes.form.continuar_title")}
                    </h3>
                    <textarea
                      value={formMov.notas}
                      onChange={(e) => setFormMov((p) => ({ ...p, notas: e.target.value }))}
                      rows={4}
                      placeholder={t("expedientes.field.notas_mov")}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                    <input
                      type="date"
                      value={formMov.fecha}
                      onChange={(e) => setFormMov((p) => ({ ...p, fecha: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                    <textarea
                      value={formMov.observaciones}
                      onChange={(e) => setFormMov((p) => ({ ...p, observaciones: e.target.value }))}
                      rows={2}
                      placeholder={t("expedientes.field.observaciones")}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void ejecutarMovimiento()} disabled={saving}>
                        {saving ? t("common.saving") : t("common.save")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAccionMov(null)}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                )}

                {presentForm.open && (
                  <div className="border border-primary/30 rounded-xl p-4 space-y-3 bg-primary/5">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      {t("expedientes.presentar.title")}
                    </h3>
                    {presentForm.loading ? (
                      <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            {t("expedientes.presentar.denominacion")}
                          </label>
                          <input
                            value={presentForm.denominacion}
                            onChange={(e) =>
                              setPresentForm((p) => ({ ...p, denominacion: e.target.value }))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            {t("expedientes.presentar.descripcion")}
                          </label>
                          <textarea
                            value={presentForm.descripcion}
                            onChange={(e) =>
                              setPresentForm((p) => ({ ...p, descripcion: e.target.value }))
                            }
                            rows={6}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                          />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold mb-1">
                              {t("expedientes.presentar.decision")}
                            </label>
                            <select
                              value={presentForm.decision}
                              onChange={(e) =>
                                setPresentForm((p) => ({
                                  ...p,
                                  decision: e.target.value as PropuestaDecisionLocal,
                                }))
                              }
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                            >
                              {PROPUESTA_DECISIONES.map((d) => (
                                <option key={d} value={d}>
                                  {t(`buzon.decision.${d}`)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1">
                              {t("expedientes.presentar.observaciones")}
                            </label>
                            <input
                              value={presentForm.observaciones}
                              onChange={(e) =>
                                setPresentForm((p) => ({ ...p, observaciones: e.target.value }))
                              }
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => void confirmarPresentarJunta()} disabled={saving}>
                            {saving ? t("common.saving") : t("expedientes.presentar.confirm")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPresentForm((p) => ({ ...p, open: false }))}
                          >
                            {t("common.cancel")}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <ListTodo className="w-4 h-4" />
                    {t("acciones.titulo")}
                  </h3>
                  {acciones.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("acciones.empty")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {acciones.map((a) => {
                        const esEdit = editAccionId === a.id;
                        const responsable =
                          a.responsable_nombre?.trim() ||
                          a.responsable_username ||
                          (a.responsable_user_id ? `#${a.responsable_user_id}` : t("acciones.sin_responsable"));
                        return (
                          <li key={a.id} className="border border-border rounded-lg p-3 text-sm space-y-1">
                            {esEdit ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editAccion.descripcion}
                                  onChange={(e) =>
                                    setEditAccion((p) => ({ ...p, descripcion: e.target.value }))
                                  }
                                  rows={2}
                                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs"
                                />
                                <div className="grid sm:grid-cols-3 gap-2">
                                  <select
                                    value={editAccion.responsable_user_id}
                                    onChange={(e) =>
                                      setEditAccion((p) => ({
                                        ...p,
                                        responsable_user_id: e.target.value,
                                      }))
                                    }
                                    className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                                  >
                                    <option value="">{t("acciones.responsable_placeholder")}</option>
                                    {usuarios.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.nombre?.trim() || u.username || `#${u.id}`}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="date"
                                    value={editAccion.plazo}
                                    onChange={(e) =>
                                      setEditAccion((p) => ({ ...p, plazo: e.target.value }))
                                    }
                                    className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                                  />
                                  <select
                                    value={editAccion.estado}
                                    onChange={(e) =>
                                      setEditAccion((p) => ({ ...p, estado: e.target.value }))
                                    }
                                    className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                                  >
                                    {ACCION_ESTADOS.map((s) => (
                                      <option key={s} value={s}>
                                        {t(`acciones.estado.${s}`)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <input
                                  value={editAccion.observaciones}
                                  onChange={(e) =>
                                    setEditAccion((p) => ({ ...p, observaciones: e.target.value }))
                                  }
                                  placeholder={t("acciones.observaciones_ph")}
                                  className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => void guardarEdicionAccion(a.id)}
                                    disabled={saving}
                                  >
                                    {t("common.save")}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditAccionId(null)}>
                                    {t("common.cancel")}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium text-foreground flex-1 whitespace-pre-wrap">
                                    {a.descripcion}
                                  </p>
                                  <span
                                    className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                                      a.estado === "hecha"
                                        ? "bg-green-100 text-green-700"
                                        : a.estado === "cancelada"
                                          ? "bg-muted text-muted-foreground"
                                          : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {t(`acciones.estado.${a.estado}`)}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {t("acciones.responsable_colon")} {responsable}
                                  {a.plazo ? ` · ${t("acciones.plazo_colon")} ${String(a.plazo).slice(0, 10)}` : ""}
                                </p>
                                {a.observaciones && (
                                  <p className="text-xs italic text-muted-foreground whitespace-pre-wrap">
                                    {a.observaciones}
                                  </p>
                                )}
                                {puedeAbrirContinuar && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {a.estado !== "hecha" && (
                                      <button
                                        type="button"
                                        onClick={() => void cambiarEstadoAccion(a.id, "hecha")}
                                        className="px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100 inline-flex items-center gap-1"
                                      >
                                        <CheckCheck className="w-3 h-3" />
                                        {t("acciones.marcar_hecha")}
                                      </button>
                                    )}
                                    {a.estado === "pendiente" && (
                                      <button
                                        type="button"
                                        onClick={() => void cambiarEstadoAccion(a.id, "cancelada")}
                                        className="px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80"
                                      >
                                        <XCircle className="w-3 h-3 inline mr-1" />
                                        {t("acciones.cancelar")}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditAccionId(a.id);
                                        setEditAccion({
                                          descripcion: a.descripcion,
                                          responsable_user_id:
                                            a.responsable_user_id != null
                                              ? String(a.responsable_user_id)
                                              : "",
                                          plazo: a.plazo ? String(a.plazo).slice(0, 10) : "",
                                          observaciones: a.observaciones ?? "",
                                          estado: a.estado,
                                        });
                                      }}
                                      className="px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80"
                                    >
                                      {t("common.edit")}
                                    </button>
                                    {a.estado !== "hecha" && (
                                      <button
                                        type="button"
                                        onClick={() => void borrarAccion(a.id)}
                                        className="px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 inline-flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        {t("common.delete")}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {enCurso && puedeAbrirContinuar && (
                    <div className="mt-3 border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                      <p className="text-xs font-semibold">{t("acciones.nueva_titulo")}</p>
                      <textarea
                        value={nuevaAccion.descripcion}
                        onChange={(e) =>
                          setNuevaAccion((p) => ({ ...p, descripcion: e.target.value }))
                        }
                        rows={2}
                        placeholder={t("acciones.descripcion_ph")}
                        className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs"
                      />
                      <div className="grid sm:grid-cols-3 gap-2">
                        <select
                          value={nuevaAccion.responsable_user_id}
                          onChange={(e) =>
                            setNuevaAccion((p) => ({ ...p, responsable_user_id: e.target.value }))
                          }
                          className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                        >
                          <option value="">{t("acciones.responsable_placeholder")}</option>
                          {usuarios.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre?.trim() || u.username || `#${u.id}`}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={nuevaAccion.plazo}
                          onChange={(e) => setNuevaAccion((p) => ({ ...p, plazo: e.target.value }))}
                          className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                        />
                        <input
                          value={nuevaAccion.observaciones}
                          onChange={(e) =>
                            setNuevaAccion((p) => ({ ...p, observaciones: e.target.value }))
                          }
                          placeholder={t("acciones.observaciones_ph")}
                          className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                        />
                      </div>
                      <Button size="sm" onClick={() => void crearAccion()} disabled={saving} className="gap-1">
                        <Plus className="w-3 h-3" />
                        {t("acciones.crear")}
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">{t("expedientes.mov.historial")}</h3>
                  {(detalle?.movimientos ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("expedientes.mov.empty")}</p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {(detalle?.movimientos ?? []).map((m) => (
                        <li key={m.id} className="text-sm border border-border rounded-lg px-3 py-2">
                          <p className="font-medium text-foreground">
                            {labelMov(m.tipo)} · {m.fecha}
                          </p>
                          {m.notas && (
                            <p className="text-muted-foreground whitespace-pre-wrap mt-1 text-xs">
                              {m.notas}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
