import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Download, FileText, RefreshCw, Send, Trash2 } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SubvencionItem = {
  expediente: {
    id: number;
    numero: number | null;
    denominacion: string;
    descripcion: string;
    estado: string;
    observaciones: string | null;
    actualizado_en: string;
  };
  subvencion: {
    organismo: string | null;
    convocatoria_codigo: string | null;
    subestado: string;
    importe_disponible: string | null;
    importe_solicitado: string | null;
    importe_concedido: string | null;
    importe_justif_intermedio: string | null;
    importe_cobrado_intermedio: string | null;
    importe_justif_final: string | null;
    importe_cobrado_final: string | null;
    plazo_solicitud: string | null;
    plazo_justif_intermedia: string | null;
    plazo_justif_final: string | null;
    propuesta_inicial_id: number | null;
    propuesta_cierre_id: number | null;
  };
};

type Documento = {
  id: number;
  tipo: string;
  origen: "flujo" | "historico";
  denominacion: string | null;
  url: string;
  filename: string | null;
  fecha_documento: string | null;
  importe: string | null;
};

const ESTADOS_ACTIVOS = new Set(["preparando", "en_curso"]);

type Ficha = SubvencionItem & {
  documentos: Documento[];
  propuestas: Array<{
    id: number;
    denominacion: string;
    estado_buzon: string;
    decision_solicitada: string;
    resultado: string | null;
  }>;
  acciones: Array<{
    id: number;
    descripcion: string;
    estado: string;
    responsable_nombre: string | null;
    plazo: string | null;
  }>;
};

const SUBESTADOS = [
  "preparando",
  "aprobada_junta",
  "solicitud_enviada",
  "resuelta_concedida",
  "resuelta_denegada",
  "en_ejecucion",
  "justif_intermedia_enviada",
  "contestada_intermedia",
  "justif_final_enviada",
  "contestada_final",
  "propuesta_cierre",
] as const;

const TIPOS_DOC = [
  "solicitud",
  "resolucion",
  "justif_intermedia",
  "contestacion_intermedia",
  "justif_final",
  "contestacion_final",
  "otros",
] as const;

