import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ESTADOS = ["nueva", "aportaciones", "presentada", "planificada", "rechazada"] as const;
// Estados que el directivo puede establecer manualmente desde el selector.
// El resto se aplican por flujo: presentada (Presentar a la junta),
// planificada/rechazada (resolución de propuesta o acta).
const ESTADOS_EDITABLES = ["nueva", "aportaciones"] as const;
const DECISIONES = ["rechazada", "mas_aportaciones", "abrir_expediente"] as const;
type DecisionSolicitada = (typeof DECISIONES)[number];

type Sug = Record<string, unknown>;

type Propuesta = {
  id: number;
  estado_buzon: string;
  denominacion: string;
  decision_solicitada: string;
};

export default function AdminGestionSugerencias() {
  const token = useStore((s) => s.token);
  const { t } = useTranslation();
  const labelEstado = (e: string) =>
    ESTADOS.includes(e as (typeof ESTADOS)[number]) ? t(`admin_sug.estado.${e}`) : e;

  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [soloRaiz, setSoloRaiz] = useState(false);
  const [items, setItems] = useState<Sug[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ficha, setFicha] = useState<{ cabecera: Sug; sugerencia: Sug; aportaciones: Sug[] } | null>(
    null,
  );
  const [editEstado, setEditEstado] = useState("");
  const [editObs, setEditObs] = useState("");
  const [editTema, setEditTema] = useState("");
  const [editTextoRaiz, setEditTextoRaiz] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [propuestasSug, setPropuestasSug] = useState<Propuesta[]>([]);
  const [presentForm, setPresentForm] = useState<{
    open: boolean;
    denominacion: string;
    descripcion: string;
    decision: DecisionSolicitada;
    observaciones: string;
    antecedentes: string;
    loadingPreview: boolean;
  }>({
    open: false,
    denominacion: "",
    descripcion: "",
    decision: "abrir_expediente",
    observaciones: "",
    antecedentes: "",
    loadingPreview: false,
  });

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (estadoFiltro) q.set("estado", estadoFiltro);
      if (soloRaiz) q.set("raiz", "1");
      const r = await fetch(`${API_BASE}/api/sugerencias?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setItems(d.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, estadoFiltro, soloRaiz]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const cargarPropuestasParaSug = useCallback(
    async (sugId: number) => {
      if (!token) return;
      try {
        const r = await fetch(
          `${API_BASE}/api/admin/propuestas-junta?origen_tipo=sugerencia&origen_id=${sugId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const d = await r.json();
        if (r.ok) setPropuestasSug((d.items as Propuesta[]) ?? []);
        else setPropuestasSug([]);
      } catch {
        setPropuestasSug([]);
      }
    },
    [token],
  );

  const loadFicha = useCallback(
    async (id: number) => {
      if (!token) return;
      setSelectedId(id);
      setMsg(null);
      setPresentForm((p) => ({ ...p, open: false }));
      const r = await fetch(`${API_BASE}/api/sugerencias/${id}/ficha`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) {
        setFicha(null);
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      const cab = d.cabecera as Sug;
      setFicha(d);
      const estadoActual = String(cab.estado ?? "nueva");
      setEditEstado(
        (ESTADOS_EDITABLES as readonly string[]).includes(estadoActual)
          ? estadoActual
          : (ESTADOS_EDITABLES[0] as string),
      );
      setEditObs(String(cab.observaciones_estado ?? ""));
      setEditTema(String(cab.tema ?? ""));
      setEditTextoRaiz(String(cab.texto ?? ""));
      const rootId = Number(cab.id);
      if (Number.isFinite(rootId)) void cargarPropuestasParaSug(rootId);
    },
    [token, t, cargarPropuestasParaSug],
  );

  async function guardarRaiz() {
    if (!token || !ficha?.cabecera) return;
    const id = Number(ficha.cabecera.id);
    if (!Number.isFinite(id)) return;
    setSaving(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        observaciones_estado: editObs,
        tema: editTema,
        texto: editTextoRaiz,
      };
      const estadoActual = String(ficha.cabecera.estado ?? "");
      // Solo enviamos `estado` si el directivo lo está cambiando dentro de los editables.
      if (
        (ESTADOS_EDITABLES as readonly string[]).includes(editEstado) &&
        editEstado !== estadoActual
      ) {
        body.estado = editEstado;
      }
      const r = await fetch(`${API_BASE}/api/sugerencias/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("admin_sug.saved"));
      await loadList();
      await loadFicha(id);
    } finally {
      setSaving(false);
    }
  }

  async function abrirPresentar() {
    if (!token || !ficha?.cabecera) return;
    const id = Number(ficha.cabecera.id);
    if (!Number.isFinite(id)) return;
    setPresentForm({
      open: true,
      denominacion: "",
      descripcion: "",
      decision: "abrir_expediente",
      observaciones: "",
      antecedentes: "",
      loadingPreview: true,
    });
    setMsg(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/propuestas-junta/preview/sugerencia/${id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        setPresentForm((p) => ({ ...p, open: false, loadingPreview: false }));
        return;
      }
      setPresentForm((p) => ({
        ...p,
        denominacion: String(d.denominacion ?? ""),
        descripcion: String(d.descripcion ?? ""),
        antecedentes: String(d.antecedentes ?? ""),
        loadingPreview: false,
      }));
    } catch {
      setMsg(t("common.network_error"));
      setPresentForm((p) => ({ ...p, open: false, loadingPreview: false }));
    }
  }

  async function confirmarPresentar(enviarAlBuzon: boolean) {
    if (!token || !ficha?.cabecera) return;
    const id = Number(ficha.cabecera.id);
    if (!Number.isFinite(id)) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/propuestas-junta/desde-sugerencia`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sugerencia_id: id,
          denominacion: presentForm.denominacion,
          descripcion: presentForm.descripcion,
          decision_solicitada: presentForm.decision,
          observaciones: presentForm.observaciones || undefined,
          antecedentes: presentForm.antecedentes || undefined,
          enviar_al_buzon: enviarAlBuzon,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(
        enviarAlBuzon
          ? t("admin_sug.presentada_ok")
          : t("admin_sug.borrador_ok"),
      );
      setPresentForm((p) => ({ ...p, open: false }));
      await loadList();
      await loadFicha(id);
    } catch {
      setMsg(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <p className="p-8 text-center text-muted-foreground">{t("admin_sug.login_required")}</p>
    );
  }

  const cab = ficha?.cabecera;
  const esRaiz = cab ? cab.parent_id == null && cab.parentId == null : false;
  const estadoActual = String(cab?.estado ?? "");
  const propuestaActiva = propuestasSug.find((p) =>
    p.estado_buzon === "pendiente" || p.estado_buzon === "en_orden_dia",
  );
  const propuestaResuelta = propuestasSug.find((p) => p.estado_buzon === "resuelta");
  const puedePresentar =
    esRaiz && !propuestaActiva && (estadoActual === "nueva" || estadoActual === "aportaciones" || estadoActual === "presentada");

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">{t("admin_sug.title")}</h1>

      <div className="flex flex-wrap gap-4 items-end bg-white rounded-2xl border border-border p-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t("admin_sug.state")}
          </label>
          <select
            className="px-3 py-2 rounded-lg border border-border"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="">{t("admin_sug.all")}</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {labelEstado(e)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soloRaiz} onChange={(e) => setSoloRaiz(e.target.checked)} />
          {t("admin_sug.only_roots")}
        </label>
        <Button type="button" variant="outline" onClick={() => void loadList()}>
          {t("admin_sug.refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold">
            {t("admin_sug.list")}
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">{t("admin_sug.loading")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Id</th>
                    <th className="text-left p-2">{t("admin_sug.num")}</th>
                    <th className="text-left p-2">{t("admin_sug.state")}</th>
                    <th className="text-left p-2">{t("admin_sug.topic")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const id = Number(row.id);
                    const isChild = row.parentId != null || row.parent_id != null;
                    const num = row.numeroSugerencia ?? row.numero_sugerencia;
                    const tema = row.tema ?? row.categoria ?? "";
                    return (
                      <tr
                        key={id}
                        className={`border-t border-border cursor-pointer hover:bg-muted/30 ${
                          selectedId === id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => void loadFicha(id)}
                      >
                        <td className="p-2">{id}</td>
                        <td className="p-2">{num != null ? String(num) : "—"}</td>
                        <td className="p-2">{labelEstado(String(row.estado ?? ""))}</td>
                        <td className="p-2 line-clamp-2">
                          {isChild ? "↳ " : ""}
                          {String(tema)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-lg font-bold">{t("admin_sug.file")}</h2>
          {!cab ? (
            <p className="text-sm text-muted-foreground">{t("admin_sug.pick_row")}</p>
          ) : (
            <>
              <div className="text-xs space-y-1 text-muted-foreground border-b border-border pb-3">
                <p>
                  <span className="font-semibold text-foreground">{t("admin_sug.root_id")}</span>{" "}
                  {String(cab.id)} ·{" "}
                  <span className="font-semibold text-foreground">{t("admin_sug.public_num")}</span>{" "}
                  {cab.numero_sugerencia != null ? String(cab.numero_sugerencia) : "—"}
                </p>
                <p>
                  <span className="font-semibold text-foreground">{t("admin_sug.state_colon")}</span>{" "}
                  {labelEstado(estadoActual)}
                </p>
                <p>
                  <span className="font-semibold text-foreground">{t("admin_sug.entered")}</span>{" "}
                  {cab.fecha_entrada ? new Date(String(cab.fecha_entrada)).toLocaleString() : "—"}
                </p>
                <p>
                  <span className="font-semibold text-foreground">{t("admin_sug.sender")}</span>{" "}
                  {String(cab.nombre_remitente ?? "")} {String(cab.email_remitente ?? "")}
                </p>
                {propuestaActiva && (
                  <p className="text-primary">
                    {t("admin_sug.propuesta_activa")} #{propuestaActiva.id} ({propuestaActiva.estado_buzon})
                  </p>
                )}
                {!propuestaActiva && propuestaResuelta && (
                  <p>
                    {t("admin_sug.propuesta_resuelta")} #{propuestaResuelta.id}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{t("admin_sug.topic_root")}</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                  value={editTema}
                  onChange={(e) => setEditTema(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{t("admin_sug.text_root")}</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm min-h-[100px]"
                  value={editTextoRaiz}
                  onChange={(e) => setEditTextoRaiz(e.target.value)}
                />
              </div>

              {ficha?.aportaciones?.map((ap) => (
                <div key={String(ap.id)} className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    {t("admin_sug.contribution_id")} {String(ap.id)} —{" "}
                    {ap.fecha_entrada ? new Date(String(ap.fecha_entrada)).toLocaleString() : ""}
                  </label>
                  <textarea
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted/20 text-sm min-h-[80px]"
                    value={String(ap.texto ?? "")}
                  />
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t("admin_sug.state_root")}
                  </label>
                  {(ESTADOS_EDITABLES as readonly string[]).includes(estadoActual) ||
                  estadoActual === "" ? (
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      value={editEstado}
                      onChange={(e) => setEditEstado(e.target.value)}
                    >
                      {ESTADOS_EDITABLES.map((e) => (
                        <option key={e} value={e}>
                          {labelEstado(e)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-muted/20 text-muted-foreground">
                      {labelEstado(estadoActual)} —{" "}
                      <span className="italic">{t("admin_sug.estado_no_editable")}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t("admin_sug.observations")}
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm min-h-[72px]"
                  value={editObs}
                  onChange={(e) => setEditObs(e.target.value)}
                />
              </div>

              {msg ? <p className="text-sm text-primary font-medium">{msg}</p> : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={saving} onClick={() => void guardarRaiz()}>
                  {saving ? t("admin_sug.saving") : t("admin_sug.save_root")}
                </Button>
                {puedePresentar && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    disabled={saving}
                    onClick={() => void abrirPresentar()}
                  >
                    <Send className="w-4 h-4" />
                    {t("admin_sug.presentar")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("admin_sug.flujo_automatico")}</p>

              {presentForm.open && (
                <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                  <h3 className="font-semibold text-sm">{t("admin_sug.presentar_title")}</h3>
                  {presentForm.loadingPreview ? (
                    <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {t("admin_sug.propuesta_denominacion")}
                        </label>
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                          value={presentForm.denominacion}
                          onChange={(e) =>
                            setPresentForm((p) => ({ ...p, denominacion: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {t("admin_sug.propuesta_descripcion")}
                        </label>
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("buzon.descripcion_ayuda")}
                        </p>
                        <textarea
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm min-h-[160px] font-mono"
                          value={presentForm.descripcion}
                          onChange={(e) =>
                            setPresentForm((p) => ({ ...p, descripcion: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {t("buzon.antecedentes.titulo")}
                        </label>
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("admin_sug.antecedentes_ayuda")}
                        </p>
                        <textarea
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm min-h-[140px]"
                          value={presentForm.antecedentes}
                          onChange={(e) =>
                            setPresentForm((p) => ({ ...p, antecedentes: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {t("buzon.solicitud_concreta")}
                        </label>
                        <select
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                          value={presentForm.decision}
                          onChange={(e) =>
                            setPresentForm((p) => ({
                              ...p,
                              decision: e.target.value as DecisionSolicitada,
                            }))
                          }
                        >
                          {DECISIONES.map((d) => (
                            <option key={d} value={d}>
                              {t(`admin_sug.decision.${d}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {t("admin_sug.propuesta_observaciones")}
                        </label>
                        <textarea
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm min-h-[60px]"
                          value={presentForm.observaciones}
                          onChange={(e) =>
                            setPresentForm((p) => ({ ...p, observaciones: e.target.value }))
                          }
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void confirmarPresentar(false)}
                          disabled={saving}
                        >
                          {saving ? t("common.saving") : t("admin_sug.presentar_confirm")}
                        </Button>
                        <Button
                          type="button"
                          className="gap-1.5"
                          onClick={() => void confirmarPresentar(true)}
                          disabled={saving}
                        >
                          <Send className="w-4 h-4" />
                          {saving ? t("common.saving") : t("admin_sug.presentar_a_junta")}
                        </Button>
                        <Button
                          type="button"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
