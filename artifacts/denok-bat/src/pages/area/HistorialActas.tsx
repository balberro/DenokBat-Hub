import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Archive, Printer, Download } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ActaResumen = {
  id: number;
  numero: number | null;
  titulo: string;
  fecha: string | null;
  firmada_en: string | null;
  pdf_url: string | null;
  pdf_filename: string | null;
  pdf_anyo_mes: string | null;
  conv_numero: number | null;
  conv_titulo: string | null;
  conv_tipo: string | null;
};

type Acta = {
  id: number;
  numero: number | null;
  titulo: string;
  fecha: string | null;
  estado: string;
  asistentes: string | null;
  resumen: string | null;
  observaciones: string | null;
  firmada_en?: string | null;
  pdf_url?: string | null;
  pdf_filename?: string | null;
  pdf_anyo_mes?: string | null;
  convocatoria?: {
    id: number;
    numero: number | null;
    titulo: string;
    tipo: string;
    fecha: string | null;
    hora: string | null;
    lugar: string | null;
  } | null;
};

type Punto = {
  id: number;
  orden: number;
  titulo: string | null;
  descripcion: string | null;
  acuerdo: string | null;
  resultado_propuesta: string | null;
  expediente_accion: string | null;
  expediente_id: number | null;
  notas: string | null;
  propuesta: { id: number; denominacion: string; descripcion: string } | null;
};

export default function HistorialActas({ embedded = false }: { embedded?: boolean } = {}) {
  const token = useStore((s) => s.token);
  const { t } = useTranslation();

  const [items, setItems] = useState<ActaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<{ acta: Acta; puntos: Punto[] } | null>(null);

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/actas-firmadas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setItems((d.items as ActaResumen[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadDetalle = useCallback(
    async (id: number) => {
      if (!token) return;
      setSelectedId(id);
      const r = await fetch(`${API_BASE}/api/actas-firmadas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setDetalle(d);
      else setDetalle(null);
    },
    [token],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  return (
    <div className={embedded ? "" : "max-w-6xl mx-auto px-4 py-10"}>
      {!embedded && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Archive className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("historial_actas.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("historial_actas.intro")}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("historial_actas.empty")}</p>
          ) : (
            <ul className="divide-y divide-border max-h-[520px] overflow-y-auto">
              {items.map((a) => (
                <li key={a.id} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => void loadDetalle(a.id)}
                    className={`flex-1 text-left px-3 py-3 hover:bg-muted/30 transition-colors ${
                      selectedId === a.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <p className="font-semibold text-foreground">
                      {a.numero != null ? `#${a.numero} · ` : ""}
                      {a.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.pdf_anyo_mes ? `${a.pdf_anyo_mes} · ` : a.fecha ? `${a.fecha} · ` : ""}
                      {a.conv_titulo ?? ""}
                    </p>
                  </button>
                  {a.pdf_url && (
                    <a
                      href={`${API_BASE}${a.pdf_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={a.pdf_filename ?? undefined}
                      title={t("actas.firma.descargar_pdf")}
                      className="flex items-center justify-center px-3 text-muted-foreground hover:text-primary hover:bg-muted/30"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 min-h-[320px]">
          {!detalle ? (
            <p className="text-sm text-muted-foreground">{t("historial_actas.select_one")}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {detalle.acta.numero != null
                      ? `${t("actas.numero")} ${detalle.acta.numero}`
                      : `#${detalle.acta.id}`}
                  </h2>
                  <p className="text-sm font-medium text-foreground mt-1">{detalle.acta.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {detalle.acta.fecha ?? ""}
                    {detalle.acta.convocatoria
                      ? ` · ${t("actas.field.convocatoria")}: ${detalle.acta.convocatoria.titulo}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detalle.acta.pdf_url && (
                    <a
                      href={`${API_BASE}${detalle.acta.pdf_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={detalle.acta.pdf_filename ?? undefined}
                      className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted/40"
                    >
                      <Download className="w-4 h-4" />
                      {t("actas.firma.descargar_pdf")}
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => window.open(`${API_BASE}/actas/${detalle.acta.id}/imprimir`, "_blank")}
                  >
                    <Printer className="w-4 h-4" />
                    {t("actas.print.button")}
                  </Button>
                </div>
              </div>

              {detalle.acta.asistentes && (
                <p className="text-sm whitespace-pre-wrap">
                  <span className="font-semibold">{t("actas.field.asistentes")}: </span>
                  {detalle.acta.asistentes}
                </p>
              )}
              {detalle.acta.resumen && (
                <p className="text-sm whitespace-pre-wrap">
                  <span className="font-semibold">{t("actas.field.resumen")}: </span>
                  {detalle.acta.resumen}
                </p>
              )}
              {detalle.acta.observaciones && (
                <p className="text-sm whitespace-pre-wrap">
                  <span className="font-semibold">{t("actas.field.observaciones")}: </span>
                  {detalle.acta.observaciones}
                </p>
              )}

              <div>
                <h3 className="font-semibold text-sm mb-2">{t("actas.print.puntos_titulo")}</h3>
                <ol className="space-y-3 text-sm">
                  {detalle.puntos.map((p, idx) => (
                    <li key={p.id} className="border border-border rounded-xl px-3 py-2">
                      <p className="font-medium text-foreground">
                        {idx + 1}. {p.titulo ?? p.propuesta?.denominacion ?? t("actas.puntos.sin_titulo")}
                      </p>
                      {p.descripcion && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                          {p.descripcion}
                        </p>
                      )}
                      {p.acuerdo && (
                        <p className="mt-1 whitespace-pre-wrap">
                          <span className="font-semibold">{t("actas.field.acuerdo")}: </span>
                          {p.acuerdo}
                        </p>
                      )}
                      {p.resultado_propuesta && (
                        <p className="text-xs">
                          {t("actas.field.resultado")}:{" "}
                          {t(`actas.resultado.${p.resultado_propuesta}`)}
                        </p>
                      )}
                      {p.expediente_accion && (
                        <p className="text-xs">
                          {t("actas.field.expediente_accion")}:{" "}
                          {t(`actas.expediente_accion.${p.expediente_accion}`)}
                          {p.expediente_id != null ? ` · #${p.expediente_id}` : ""}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
