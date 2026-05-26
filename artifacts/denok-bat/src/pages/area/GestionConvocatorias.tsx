import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore, getUserRoles } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck2,
  Plus,
  Send,
  CheckCircle2,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Pencil,
  ListPlus,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Convocatoria = {
  id: number;
  numero: number | null;
  tipo: string;
  titulo: string;
  fecha: string | null;
  hora: string | null;
  lugar: string | null;
  estado: "borrador" | "publicada" | "celebrada" | string;
  observaciones: string | null;
  publicada_en: string | null;
  celebrada_en: string | null;
};

type PuntoPropuesta = {
  id: number;
  denominacion: string;
  descripcion: string;
  decision_solicitada: string;
  estado_buzon: string;
};

type Punto = {
  id: number;
  convocatoria_id: number;
  orden: number;
  propuesta_id: number | null;
  titulo: string | null;
  descripcion: string | null;
  notas: string | null;
  antecedentes: string | null;
  antecedentes_url: string | null;
  antecedentes_filename: string | null;
  propuesta: PuntoPropuesta | null;
};

type PropuestaDisponible = {
  id: number;
  denominacion: string;
  descripcion: string;
  decision_solicitada: string;
  origen_tipo: string;
};

const TIPOS = ["junta_directiva", "asamblea_general", "delegados", "otros"] as const;
const ESTADOS = ["borrador", "publicada", "celebrada"] as const;

const EMPTY_HEADER = {
  tipo: "junta_directiva" as (typeof TIPOS)[number],
  titulo: "",
  fecha: "",
  hora: "",
  lugar: "",
  observaciones: "",
};