function eur(value: string | null) {
  if (!value) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-ES");
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SubvencionesListado({ historial = false }: { historial?: boolean }) {
  const token = useStore((s) => s.token);
  const { t } = useTranslation();
  const [items, setItems] = useState<SubvencionItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [upload, setUpload] = useState({
    tipo: "otros",
    denominacion: "",
    fecha_documento: "",
    importe: "",
    notas: "",
    file: null as File | null,
  });

  const labelSubestado = useCallback(
    (value: string) => t(`subvenciones.subestado.${value}`),
    [t],
  );
  const labelTipoDoc = useCallback(
    (value: string) => t(`subvenciones.doc.${value}`),
    [t],
  );
  const labelEstadoExpediente = useCallback(
    (value: string) => t(`expedientes.estado.${value}`),
    [t],
  );

  const vista = historial ? "historial" : "en_curso";

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/subvenciones?vista=${vista}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setItems(d.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, vista]);

  const loadFicha = useCallback(
    async (id: number) => {
      if (!token) return;
      setSelectedId(id);
      const r = await fetch(`${API_BASE}/api/admin/subvenciones/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setFicha(d);
    },
    [token],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const selected = useMemo(
    () => items.find((it) => it.expediente.id === selectedId) ?? null,
    [items, selectedId],
  );

  async function presentar(tipo: "inicial" | "cierre") {
    if (!token || !ficha) return;
    setMsg("");
    const r = await fetch(`${API_BASE}/api/admin/subvenciones/${ficha.expediente.id}/presentar-junta`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tipo }),
    });
    const d = await r.json();
    if (!r.ok) {
      setMsg(String(d?.error ?? t("subvenciones.list.propuesta_error")));
      return;
    }
    setMsg(
      tipo === "cierre"
        ? t("subvenciones.list.propuesta_cierre_ok")
        : t("subvenciones.list.propuesta_inicial_ok"),
    );
    await loadList();
    await loadFicha(ficha.expediente.id);
  }

  async function cambiarSubestado(value: string) {
    if (!token || !ficha) return;
    const r = await fetch(`${API_BASE}/api/admin/subvenciones/${ficha.expediente.id}/subestado`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subestado: value }),
    });
    if (r.ok) {
      await loadList();
      await loadFicha(ficha.expediente.id);
    }
  }

  async function subirDocumento() {
    if (!token || !ficha || !upload.file) return;
    const pdf = await fileToDataUrl(upload.file);
    // Si el expediente ya no está activo, el backend marca el documento
    // como `origen='historico'` automáticamente. Lo pedimos explícitamente
    // para que la UI lo refleje sin ambigüedad.
    const origen = ESTADOS_ACTIVOS.has(ficha.expediente.estado) ? "flujo" : "historico";
    const r = await fetch(`${API_BASE}/api/admin/expedientes/${ficha.expediente.id}/documentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...upload,
        original_name: upload.file.name,
        pdf,
        origen,
        file: undefined,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setMsg(String(d?.error ?? t("subvenciones.list.subir_error")));
      return;
    }
    setUpload({ tipo: "otros", denominacion: "", fecha_documento: "", importe: "", notas: "", file: null });
    await loadFicha(ficha.expediente.id);
  }

  async function borrarDocumento(documentoId: number) {
    if (!token || !ficha) return;
    setMsg("");
    const r = await fetch(
      `${API_BASE}/api/admin/expedientes/${ficha.expediente.id}/documentos/${documentoId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setMsg(String(d?.error ?? t("subvenciones.list.borrar_error")));
      return;
    }
    await loadFicha(ficha.expediente.id);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {historial
              ? t("subvenciones.list.title_historial")
              : t("subvenciones.list.title_en_curso")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subvenciones.list.subtitle")}</p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={() => void loadList()}>
          <RefreshCw className="w-4 h-4" />
          {t("subvenciones.list.refresh")}
        </Button>
      </div>

      {msg && <p className="text-sm text-primary">{msg}</p>}

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("subvenciones.list.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("subvenciones.list.empty")}</p>
          ) : (
            <ul className="divide-y divide-border max-h-[650px] overflow-y-auto">
              {items.map((item) => (
                <li key={item.expediente.id}>
                  <button
                    type="button"
                    className={`w-full text-left py-3 px-2 rounded-lg hover:bg-muted/40 ${
                      selectedId === item.expediente.id ? "bg-primary/5" : ""
                    }`}
                    onClick={() => void loadFicha(item.expediente.id)}
                  >
                    <p className="font-semibold">{item.expediente.denominacion}</p>
                    <p className="text-xs text-muted-foreground">
                      #{item.expediente.numero ?? item.expediente.id} ·{" "}
                      {labelEstadoExpediente(item.expediente.estado)} ·{" "}
                      {labelSubestado(item.subvencion.subestado)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("subvenciones.list.solicitado_label")}{" "}
                      {eur(item.subvencion.importe_solicitado)} ·{" "}
                      {t("subvenciones.list.concedido_label")}{" "}
                      {eur(item.subvencion.importe_concedido)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          {!ficha ? (
            <p className="text-muted-foreground">
              {selected
                ? t("subvenciones.list.loading_ficha")
                : t("subvenciones.list.elige")}
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">{ficha.expediente.denominacion}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("subvenciones.list.estado_label")}{" "}
                    {labelEstadoExpediente(ficha.expediente.estado)} ·{" "}
                    {labelSubestado(ficha.subvencion.subestado)}
                  </p>
                </div>
                {!historial && (
                  <div className="flex flex-wrap gap-2">
                    {!ficha.subvencion.propuesta_inicial_id && ficha.expediente.estado === "preparando" && (
                      <Button className="gap-1.5" onClick={() => void presentar("inicial")}>
                        <Send className="w-4 h-4" />
                        {t("subvenciones.list.presentar_junta")}
                      </Button>
                    )}
                    {!ficha.subvencion.propuesta_cierre_id && ficha.expediente.estado === "en_curso" && (
                      <Button variant="outline" className="gap-1.5" onClick={() => void presentar("cierre")}>
                        <Send className="w-4 h-4" />
                        {t("subvenciones.list.proponer_cierre")}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <Info label={t("subvenciones.info.organismo")} value={ficha.subvencion.organismo ?? "—"} />
                <Info label={t("subvenciones.info.convocatoria")} value={ficha.subvencion.convocatoria_codigo ?? "—"} />
                <Info label={t("subvenciones.info.plazo_solicitud")} value={fmtDate(ficha.subvencion.plazo_solicitud)} />
                <Info label={t("subvenciones.info.disponible")} value={eur(ficha.subvencion.importe_disponible)} />
                <Info label={t("subvenciones.info.solicitado")} value={eur(ficha.subvencion.importe_solicitado)} />
                <Info label={t("subvenciones.info.concedido")} value={eur(ficha.subvencion.importe_concedido)} />
                <Info label={t("subvenciones.info.justif_intermedia")} value={eur(ficha.subvencion.importe_justif_intermedio)} />
                <Info label={t("subvenciones.info.cobrado_intermedio")} value={eur(ficha.subvencion.importe_cobrado_intermedio)} />
                <Info label={t("subvenciones.info.cobrado_final")} value={eur(ficha.subvencion.importe_cobrado_final)} />
              </div>

              {!historial && (
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <h3 className="font-semibold">{t("subvenciones.list.avance_flujo")}</h3>
                  <select
                    value={ficha.subvencion.subestado}
                    onChange={(e) => void cambiarSubestado(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-border text-sm"
                  >
                    {SUBESTADOS.map((s) => (
                      <option key={s} value={s}>
                        {labelSubestado(s)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="font-semibold">{t("subvenciones.list.documentos")}</h3>
                {ficha.documentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("subvenciones.list.sin_documentos")}</p>
                ) : (
                  <ul className="space-y-2">
                    {ficha.documentos.map((doc) => {
                      const expedienteActivo = ESTADOS_ACTIVOS.has(ficha.expediente.estado);
                      const esHistorico = doc.origen === "historico";
                      const puedeBorrar = expedienteActivo || esHistorico;
                      return (
                        <li key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 flex-wrap">
                            <FileText className="w-4 h-4" />
                            {doc.denominacion ?? doc.filename ?? labelTipoDoc(doc.tipo)}
                            <span className="text-muted-foreground">({labelTipoDoc(doc.tipo)})</span>
                            {esHistorico && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                {t("subvenciones.list.badge_historico")}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-3 shrink-0">
                            <a href={doc.url} target="_blank" rel="noreferrer" className="text-primary inline-flex gap-1">
                              <Download className="w-4 h-4" />
                              {t("subvenciones.list.doc_abrir")}
                            </a>
                            {puedeBorrar && (
                              <button
                                type="button"
                                onClick={() => void borrarDocumento(doc.id)}
                                className="text-destructive inline-flex items-center gap-1 hover:underline"
                                aria-label={t("subvenciones.list.doc_borrar")}
                                title={t("subvenciones.list.doc_borrar")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="grid md:grid-cols-2 gap-2 pt-3 border-t border-border">
                  {historial && (
                    <p className="md:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                      {t("subvenciones.list.hint_subir_historico")}
                    </p>
                  )}
                  <select
                    value={upload.tipo}
                    onChange={(e) => setUpload((p) => ({ ...p, tipo: e.target.value }))}
                    className="px-3 py-2 rounded-lg border border-border text-sm"
                  >
                    {TIPOS_DOC.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {labelTipoDoc(tipo)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={upload.denominacion}
                    onChange={(e) => setUpload((p) => ({ ...p, denominacion: e.target.value }))}
                    placeholder={t("subvenciones.field.denominacion")}
                    className="px-3 py-2 rounded-lg border border-border text-sm"
                  />
                  <input
                    type="date"
                    value={upload.fecha_documento}
                    onChange={(e) => setUpload((p) => ({ ...p, fecha_documento: e.target.value }))}
                    className="px-3 py-2 rounded-lg border border-border text-sm"
                    aria-label={t("subvenciones.field.fecha_decreto")}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={upload.importe}
                    onChange={(e) => setUpload((p) => ({ ...p, importe: e.target.value }))}
                    placeholder={t("subvenciones.field.importe_asociado_placeholder")}
                    className="px-3 py-2 rounded-lg border border-border text-sm"
                  />
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setUpload((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
                    className="md:col-span-2 text-sm"
                  />
                  <Button
                    className="md:col-span-2"
                    variant="outline"
                    disabled={!upload.file}
                    onClick={() => void subirDocumento()}
                  >
                    {historial
                      ? t("subvenciones.list.subir_documento_historico")
                      : t("subvenciones.list.subir_documento")}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 space-y-2">
                <h3 className="font-semibold">{t("subvenciones.list.propuestas")}</h3>
                {ficha.propuestas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("subvenciones.list.sin_propuestas")}</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {ficha.propuestas.map((p) => (
                      <li key={p.id} className="rounded-lg bg-muted/30 p-2">
                        #{p.id} · {p.denominacion} · {t(`buzon.estado.${p.estado_buzon}`)}
                        {p.resultado ? ` · ${t(`buzon.resultado.${p.resultado}`)}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-border p-4 space-y-2">
                <h3 className="font-semibold">{t("subvenciones.list.acciones")}</h3>
                {ficha.acciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("subvenciones.list.sin_acciones")}</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {ficha.acciones.map((a) => (
                      <li key={a.id} className="rounded-lg bg-muted/30 p-2">
                        {a.descripcion} · {a.estado}
                        {a.responsable_nombre ? ` · ${a.responsable_nombre}` : ""}
                        {a.plazo ? ` · ${fmtDate(a.plazo)}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
