import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { useStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Upload, ExternalLink, Trash2, X } from "lucide-react";

const API = "/api";

type Tipo = "fiesta" | "excursion" | "viaje" | "evento" | "actividad";

type PagoRow = {
  id: number;
  socioId: number | null;
  inscripcionId: number | null;
  concepto: string;
  importe: number;
  metodo: string | null;
  estado: string | null;
  fechaPago: string | null;
  referencia: string | null;
  justificanteUrl: string | null;
  justificanteSubidoEn: string | null;
  notas: string | null;
  createdAt: string | null;
  socio: {
    nombre: string | null;
    apellidos: string | null;
    poblacion: string | null;
    grupoId: number | null;
  };
  inscripcion: {
    id: number;
    tipo: Tipo | string;
    eventoId: number | null;
    eventoNombre: string | null;
    eventoNombreEu: string | null;
  } | null;
};

type Totales = {
  total: number;
  cobrados: number;
  pendientes: number;
  conJustificante: number;
  sinJustificante: number;
  importeTotal: number;
  importeCobrado: number;
  importePendiente: number;
};

function fmtMoney(n: number): string {
  return `${n.toFixed(2)} €`;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-ES");
  } catch {
    return "—";
  }
}

function authHeaders(token: string | null): Record<string, string> {
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read error"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export default function PagosGrupo() {
  const { t, lang } = useTranslation();
  const token = useStore((s) => s.token);

  const [estado, setEstado] = useState<"" | "pagado" | "pendiente">("");
  const [metodo, setMetodo] = useState<string>("");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  const [items, setItems] = useState<PagoRow[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const [editing, setEditing] = useState<PagoRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    if (estado) qs.set("estado", estado);
    if (metodo) qs.set("metodo", metodo);
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    return qs.toString();
  }, [estado, metodo, desde, hasta]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setMotivo(null);
      try {
        const r = await fetch(`${API}/delegado/pagos${queryString ? `?${queryString}` : ""}`, {
          headers: authHeaders(token),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(String(d?.error ?? r.status));
        if (cancelled) return;
        setItems(Array.isArray(d?.items) ? d.items : []);
        setTotales(d?.totales ?? null);
        setMotivo(typeof d?.motivo === "string" ? d.motivo : null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("common.error"));
        setItems([]);
        setTotales(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, queryString]);

  const reload = async () => {
    if (!token) return;
    const r = await fetch(`${API}/delegado/pagos${queryString ? `?${queryString}` : ""}`, {
      headers: authHeaders(token),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return;
    setItems(Array.isArray(d?.items) ? d.items : []);
    setTotales(d?.totales ?? null);
  };

  const patchPago = async (
    id: number,
    patch: Partial<{
      justificante: string | null;
      notas: string | null;
      referencia: string | null;
      metodo: string;
      fechaPago: string;
    }>,
  ): Promise<boolean> => {
    if (!token) return false;
    setSavingId(id);
    try {
      const r = await fetch(`${API}/delegado/pagos/${id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(patch),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      await reload();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const handleUploadJustificante = async (pago: PagoRow, file: File) => {
    if (!token) return;
    setUploadingId(pago.id);
    try {
      const dataUrl = await fileToDataUrl(file);
      await patchPago(pago.id, { justificante: dataUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setUploadingId(null);
    }
  };

  const triggerUpload = (pago: PagoRow) => {
    setEditing(pago);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground mb-2">{t("pagos_grupo.title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("pagos_grupo.subtitle")}</p>

      <div className="grid md:grid-cols-4 gap-2 mb-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t("pagos_grupo.filter.estado")}
          </label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as "" | "pagado" | "pendiente")}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">{t("common.all")}</option>
            <option value="pagado">{t("pagos_grupo.estado.pagado")}</option>
            <option value="pendiente">{t("pagos_grupo.estado.pendiente")}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t("pagos_grupo.filter.metodo")}
          </label>
          <select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">{t("common.all")}</option>
            <option value="efectivo">{t("grupo_inscripcion.pago.efectivo")}</option>
            <option value="transferencia">{t("pagos.transfer")}</option>
            <option value="ingreso">{t("grupo_inscripcion.liquidacion.metodo.ingreso")}</option>
            <option value="bizum">Bizum</option>
            <option value="tpv">{t("grupo_inscripcion.liquidacion.metodo.tpv")}</option>
            <option value="tesoreria">{t("grupo_inscripcion.liquidacion.metodo.tesoreria")}</option>
            <option value="otro">{t("grupo_inscripcion.liquidacion.metodo.otro")}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t("pagos_grupo.filter.desde")}
          </label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t("pagos_grupo.filter.hasta")}
          </label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {motivo === "usuario_sin_socio" || motivo === "no_es_delegado" ? (
        <p className="text-sm text-muted-foreground mb-4">{t("pagos_grupo.no_group")}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">{t("pagos_grupo.no_pagos")}</p>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold text-muted-foreground">{t("pagos_grupo.col.fecha")}</th>
                <th className="px-3 py-2 font-semibold text-muted-foreground">{t("pagos_grupo.col.socio")}</th>
                <th className="px-3 py-2 font-semibold text-muted-foreground">{t("pagos_grupo.col.concepto")}</th>
                <th className="px-3 py-2 font-semibold text-muted-foreground text-right">{t("pagos_grupo.col.importe")}</th>
                <th className="px-3 py-2 font-semibold text-muted-foreground">{t("pagos_grupo.col.metodo")}</th>
                <th className="px-3 py-2 font-semibold text-muted-foreground">{t("pagos_grupo.col.estado")}</th>
                <th className="px-3 py-2 font-semibold text-muted-foreground">{t("pagos_grupo.col.referencia")}</th>
                <th className="px-3 py-2 font-semibold text-muted-foreground">{t("pagos_grupo.col.justificante")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((p) => {
                const nombre = `${p.socio.apellidos ?? ""} ${p.socio.nombre ?? ""}`.trim();
                const evNombre = p.inscripcion
                  ? (lang === "eu" ? p.inscripcion.eventoNombreEu || p.inscripcion.eventoNombre : p.inscripcion.eventoNombre)
                  : null;
                return (
                  <tr key={p.id} className="hover:bg-muted/20 align-top">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(p.fechaPago)}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground">{nombre || `#${p.socioId ?? "-"}`}</p>
                      {p.socio.poblacion ? (
                        <p className="text-xs text-muted-foreground">{p.socio.poblacion}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      <p>{p.concepto}</p>
                      {evNombre ? (
                        <p className="text-xs text-muted-foreground">{evNombre}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-semibold text-right whitespace-nowrap">{fmtMoney(p.importe)}</td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">{p.metodo ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          String(p.estado).toLowerCase() === "pagado"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.estado ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.referencia ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1.5">
                        {p.justificanteUrl ? (
                          <a
                            href={p.justificanteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {t("pagos_grupo.ver_pdf")}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 gap-1 text-xs"
                            onClick={() => triggerUpload(p)}
                            disabled={uploadingId === p.id}
                          >
                            {uploadingId === p.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Upload className="w-3 h-3" />
                            )}
                            {p.justificanteUrl ? t("pagos_grupo.cambiar") : t("pagos_grupo.subir")}
                          </Button>
                          {p.justificanteUrl ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={() => void patchPago(p.id, { justificante: null })}
                              disabled={savingId === p.id}
                              title={t("pagos_grupo.quitar")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs justify-start"
                          onClick={() => setEditing(p)}
                        >
                          {t("pagos_grupo.detalles")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totales ? (
              <tfoot>
                <tr className="bg-muted/30 font-bold text-sm">
                  <td className="px-3 py-2" colSpan={3}>
                    {t("pagos_grupo.totales.total")}: {totales.total}
                    {" · "}
                    <span className="text-green-700">
                      {t("pagos_grupo.totales.cobrados")}: {totales.cobrados}
                    </span>
                    {" · "}
                    <span className="text-amber-700">
                      {t("pagos_grupo.totales.pendientes")}: {totales.pendientes}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{fmtMoney(totales.importeTotal)}</td>
                  <td className="px-3 py-2 text-xs font-normal text-muted-foreground" colSpan={4}>
                    <span className="text-green-700">
                      {t("pagos_grupo.totales.importe_cobrado")}: {fmtMoney(totales.importeCobrado)}
                    </span>
                    {" · "}
                    <span className="text-amber-700">
                      {t("pagos_grupo.totales.importe_pendiente")}: {fmtMoney(totales.importePendiente)}
                    </span>
                    <br />
                    {t("pagos_grupo.totales.con_justif")}: {totales.conJustificante}
                    {" / "}
                    {t("pagos_grupo.totales.sin_justif")}: {totales.sinJustificante}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}

      {/* Input file oculto reutilizado para subir el PDF del pago en edición. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && editing) {
            void handleUploadJustificante(editing, file);
          }
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      {editing ? (
        <DetallePagoModal
          pago={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            const ok = await patchPago(editing.id, patch);
            if (ok) setEditing(null);
          }}
          saving={savingId === editing.id}
          t={t}
        />
      ) : null}
    </div>
  );
}

function DetallePagoModal({
  pago,
  onClose,
  onSave,
  saving,
  t,
}: {
  pago: PagoRow;
  onClose: () => void;
  onSave: (patch: { referencia: string | null; notas: string | null }) => Promise<void>;
  saving: boolean;
  t: (k: string) => string;
}) {
  const [referencia, setReferencia] = useState<string>(pago.referencia ?? "");
  const [notas, setNotas] = useState<string>(pago.notas ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{t("pagos_grupo.modal.title")}</h3>
            <p className="text-sm text-muted-foreground">
              {`${pago.socio.apellidos ?? ""} ${pago.socio.nombre ?? ""}`.trim() || `#${pago.socioId ?? "-"}`}
              {" · "}
              {fmtMoney(pago.importe)}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {t("pagos_grupo.col.referencia")}
            </label>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {t("pagos_grupo.notas")}
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          {pago.justificanteUrl ? (
            <a
              href={pago.justificanteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm"
            >
              <FileText className="w-4 h-4" />
              {t("pagos_grupo.ver_pdf")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : null}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button
            className="flex-1"
            disabled={saving}
            onClick={() =>
              void onSave({
                referencia: referencia.trim() || null,
                notas: notas.trim() || null,
              })
            }
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
