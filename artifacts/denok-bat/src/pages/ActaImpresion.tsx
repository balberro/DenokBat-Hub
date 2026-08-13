import { useCallback, useEffect, useState } from "react";
import { useParams } from "wouter";
import { useStore, getUserRoles } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Printer, X, Download } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  propuesta: {
    id: number;
    denominacion: string;
    descripcion: string;
    decision_solicitada?: string;
    resultado: string | null;
  } | null;
};

type AccionExp = {
  id: number;
  descripcion: string;
  responsable_nombre: string | null;
  responsable_username: string | null;
  estado: string;
  plazo: string | null;
};

export default function ActaImpresion() {
  const params = useParams<{ id: string }>();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const { t } = useTranslation();
  const roles = user ? getUserRoles(user) : [];
  const esStaff = roles.includes("contable") || roles.includes("directivo");

  const [data, setData] = useState<{ acta: Acta; puntos: Punto[] } | null>(null);
  const [accionesPorExp, setAccionesPorExp] = useState<Record<number, AccionExp[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    setLoading(true);
    try {
      const url = esStaff
        ? `${API_BASE}/api/admin/actas/${params.id}`
        : `${API_BASE}/api/actas-firmadas/${params.id}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok) {
        setError(String(d?.error ?? t("common.error")));
        setData(null);
        return;
      }
      setData(d);
      const expedienteIds = Array.from(
        new Set(
          (d.puntos as Punto[])
            .map((p) => p.expediente_id)
            .filter((x): x is number => x != null),
        ),
      );
      if (esStaff && expedienteIds.length > 0) {
        const all: Array<[number, AccionExp[]]> = await Promise.all(
          expedienteIds.map(async (eid) => {
            try {
              const ra = await fetch(`${API_BASE}/api/admin/expedientes/${eid}/acciones`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const da = await ra.json();
              return [eid, (da.items as AccionExp[]) ?? []];
            } catch {
              return [eid, []];
            }
          }),
        );
        const map: Record<number, AccionExp[]> = {};
        for (const [eid, items] of all) map[eid] = items;
        setAccionesPorExp(map);
      }
    } finally {
      setLoading(false);
    }
  }, [token, params.id, esStaff, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p>{t("actas.print.login_required")}</p>
      </div>
    );
  }
  if (loading) return <p className="p-6">{t("common.loading")}</p>;
  if (error || !data) return <p className="p-6 text-red-700">{error ?? t("common.error")}</p>;

  const { acta, puntos } = data;
  const esBorrador = acta.estado !== "firmada";

  return (
    <div className="acta-print-root">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .acta-print-root { background: white !important; }
          body { background: white !important; }
          @page { margin: 18mm; }
        }
        .acta-print-page {
          max-width: 820px;
          margin: 32px auto;
          padding: 32px;
          background: white;
          color: #222;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.5;
        }
        .acta-print-page h1 { font-size: 24px; margin: 0; }
        .acta-print-page h2 { font-size: 18px; margin: 4px 0 12px; color: #555; font-weight: normal; }
        .acta-print-page h3 { font-size: 16px; margin: 24px 0 8px; }
        .acta-print-page h4 { font-size: 14px; margin: 12px 0 4px; }
        .acta-print-page .borrador-banner {
          display: inline-block;
          border: 2px solid #b91c1c;
          color: #b91c1c;
          padding: 4px 12px;
          font-weight: bold;
          letter-spacing: 0.1em;
          margin-bottom: 16px;
        }
        .acta-print-page ol { padding-left: 18px; }
        .acta-print-page li.punto { margin-bottom: 18px; }
        .acta-print-page .meta { color: #555; margin: 0 0 16px; }
        .acta-print-page .pre { white-space: pre-wrap; }
        .acta-print-page .accion-row { border-left: 3px solid #cbd5e1; padding-left: 8px; margin: 4px 0; }
        .acta-print-page .footer { color: #888; font-size: 12px; margin-top: 32px; border-top: 1px solid #ddd; padding-top: 8px; }
      `}</style>

      <div className="no-print" style={{ position: "sticky", top: 0, background: "#f8fafc", padding: "8px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <span style={{ fontSize: 13, color: "#475569" }}>{t("actas.print.toolbar_hint")}</span>
        <div style={{ display: "flex", gap: 8 }}>
          {data?.acta?.pdf_url && (
            <a
              href={`${API_BASE}${data.acta.pdf_url}`}
              target="_blank"
              rel="noopener noreferrer"
              download={data.acta.pdf_filename ?? undefined}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted/40"
            >
              <Download className="w-4 h-4" />
              {t("actas.firma.descargar_pdf")}
            </a>
          )}
          <Button size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" />
            {t("actas.print.button")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => window.close()} className="gap-1.5">
            <X className="w-4 h-4" />
            {t("common.close")}
          </Button>
        </div>
      </div>

      <div className="acta-print-page">
        {esBorrador && (
          <div className="borrador-banner">
            {t("actas.print.borrador")} — {t(`actas.estado.${acta.estado}`)}
          </div>
        )}
        <h1>{acta.numero != null ? `${t("actas.numero")} ${acta.numero}` : `Acta #${acta.id}`}</h1>
        <h2>{acta.titulo}</h2>
        <p className="meta">
          {t("actas.field.estado")}: <b>{t(`actas.estado.${acta.estado}`)}</b>
          {acta.fecha ? ` · ${t("actas.field.fecha")}: ${acta.fecha}` : ""}
          {acta.convocatoria ? ` · ${t("actas.field.convocatoria")}: ${acta.convocatoria.titulo}` : ""}
        </p>

        {acta.asistentes && (
          <>
            <h3>{t("actas.field.asistentes")}</h3>
            <p className="pre">{acta.asistentes}</p>
          </>
        )}
        {acta.resumen && (
          <>
            <h3>{t("actas.field.resumen")}</h3>
            <p className="pre">{acta.resumen}</p>
          </>
        )}
        {acta.observaciones && (
          <>
            <h3>{t("actas.field.observaciones")}</h3>
            <p className="pre">{acta.observaciones}</p>
          </>
        )}

        <h3>{t("actas.print.puntos_titulo")}</h3>
        {puntos.length === 0 ? (
          <p><em>{t("actas.puntos.empty")}</em></p>
        ) : (
          <ol>
            {puntos.map((p, idx) => {
              const titulo = p.titulo ?? p.propuesta?.denominacion ?? `${t("actas.puntos.sin_titulo")}`;
              const acciones = p.expediente_id != null ? accionesPorExp[p.expediente_id] : undefined;
              return (
                <li key={p.id} className="punto">
                  <h4>{`${idx + 1}. ${titulo}`}</h4>
                  {p.descripcion && <p className="pre">{p.descripcion}</p>}
                  <p>
                    <b>{t("actas.field.acuerdo")}:</b><br />
                    {p.acuerdo ? <span className="pre">{p.acuerdo}</span> : <em>{t("actas.print.sin_acuerdo")}</em>}
                  </p>
                  {p.resultado_propuesta && (
                    <p><b>{t("actas.field.resultado")}:</b> {t(`actas.resultado.${p.resultado_propuesta}`)}</p>
                  )}
                  {p.expediente_accion && (
                    <p>
                      <b>{t("actas.field.expediente_accion")}:</b> {t(`actas.expediente_accion.${p.expediente_accion}`)}
                      {p.expediente_id != null ? ` · #${p.expediente_id}` : ""}
                    </p>
                  )}
                  {acciones && acciones.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <b>{t("acciones.titulo")}:</b>
                      <div>
                        {acciones.map((a) => (
                          <div key={a.id} className="accion-row">
                            <div><b>[{t(`acciones.estado.${a.estado}`)}]</b> {a.descripcion}</div>
                            <div style={{ color: "#555", fontSize: 13 }}>
                              {t("acciones.responsable_colon")}{" "}
                              {a.responsable_nombre?.trim() ||
                                a.responsable_username ||
                                t("acciones.sin_responsable")}
                              {a.plazo ? ` · ${t("acciones.plazo_colon")} ${String(a.plazo).slice(0, 10)}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.notas && <p style={{ color: "#666", fontStyle: "italic" }} className="pre">{p.notas}</p>}
                </li>
              );
            })}
          </ol>
        )}

        <div className="footer">
          {t("actas.print.footer")}
          {acta.firmada_en ? ` — ${t("actas.print.firmada_en")}: ${String(acta.firmada_en).slice(0, 10)}` : ""}
        </div>
      </div>
    </div>
  );
}
