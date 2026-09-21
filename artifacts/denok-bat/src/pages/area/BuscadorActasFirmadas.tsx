import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { FileText, Search, X, Download, ExternalLink } from "lucide-react";

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
  // Posibles temas tratados, según los devuelva el endpoint.
  temas?: string[] | null;
  puntos?: string[] | null;
};

const MESES = [
  "01", "02", "03", "04", "05", "06",
  "07", "08", "09", "10", "11", "12",
];

function resolveMediaUrl(url?: string | null) {
  const value = String(url ?? "");
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
  return `${API_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
}

export default function BuscadorActasFirmadas() {
  const token = useStore((s) => s.token);
  const { t, lang } = useTranslation();

  const [anio, setAnio] = useState("");
  const [mes, setMes] = useState("");
  const [texto, setTexto] = useState("");
  // Filtros aplicados (los que realmente disparan la petición).
  const [filtrosAplicados, setFiltrosAplicados] = useState({ anio: "", mes: "", q: "" });

  const [items, setItems] = useState<ActaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const mesLabel = (m: string) =>
    new Date(2026, parseInt(m, 10) - 1, 1).toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", {
      month: "long",
    });

  // Años disponibles calculados a partir del listado completo (sin filtro).
  const [anios, setAnios] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    const loadAnios = async () => {
      if (!token) return;
      try {
        const r = await fetch(`${API_BASE}/api/actas-firmadas`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (!r.ok || !active) return;
        const list = (d.items as ActaResumen[]) ?? [];
        const set = new Set<string>();
        for (const a of list) {
          const key = a.pdf_anyo_mes ? a.pdf_anyo_mes.slice(0, 4) : (a.fecha ? a.fecha.slice(0, 4) : "");
          if (key) set.add(key);
        }
        setAnios(Array.from(set).sort((a, b) => b.localeCompare(a)));
      } catch {
        // ignorar
      }
    };
    void loadAnios();
    return () => {
      active = false;
    };
  }, [token]);

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtrosAplicados.anio) params.set("anio", filtrosAplicados.anio);
      if (filtrosAplicados.anio && filtrosAplicados.mes) params.set("anyo_mes", `${filtrosAplicados.anio}-${filtrosAplicados.mes}`);
      if (filtrosAplicados.q) params.set("q", filtrosAplicados.q);
      const qs = params.toString();
      const r = await fetch(`${API_BASE}/api/actas-firmadas${qs ? `?${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setItems((d.items as ActaResumen[]) ?? []);
      else setItems([]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, filtrosAplicados]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // Al cambiar los resultados, si la selección ya no está presente, se limpia.
  useEffect(() => {
    if (selectedId != null && !items.some((a) => a.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  const seleccionada = useMemo(
    () => items.find((a) => a.id === selectedId) ?? null,
    [items, selectedId],
  );

  const aplicar = () => {
    setFiltrosAplicados({ anio, mes, q: texto.trim() });
  };
  const limpiar = () => {
    setAnio("");
    setMes("");
    setTexto("");
    setFiltrosAplicados({ anio: "", mes: "", q: "" });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Search className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("actas.firmadas.buscador_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("actas.firmadas.buscador_intro")}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">
              {t("actas.firmadas.filtro_anio")}
            </label>
            <select
              value={anio}
              onChange={(e) => { setAnio(e.target.value); if (!e.target.value) setMes(""); }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">{t("actas.firmadas.filtro_anio")}</option>
              {anios.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">
              {t("actas.firmadas.filtro_mes")}
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              disabled={!anio}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm disabled:opacity-50"
            >
              <option value="">{t("actas.firmadas.filtro_mes")}</option>
              {MESES.map((m) => (
                <option key={m} value={m}>{mesLabel(m)}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">
              {t("actas.firmadas.filtro_tema")}
            </label>
            <div className="flex gap-2">
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") aplicar(); }}
                placeholder={t("actas.firmadas.filtro_tema")}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
              <Button className="gap-1.5" onClick={aplicar}>
                <Search className="w-4 h-4" />
                {t("actas.firmadas.buscar")}
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={limpiar}>
                <X className="w-4 h-4" />
                {t("actas.firmadas.limpiar")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Índice de resultados */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{t("actas.firmadas.resultados")}</h3>
            <span className="text-xs text-muted-foreground">
              {t("actas.firmadas.num_resultados").replace("{n}", String(items.length))}
            </span>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("actas.firmadas.sin_resultados")}</p>
          ) : (
            <ul className="divide-y divide-border max-h-[520px] overflow-y-auto">
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full text-left px-3 py-3 transition-colors ${
                      selectedId === a.id ? "bg-primary/5" : "hover:bg-muted/30"
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
                    {((a.temas && a.temas.length > 0) || (a.puntos && a.puntos.length > 0)) && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {t("actas.firmadas.temas")}: {(a.temas ?? a.puntos ?? []).slice(0, 4).join(" · ")}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Visor de PDF */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 min-h-[320px] flex flex-col">
          {!seleccionada ? (
            <p className="text-sm text-muted-foreground m-auto">{t("actas.firmadas.selecciona")}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {seleccionada.numero != null ? `#${seleccionada.numero} · ` : ""}
                    {seleccionada.titulo}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {seleccionada.pdf_anyo_mes ? `${seleccionada.pdf_anyo_mes} · ` : seleccionada.fecha ? `${seleccionada.fecha} · ` : ""}
                    {seleccionada.conv_titulo ?? ""}
                  </p>
                </div>
                {seleccionada.pdf_url && (
                  <div className="flex gap-2">
                    <a href={resolveMediaUrl(seleccionada.pdf_url)} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ExternalLink className="w-4 h-4" />
                        {t("actas.firmadas.abrir_pestana")}
                      </Button>
                    </a>
                    <a href={resolveMediaUrl(seleccionada.pdf_url)} download={seleccionada.pdf_filename ?? undefined}>
                      <Button size="sm" className="gap-1.5">
                        <Download className="w-4 h-4" />
                        {t("actas.publico.descargar")}
                      </Button>
                    </a>
                  </div>
                )}
              </div>
              {seleccionada.pdf_url ? (
                <div className="flex-1 flex flex-col">
                  <iframe
                    key={seleccionada.id}
                    src={resolveMediaUrl(seleccionada.pdf_url)}
                    title={seleccionada.titulo}
                    className="w-full flex-1 min-h-[520px] rounded-lg border border-border"
                  />
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {t("actas.firmadas.pdf_no_disponible")}
                  </p>
                </div>
              ) : (
                <div className="m-auto text-center">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t("actas.firmadas.sin_pdf")}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
