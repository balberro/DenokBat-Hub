import { useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { FileText, Save, Trash2, Upload } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TIPOS_DOC_HISTORICO = [
  "decreto",
  "solicitud",
  "resolucion",
  "justif_intermedia",
  "contestacion_intermedia",
  "justif_final",
  "contestacion_final",
  "otros",
] as const;

type Modo = "activa" | "historica";

type DocHistoricoForm = {
  uid: string;
  tipo: string;
  denominacion: string;
  fecha_documento: string;
  importe: string;
  notas: string;
  file: File | null;
};

function nuevoDocHistorico(): DocHistoricoForm {
  return {
    uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo: "otros",
    denominacion: "",
    fecha_documento: "",
    importe: "",
    notas: "",
    file: null,
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SubvencionesNueva() {
  const token = useStore((s) => s.token);
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [modo, setModo] = useState<Modo>("activa");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    denominacion: "",
    descripcion: "",
    organismo: "",
    convocatoria_codigo: "",
    plazo_solicitud: "",
    plazo_justif_intermedia: "",
    plazo_justif_final: "",
    importe_disponible: "",
    importe_solicitado: "",
    observaciones: "",
    fecha_decreto: "",
  });

  const [hist, setHist] = useState({
    estado_final: "cerrado" as "cerrado" | "archivado",
    subestado_final: "resuelta_concedida",
    fecha_cierre: "",
    importe_concedido: "",
    importe_justif_intermedio: "",
    importe_cobrado_intermedio: "",
    importe_justif_final: "",
    importe_cobrado_final: "",
  });
  const [docsHist, setDocsHist] = useState<DocHistoricoForm[]>([nuevoDocHistorico()]);

  const set = (key: keyof typeof form, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const setH = (key: keyof typeof hist, value: string) => setHist((p) => ({ ...p, [key]: value }));

  function updateDoc(uid: string, patch: Partial<DocHistoricoForm>) {
    setDocsHist((prev) => prev.map((d) => (d.uid === uid ? { ...d, ...patch } : d)));
  }
  function addDoc() {
    setDocsHist((prev) => [...prev, nuevoDocHistorico()]);
  }
  function removeDoc(uid: string) {
    setDocsHist((prev) => (prev.length <= 1 ? prev : prev.filter((d) => d.uid !== uid)));
  }

  async function guardarActiva() {
    if (!token) return;
    if (!form.denominacion.trim() || !form.descripcion.trim()) {
      setMsg(t("subvenciones.nueva.required_error"));
      return;
    }
    setSaving(true);
    try {
      const decreto_pdf = file ? await fileToDataUrl(file) : "";
      const r = await fetch(`${API_BASE}/api/admin/subvenciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          decreto_pdf,
          decreto_filename: file?.name ?? "",
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("subvenciones.nueva.create_error")));
        return;
      }
      setMsg(t("subvenciones.nueva.creada_ok"));
      setLocation("/admin/subvenciones/en-curso");
    } catch {
      setMsg(t("subvenciones.nueva.network_error"));
    } finally {
      setSaving(false);
    }
  }

  async function guardarHistorica() {
    if (!token) return;
    if (!form.denominacion.trim() || !form.descripcion.trim()) {
      setMsg(t("subvenciones.nueva.required_error"));
      return;
    }
    setSaving(true);
    try {
      const documentos: Array<Record<string, unknown>> = [];
      for (const d of docsHist) {
        if (!d.file) continue;
        const pdf = await fileToDataUrl(d.file);
        documentos.push({
          tipo: d.tipo,
          denominacion: d.denominacion || null,
          fecha_documento: d.fecha_documento || null,
          importe: d.importe || null,
          notas: d.notas || null,
          original_name: d.file.name,
          pdf,
        });
      }
      const r = await fetch(`${API_BASE}/api/admin/subvenciones/historico`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          estado_final: hist.estado_final,
          subestado_final: hist.subestado_final,
          fecha_cierre: hist.fecha_cierre || null,
          importe_concedido: hist.importe_concedido || null,
          importe_justif_intermedio: hist.importe_justif_intermedio || null,
          importe_cobrado_intermedio: hist.importe_cobrado_intermedio || null,
          importe_justif_final: hist.importe_justif_final || null,
          importe_cobrado_final: hist.importe_cobrado_final || null,
          documentos,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("subvenciones.nueva.create_error")));
        return;
      }
      setMsg(t("subvenciones.nueva.creada_historica_ok"));
      setLocation("/admin/subvenciones/historial");
    } catch {
      setMsg(t("subvenciones.nueva.network_error"));
    } finally {
      setSaving(false);
    }
  }

  async function guardar() {
    return modo === "historica" ? guardarHistorica() : guardarActiva();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {modo === "historica" ? t("subvenciones.nueva.title_historica") : t("subvenciones.nueva.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {modo === "historica"
            ? t("subvenciones.nueva.subtitle_historica")
            : t("subvenciones.nueva.subtitle")}
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-white p-1 text-sm">
        <button
          type="button"
          onClick={() => setModo("activa")}
          className={`px-3 py-1.5 rounded-lg ${
            modo === "activa" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {t("subvenciones.nueva.modo_activa")}
        </button>
        <button
          type="button"
          onClick={() => setModo("historica")}
          className={`px-3 py-1.5 rounded-lg ${
            modo === "historica" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {t("subvenciones.nueva.modo_historica")}
        </button>
      </div>

      {msg && <p className="text-sm text-primary">{msg}</p>}

      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t("subvenciones.field.denominacion")} required>
            <input
              value={form.denominacion}
              onChange={(e) => set("denominacion", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </Field>
          <Field label={t("subvenciones.field.organismo")}>
            <input
              value={form.organismo}
              onChange={(e) => set("organismo", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </Field>
          <Field label={t("subvenciones.field.codigo_convocatoria")}>
            <input
              value={form.convocatoria_codigo}
              onChange={(e) => set("convocatoria_codigo", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </Field>
          <Field label={t("subvenciones.field.plazo_solicitud")}>
            <input
              type="date"
              value={form.plazo_solicitud}
              onChange={(e) => set("plazo_solicitud", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </Field>
          <Field label={t("subvenciones.field.plazo_justif_intermedia")}>
            <input
              type="date"
              value={form.plazo_justif_intermedia}
              onChange={(e) => set("plazo_justif_intermedia", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </Field>
          <Field label={t("subvenciones.field.plazo_justif_final")}>
            <input
              type="date"
              value={form.plazo_justif_final}
              onChange={(e) => set("plazo_justif_final", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </Field>
          <Field label={t("subvenciones.field.importe_disponible")}>
            <input
              type="number"
              step="0.01"
              value={form.importe_disponible}
              onChange={(e) => set("importe_disponible", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </Field>
          <Field label={t("subvenciones.field.importe_solicitado_previsto")}>
            <input
              type="number"
              step="0.01"
              value={form.importe_solicitado}
              onChange={(e) => set("importe_solicitado", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </Field>
        </div>

        <Field label={t("subvenciones.field.descripcion")} required>
          <textarea
            value={form.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-border"
            placeholder={t("subvenciones.field.descripcion_placeholder")}
          />
        </Field>

        <Field label={t("subvenciones.field.observaciones")}>
          <textarea
            value={form.observaciones}
            onChange={(e) => set("observaciones", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border"
          />
        </Field>

        {modo === "activa" && (
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t("subvenciones.nueva.decreto_pdf")}
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              <input
                type="date"
                value={form.fecha_decreto}
                onChange={(e) => set("fecha_decreto", e.target.value)}
                className="px-3 py-2 rounded-lg border border-border"
                aria-label={t("subvenciones.field.fecha_decreto")}
              />
            </div>
          </div>
        )}

        {modo === "historica" && (
          <>
            <div className="rounded-xl border border-border p-4 space-y-3">
              <h2 className="font-semibold">{t("subvenciones.nueva.historica_resultado_seccion")}</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label={t("subvenciones.field.estado_final")}>
                  <select
                    value={hist.estado_final}
                    onChange={(e) => setH("estado_final", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border"
                  >
                    <option value="cerrado">{t("expedientes.estado.cerrado")}</option>
                    <option value="archivado">{t("expedientes.estado.archivado")}</option>
                  </select>
                </Field>
                <Field label={t("subvenciones.field.subestado_final")}>
                  <select
                    value={hist.subestado_final}
                    onChange={(e) => setH("subestado_final", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border"
                  >
                    <option value="resuelta_concedida">{t("subvenciones.subestado.resuelta_concedida")}</option>
                    <option value="resuelta_denegada">{t("subvenciones.subestado.resuelta_denegada")}</option>
                    <option value="contestada_final">{t("subvenciones.subestado.contestada_final")}</option>
                    <option value="propuesta_cierre">{t("subvenciones.subestado.propuesta_cierre")}</option>
                  </select>
                </Field>
                <Field label={t("subvenciones.field.fecha_cierre")}>
                  <input
                    type="date"
                    value={hist.fecha_cierre}
                    onChange={(e) => setH("fecha_cierre", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border"
                  />
                </Field>
                <Field label={t("subvenciones.field.importe_concedido")}>
                  <input
                    type="number"
                    step="0.01"
                    value={hist.importe_concedido}
                    onChange={(e) => setH("importe_concedido", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border"
                  />
                </Field>
                <Field label={t("subvenciones.field.importe_justif_intermedio")}>
                  <input
                    type="number"
                    step="0.01"
                    value={hist.importe_justif_intermedio}
                    onChange={(e) => setH("importe_justif_intermedio", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border"
                  />
                </Field>
                <Field label={t("subvenciones.field.importe_cobrado_intermedio")}>
                  <input
                    type="number"
                    step="0.01"
                    value={hist.importe_cobrado_intermedio}
                    onChange={(e) => setH("importe_cobrado_intermedio", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border"
                  />
                </Field>
                <Field label={t("subvenciones.field.importe_justif_final")}>
                  <input
                    type="number"
                    step="0.01"
                    value={hist.importe_justif_final}
                    onChange={(e) => setH("importe_justif_final", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border"
                  />
                </Field>
                <Field label={t("subvenciones.field.importe_cobrado_final")}>
                  <input
                    type="number"
                    step="0.01"
                    value={hist.importe_cobrado_final}
                    onChange={(e) => setH("importe_cobrado_final", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border"
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t("subvenciones.nueva.historica_documentos")}
                </h2>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addDoc}>
                  <Upload className="w-4 h-4" />
                  {t("subvenciones.nueva.historica_add_doc")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("subvenciones.nueva.historica_documentos_hint")}
              </p>
              <div className="space-y-3">
                {docsHist.map((d) => (
                  <div key={d.uid} className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                    <div className="grid md:grid-cols-2 gap-2">
                      <select
                        value={d.tipo}
                        onChange={(e) => updateDoc(d.uid, { tipo: e.target.value })}
                        className="px-3 py-2 rounded-lg border border-border text-sm bg-white"
                      >
                        {TIPOS_DOC_HISTORICO.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {t(`subvenciones.doc.${tipo}`)}
                          </option>
                        ))}
                      </select>
                      <input
                        value={d.denominacion}
                        onChange={(e) => updateDoc(d.uid, { denominacion: e.target.value })}
                        placeholder={t("subvenciones.field.denominacion")}
                        className="px-3 py-2 rounded-lg border border-border text-sm"
                      />
                      <input
                        type="date"
                        value={d.fecha_documento}
                        onChange={(e) => updateDoc(d.uid, { fecha_documento: e.target.value })}
                        className="px-3 py-2 rounded-lg border border-border text-sm"
                        aria-label={t("subvenciones.field.fecha_decreto")}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={d.importe}
                        onChange={(e) => updateDoc(d.uid, { importe: e.target.value })}
                        placeholder={t("subvenciones.field.importe_asociado_placeholder")}
                        className="px-3 py-2 rounded-lg border border-border text-sm"
                      />
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => updateDoc(d.uid, { file: e.target.files?.[0] ?? null })}
                        className="md:col-span-2 text-sm"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeDoc(d.uid)}
                        disabled={docsHist.length <= 1}
                        className="text-destructive inline-flex items-center gap-1 text-xs disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("subvenciones.nueva.historica_remove_doc")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button className="gap-2" disabled={saving} onClick={() => void guardar()}>
            <Save className="w-4 h-4" />
            {modo === "historica"
              ? t("subvenciones.nueva.submit_historica")
              : t("subvenciones.nueva.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