export default function GestionConvocatorias() {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const { t } = useTranslation();

  const roles = user ? getUserRoles(user) : [];
  const puedeEscribir = roles.includes("contable");

  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [items, setItems] = useState<Convocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<{ convocatoria: Convocatoria; puntos: Punto[] } | null>(
    null,
  );
  const [propuestasDisp, setPropuestasDisp] = useState<PropuestaDisponible[]>([]);
  const [creando, setCreando] = useState(false);
  const [editandoCabecera, setEditandoCabecera] = useState(false);
  const [headerForm, setHeaderForm] = useState(EMPTY_HEADER);
  const [añadiendoPunto, setAñadiendoPunto] = useState(false);
  const [tipoPunto, setTipoPunto] = useState<"libre" | "propuesta">("libre");
  const [puntoForm, setPuntoForm] = useState({
    titulo: "",
    descripcion: "",
    notas: "",
    propuesta_id: "" as string | number,
  });
  const [editandoPuntoId, setEditandoPuntoId] = useState<number | null>(null);
  const [puntoEditForm, setPuntoEditForm] = useState({ titulo: "", descripcion: "", notas: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const labelEstado = (e: string) =>
    e === "borrador"
      ? t("convocatorias.estado.borrador")
      : e === "publicada"
        ? t("convocatorias.estado.publicada")
        : e === "celebrada"
          ? t("convocatorias.estado.celebrada")
          : e;
  const labelTipo = (tp: string) => t(`convocatorias.tipo.${tp}`);
  const labelSolicitud = (decision: string) =>
    decision ? t(`buzon.decision.${decision}`) : "";

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (estadoFiltro) q.set("estado", estadoFiltro);
      if (tipoFiltro) q.set("tipo", tipoFiltro);
      const r = await fetch(`${API_BASE}/api/admin/convocatorias?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setItems(d.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, estadoFiltro, tipoFiltro]);

  const loadDisponibles = useCallback(async () => {
    if (!token) return;
    const r = await fetch(`${API_BASE}/api/admin/convocatorias/propuestas-disponibles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (r.ok) setPropuestasDisp(d.items ?? []);
  }, [token]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadDetalle = useCallback(
    async (id: number) => {
      if (!token) return;
      setSelectedId(id);
      setMsg(null);
      setEditandoCabecera(false);
      setAñadiendoPunto(false);
      setEditandoPuntoId(null);
      const r = await fetch(`${API_BASE}/api/admin/convocatorias/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) {
        setDetalle(null);
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setDetalle(d);
      const c = d.convocatoria as Convocatoria;
      setHeaderForm({
        tipo: (TIPOS as readonly string[]).includes(c.tipo)
          ? (c.tipo as (typeof TIPOS)[number])
          : "otros",
        titulo: c.titulo ?? "",
        fecha: c.fecha ?? "",
        hora: c.hora ?? "",
        lugar: c.lugar ?? "",
        observaciones: c.observaciones ?? "",
      });
    },
    [token, t],
  );

  async function crearConvocatoria(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/convocatorias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(headerForm),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("convocatorias.msg.creada"));
      setCreando(false);
      setHeaderForm(EMPTY_HEADER);
      await loadList();
      const id = Number(d.convocatoria?.id);
      if (Number.isFinite(id)) await loadDetalle(id);
    } catch {
      setMsg(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  }

  async function guardarCabecera() {
    if (!token || !detalle) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/convocatorias/${detalle.convocatoria.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(headerForm),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setEditandoCabecera(false);
      await loadList();
      await loadDetalle(detalle.convocatoria.id);
    } catch {
      setMsg(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  }

  async function borrarConvocatoria(id: number) {
    if (!token) return;
    if (!window.confirm(t("convocatorias.confirm.borrar"))) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/convocatorias/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setDetalle(null);
      setSelectedId(null);
      await loadList();
    } finally {
      setSaving(false);
    }
  }

  async function añadirPunto() {
    if (!token || !detalle) return;
    setSaving(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        notas: puntoForm.notas || undefined,
      };
      if (tipoPunto === "propuesta") {
        if (!puntoForm.propuesta_id) {
          setMsg(t("convocatorias.error.propuesta_requerida"));
          return;
        }
        body.propuesta_id = puntoForm.propuesta_id;
      } else {
        if (!puntoForm.titulo || puntoForm.titulo.trim().length < 2) {
          setMsg(t("convocatorias.error.titulo_requerido"));
          return;
        }
        body.titulo = puntoForm.titulo;
        if (puntoForm.descripcion) body.descripcion = puntoForm.descripcion;
      }
      const r = await fetch(
        `${API_BASE}/api/admin/convocatorias/${detalle.convocatoria.id}/puntos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setAñadiendoPunto(false);
      setPuntoForm({ titulo: "", descripcion: "", notas: "", propuesta_id: "" });
      await loadDetalle(detalle.convocatoria.id);
      await loadDisponibles();
    } catch {
      setMsg(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  }

  async function guardarPunto(puntoId: number) {
    if (!token || !detalle) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/convocatorias/${detalle.convocatoria.id}/puntos/${puntoId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(puntoEditForm),
        },
      );
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setEditandoPuntoId(null);
      await loadDetalle(detalle.convocatoria.id);
    } finally {
      setSaving(false);
    }
  }

  async function borrarPunto(puntoId: number) {
    if (!token || !detalle) return;
    if (!window.confirm(t("convocatorias.confirm.quitar_punto"))) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/convocatorias/${detalle.convocatoria.id}/puntos/${puntoId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      await loadDetalle(detalle.convocatoria.id);
      await loadDisponibles();
    } finally {
      setSaving(false);
    }
  }

  async function reordenarPuntos(nuevosIds: number[]) {
    if (!token || !detalle) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/convocatorias/${detalle.convocatoria.id}/reordenar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orden: nuevosIds }),
        },
      );
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      await loadDetalle(detalle.convocatoria.id);
    } finally {
      setSaving(false);
    }
  }

  function moverPunto(idx: number, dir: -1 | 1) {
    if (!detalle) return;
    const arr = [...detalle.puntos];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[idx];
    arr[idx] = arr[j];
    arr[j] = tmp;
    void reordenarPuntos(arr.map((p) => p.id));
  }

  async function cambiarEstado(action: "publicar" | "celebrar") {
    if (!token || !detalle) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/convocatorias/${detalle.convocatoria.id}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(
        action === "publicar" ? t("convocatorias.msg.publicada") : t("convocatorias.msg.celebrada"),
      );
      await loadList();
      await loadDetalle(detalle.convocatoria.id);
    } finally {
      setSaving(false);
    }
  }

  const conv = detalle?.convocatoria;
  const enBorrador = conv?.estado === "borrador";
  const editable = enBorrador || conv?.estado === "publicada";

  const propuestasFiltradas = useMemo(() => {
    const yaIds = new Set(detalle?.puntos.map((p) => p.propuesta_id).filter(Boolean) ?? []);
    return propuestasDisp.filter((p) => !yaIds.has(p.id));
  }, [propuestasDisp, detalle?.puntos]);

  useEffect(() => {
    if (añadiendoPunto && tipoPunto === "propuesta") void loadDisponibles();
  }, [añadiendoPunto, tipoPunto, loadDisponibles]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <CalendarCheck2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("menu.gestion_convocatorias")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("convocatorias.intro")}</p>
          </div>
        </div>
        {puedeEscribir && !creando && (
          <Button
            onClick={() => {
              setCreando(true);
              setHeaderForm(EMPTY_HEADER);
              setDetalle(null);
              setSelectedId(null);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("convocatorias.action.nueva")}
          </Button>
        )}
      </div>

      {msg && (
        <p className="mb-4 text-sm text-muted-foreground bg-muted/40 rounded-xl px-4 py-2">
          {msg}
        </p>
      )}

      {creando && puedeEscribir && (
        <form
          onSubmit={crearConvocatoria}
          className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4 mb-8"
        >
          <h2 className="text-lg font-semibold">{t("convocatorias.form.nueva_title")}</h2>
          <HeaderFields form={headerForm} onChange={setHeaderForm} t={t} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreando(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border text-sm"
            >
              <option value="">{t("convocatorias.filter.todos_estados")}</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {labelEstado(e)}
                </option>
              ))}
            </select>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border text-sm"
            >
              <option value="">{t("convocatorias.filter.todos_tipos")}</option>
              {TIPOS.map((tp) => (
                <option key={tp} value={tp}>
                  {labelTipo(tp)}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("convocatorias.empty")}</p>
          ) : (
            <ul className="divide-y divide-border max-h-[520px] overflow-y-auto">
              {items.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => void loadDetalle(c.id)}
                    className={`w-full text-left px-3 py-3 hover:bg-muted/30 transition-colors ${
                      selectedId === c.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <p className="font-semibold text-foreground">
                      {c.numero != null ? `#${c.numero} · ` : ""}
                      {c.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {labelEstado(c.estado)} · {labelTipo(c.tipo)}
                      {c.fecha ? ` · ${c.fecha}` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 min-h-[320px]">
          {!conv ? (
            <p className="text-sm text-muted-foreground">{t("convocatorias.select_one")}</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {conv.numero != null
                        ? `${t("convocatorias.numero")} ${conv.numero}`
                        : `#${conv.id}`}
                    </h2>
                    <p className="text-sm font-medium text-foreground mt-1">{conv.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {labelEstado(conv.estado)} · {labelTipo(conv.tipo)}
                      {conv.fecha ? ` · ${conv.fecha}` : ""}
                      {conv.hora ? ` · ${conv.hora}` : ""}
                    </p>
                    {conv.lugar && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("convocatorias.field.lugar")}: {conv.lugar}
                      </p>
                    )}
                  </div>
                  {puedeEscribir && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {editable && !editandoCabecera && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEditandoCabecera(true)}
                        >
                          <Pencil className="w-4 h-4" />
                          {t("common.edit")}
                        </Button>
                      )}
                      {enBorrador && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => void cambiarEstado("publicar")}
                            disabled={saving}
                          >
                            <Send className="w-4 h-4" />
                            {t("convocatorias.action.publicar")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-red-700"
                            onClick={() => void borrarConvocatoria(conv.id)}
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                            {t("common.delete")}
                          </Button>
                        </>
                      )}
                      {conv.estado === "publicada" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => void cambiarEstado("celebrar")}
                          disabled={saving}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {t("convocatorias.action.celebrar")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {conv.observaciones && !editandoCabecera && (
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                    <span className="font-semibold">
                      {t("convocatorias.field.observaciones")}:{" "}
                    </span>
                    {conv.observaciones}
                  </p>
                )}
              </div>

              {editandoCabecera && puedeEscribir && (
                <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                  <HeaderFields form={headerForm} onChange={setHeaderForm} t={t} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void guardarCabecera()} disabled={saving}>
                      {saving ? t("common.saving") : t("common.save")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditandoCabecera(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{t("convocatorias.orden_dia.title")}</h3>
                  {puedeEscribir && editable && !añadiendoPunto && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setAñadiendoPunto(true);
                        setTipoPunto("libre");
                        setPuntoForm({ titulo: "", descripcion: "", notas: "", propuesta_id: "" });
                      }}
                    >
                      <ListPlus className="w-4 h-4" />
                      {t("convocatorias.orden_dia.add")}
                    </Button>
                  )}
                </div>

                {añadiendoPunto && puedeEscribir && editable && (
                  <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20 mb-3">
                    <div className="flex gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => setTipoPunto("libre")}
                        className={`px-3 py-1.5 rounded-lg border ${
                          tipoPunto === "libre"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-background"
                        }`}
                      >
                        {t("convocatorias.orden_dia.punto_libre")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoPunto("propuesta")}
                        className={`px-3 py-1.5 rounded-lg border ${
                          tipoPunto === "propuesta"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-background"
                        }`}
                      >
                        {t("convocatorias.orden_dia.desde_buzon")}
                      </button>
                    </div>
                    {tipoPunto === "libre" ? (
                      <>
                        <input
                          value={puntoForm.titulo}
                          onChange={(e) =>
                            setPuntoForm((p) => ({ ...p, titulo: e.target.value }))
                          }
                          placeholder={t("convocatorias.field.punto_titulo")}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                        />
                        <textarea
                          value={puntoForm.descripcion}
                          onChange={(e) =>
                            setPuntoForm((p) => ({ ...p, descripcion: e.target.value }))
                          }
                          rows={3}
                          placeholder={t("convocatorias.field.punto_descripcion")}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                        />
                      </>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {t("convocatorias.orden_dia.select_propuesta")}
                        </p>
                        {propuestasFiltradas.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            {t("convocatorias.orden_dia.no_propuestas")}
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                            {propuestasFiltradas.map((p) => {
                              const sel = Number(puntoForm.propuesta_id) === p.id;
                              const desc = p.descripcion ?? "";
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() =>
                                    setPuntoForm((f) => ({ ...f, propuesta_id: p.id }))
                                  }
                                  className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                                    sel
                                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                                      : "border-border bg-background hover:bg-muted/30"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-foreground text-sm flex-1 min-w-0">
                                      <span className="text-muted-foreground mr-1">#{p.id}</span>
                                      {p.denominacion}
                                    </p>
                                    <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                      {labelSolicitud(p.decision_solicitada)}
                                    </span>
                                  </div>
                                  {desc && (
                                    <div className="text-xs text-muted-foreground mt-1 h-12 overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 px-2 py-1 leading-4">
                                      {desc}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    <textarea
                      value={puntoForm.notas}
                      onChange={(e) =>
                        setPuntoForm((p) => ({ ...p, notas: e.target.value }))
                      }
                      rows={2}
                      placeholder={t("convocatorias.field.punto_notas")}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void añadirPunto()} disabled={saving}>
                        {saving ? t("common.saving") : t("common.add")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAñadiendoPunto(false)}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                )}

                {(detalle?.puntos ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("convocatorias.orden_dia.empty")}
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {(detalle?.puntos ?? []).map((p, idx) => {
                      const titulo =
                        p.propuesta?.denominacion ??
                        p.titulo ??
                        t("convocatorias.orden_dia.sin_titulo");
                      const cuerpo = p.descripcion ?? p.propuesta?.descripcion;
                      const esEdit = editandoPuntoId === p.id;
                      return (
                        <li
                          key={p.id}
                          className="border border-border rounded-xl px-3 py-2 text-sm"
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-foreground">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                              {esEdit ? (
                                <div className="space-y-2">
                                  {p.propuesta == null && (
                                    <input
                                      value={puntoEditForm.titulo}
                                      onChange={(e) =>
                                        setPuntoEditForm((f) => ({ ...f, titulo: e.target.value }))
                                      }
                                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                    />
                                  )}
                                  {p.propuesta == null && (
                                    <textarea
                                      value={puntoEditForm.descripcion}
                                      onChange={(e) =>
                                        setPuntoEditForm((f) => ({
                                          ...f,
                                          descripcion: e.target.value,
                                        }))
                                      }
                                      rows={3}
                                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                    />
                                  )}
                                  <textarea
                                    value={puntoEditForm.notas}
                                    onChange={(e) =>
                                      setPuntoEditForm((f) => ({ ...f, notas: e.target.value }))
                                    }
                                    rows={2}
                                    placeholder={t("convocatorias.field.punto_notas")}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => void guardarPunto(p.id)}
                                      disabled={saving}
                                    >
                                      {t("common.save")}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditandoPuntoId(null)}
                                    >
                                      {t("common.cancel")}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="font-medium text-foreground">
                                    {titulo}
                                    {p.propuesta && (
                                      <span className="ml-2 text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                                        {t("convocatorias.orden_dia.tag_buzon")} #{p.propuesta.id}
                                      </span>
                                    )}
                                  </p>
                                  {cuerpo && (
                                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                                      {cuerpo}
                                    </p>
                                  )}
                                  {p.propuesta?.decision_solicitada && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      <span className="font-semibold text-foreground">
                                        {t("buzon.solicitud_concreta")}:
                                      </span>{" "}
                                      {labelSolicitud(p.propuesta.decision_solicitada)}
                                    </p>
                                  )}
                                  {p.notas && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                      {t("convocatorias.field.punto_notas")}: {p.notas}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                            {puedeEscribir && editable && !esEdit && (
                              <div className="flex flex-col gap-1 items-end">
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moverPunto(idx, -1)}
                                    disabled={idx === 0 || saving}
                                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                    title={t("convocatorias.action.subir")}
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moverPunto(idx, 1)}
                                    disabled={
                                      idx === (detalle?.puntos?.length ?? 0) - 1 || saving
                                    }
                                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                    title={t("convocatorias.action.bajar")}
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditandoPuntoId(p.id);
                                      setPuntoEditForm({
                                        titulo: p.titulo ?? "",
                                        descripcion: p.descripcion ?? "",
                                        notas: p.notas ?? "",
                                      });
                                    }}
                                    className="p-1 rounded hover:bg-muted"
                                    title={t("common.edit")}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void borrarPunto(p.id)}
                                    className="p-1 rounded hover:bg-red-50 text-red-700"
                                    title={t("convocatorias.orden_dia.quitar")}
                                    disabled={saving}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderFields({
  form,
  onChange,
  t,
}: {
  form: typeof EMPTY_HEADER;
  onChange: (
    v: typeof EMPTY_HEADER | ((p: typeof EMPTY_HEADER) => typeof EMPTY_HEADER),
  ) => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold mb-1 text-muted-foreground">
            {t("convocatorias.field.tipo")}
          </label>
          <select
            value={form.tipo}
            onChange={(e) => onChange((p) => ({ ...p, tipo: e.target.value as never }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background"
          >
            {TIPOS.map((tp) => (
              <option key={tp} value={tp}>
                {t(`convocatorias.tipo.${tp}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-muted-foreground">
            {t("convocatorias.field.titulo")}
          </label>
          <input
            value={form.titulo}
            onChange={(e) => onChange((p) => ({ ...p, titulo: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background"
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-semibold mb-1 text-muted-foreground">
            {t("convocatorias.field.fecha")}
          </label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => onChange((p) => ({ ...p, fecha: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-muted-foreground">
            {t("convocatorias.field.hora")}
          </label>
          <input
            value={form.hora}
            onChange={(e) => onChange((p) => ({ ...p, hora: e.target.value }))}
            placeholder="18:00"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-muted-foreground">
            {t("convocatorias.field.lugar")}
          </label>
          <input
            value={form.lugar}
            onChange={(e) => onChange((p) => ({ ...p, lugar: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 text-muted-foreground">
          {t("convocatorias.field.observaciones")}
        </label>
        <textarea
          value={form.observaciones}
          onChange={(e) => onChange((p) => ({ ...p, observaciones: e.target.value }))}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background resize-y"
        />
      </div>
    </>
  );
}
