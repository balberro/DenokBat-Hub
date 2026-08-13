import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { FileText, Download, Users, GitBranch, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { useStore, getUserRoles } from "@/store/use-store";

type Tab = "presentacion" | "estatutos" | "organigrama" | "galeria" | "actas";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type NosotrosMember = {
  id: number;
  nombre: string;
  cargo: string;
  cargoEu: string;
  cargoCodigo: string;
  descripcion: string;
  descripcionEu: string;
  foto: string;
};

type NosotrosData = {
  textos: {
    quienesSomosTitle: string;
    quienesSomosTitleEu: string;
    quienesSomosSubtitle: string;
    quienesSomosSubtitleEu: string;
    presentacionTitle: string;
    historiaEs: string;
    historiaEu: string;
    estatutosIntroEs: string;
    estatutosIntroEu: string;
  };
  hitos: Array<{ year: string; texto: string; textoEu: string; icon: string; imageUrl?: string }>;
  estatutos: {
    actuales: Array<{
      id: number;
      titulo: string;
      tituloEu: string | null;
      pdfUrl: string;
      pdfUrlEu: string | null;
      vigenciaDesde: string;
      vigenciaHasta: string | null;
    }>;
    anteriores: Array<{
      id: number;
      titulo: string;
      tituloEu: string | null;
      pdfUrl: string;
      pdfUrlEu: string | null;
      vigenciaDesde: string;
      vigenciaHasta: string | null;
    }>;
  };
  actasAsamblea: Array<{
    id: number;
    titulo: string;
    tituloEu: string | null;
    pdfUrl: string;
    fechaActa: string;
  }>;
  organigrama: {
    fundadores: NosotrosMember[];
    directivos: NosotrosMember[];
    delegados: NosotrosMember[];
  };
};

const DEFAULT_DATA: NosotrosData = {
  textos: {
    quienesSomosTitle: "Quiénes Somos",
    quienesSomosTitleEu: "Nor Gara",
    quienesSomosSubtitle: "Desde 1985 a tu lado — Presentación, estatutos, organigrama y galería",
    quienesSomosSubtitleEu: "1985etik zure ondoan — Aurkezpena, estatutuak, organigrama eta galeria",
    presentacionTitle: "Nuestra Historia",
    historiaEs:
      "Denok Bat nació en 1985 de la mano de un pequeño grupo de jubilados y jubiladas del País Vasco que creían en la convivencia y la solidaridad. En sus inicios contaban con unos 40 socios; hoy somos más de 1.200.",
    historiaEu:
      "Denok Bat 1985ean sortu zen, Euskal Herriko jubilatu eta erretiratu talde txiki baten eskutik, elkarrekintzan eta laguntasunean sinesten zutenak. Hasieran 40 kide inguru ziren; gaur egun, 1.200 bazkide baino gehiago ditugu.",
    estatutosIntroEs:
      "La Asociación Denok Bat es una asociación sin ánimo de lucro constituida conforme a la ley española de asociaciones. Los estatutos establecen las normas de organización, gestión y funcionamiento de la asociación.\n\nLos estatutos fueron aprobados el 15 de enero de 1985 y la última modificación se realizó el 10 de junio de 2019 en Asamblea General.",
    estatutosIntroEu:
      "Denok Bat Elkartea Elkarte-lege espainiarraren arabera antolatutako irabazi-asmorik gabeko elkarte bat da. Estatutuek elkarteko antolaketa, kudeaketa eta funtzionamendu arauak ezartzen dituzte.\n\nEstatutuak 1985eko urtarrilaren 15ean onartu ziren eta azken aldaketa 2019ko ekainaren 10ean egin zen Batzar Nagusian.",
  },
  hitos: [
    { year: "1985", texto: "Fundación", textoEu: "Sorrera", icon: "🌱" },
    { year: "1992", texto: "Primera sede", textoEu: "Lehen egoitza", icon: "🏠" },
    { year: "2005", texto: "500 socios", textoEu: "500 bazkide", icon: "🎉" },
    { year: "2026", texto: "+1.200 socios", textoEu: "+1.200 bazkide", icon: "⭐" },
  ],
  estatutos: {
    actuales: [],
    anteriores: [],
  },
  actasAsamblea: [],
  organigrama: {
    fundadores: [],
    directivos: [],
    delegados: [],
  },
};

const GALERIA_ITEMS = [
  { id: 1, titulo: "Excursión a Bilbao", tituloEu: "Bilbaoko Txangoa", fecha: "2026-03-08", tema: "Evento", emoji: "🏛️" },
  { id: 2, titulo: "Fiesta de Carnavales", tituloEu: "Inauterietako Jaia", fecha: "2026-02-14", tema: "Evento", emoji: "🎭" },
  { id: 3, titulo: "Clase de Yoga - Enero", tituloEu: "Yoga Klasea", fecha: "2026-01-15", tema: "Actividad", emoji: "🧘" },
  { id: 4, titulo: "Torneo de Mus", tituloEu: "Mus Txapelketa", fecha: "2026-02-05", tema: "Actividad", emoji: "🃏" },
  { id: 5, titulo: "Almuerzo de Navidad", tituloEu: "Gabonetako Bazkaria", fecha: "2025-12-20", tema: "Evento", emoji: "🎄" },
  { id: 6, titulo: "Senderismo Otoño", tituloEu: "Udazkeneko Mendi-ibilaldia", fecha: "2025-10-12", tema: "Actividad", emoji: "🏔️" },
];

function resolveMediaUrl(url?: string | null) {
  const value = String(url ?? "");
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
  return `${API_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
}

function PresentacionTab({ lang, data }: { lang: string; data: NosotrosData }) {
  const { t } = useTranslation();
  const historia = lang === "eu" ? data.textos.historiaEu : data.textos.historiaEs;
  const bloques = historia.split(/\n{2,}/g).filter(Boolean);
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">{lang === "eu" ? t("nosotros.presentacion_historia") : (data.textos.presentacionTitle || t("nosotros.presentacion_historia"))}</h2>
        <div className="prose prose-gray max-w-none space-y-4 text-muted-foreground leading-relaxed">
          {bloques.length > 0 ? bloques.map((b, i) => <p key={i}>{b}</p>) : <p>{historia}</p>}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-5">{t("nosotros.fundadores")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.organigrama.fundadores.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-5 flex items-start gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                {f.foto ? (
                  <img src={f.foto} alt={f.nombre} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-primary">{f.nombre?.[0] ?? "?"}</span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{f.nombre}</h3>
                <p className="text-xs text-muted-foreground mt-1">{lang === "eu" ? f.descripcionEu : f.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.hitos.map((h, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5 text-center">
            {h.imageUrl ? (
              <img src={h.imageUrl} alt={h.texto || h.year} className="w-12 h-12 object-cover rounded-lg mx-auto" />
            ) : (
              <span className="text-3xl">{h.icon || "⭐"}</span>
            )}
            <p className="text-2xl font-extrabold text-primary mt-2">{h.year}</p>
            <p className="text-sm text-muted-foreground mt-1">{lang === "eu" ? (h.textoEu || h.texto) : h.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstatutosTab({ lang, data }: { lang: string; data: NosotrosData }) {
  const { t } = useTranslation();
  const introEs =
    data.textos.estatutosIntroEs ||
    "La Asociación Denok Bat es una asociación sin ánimo de lucro constituida conforme a la ley española de asociaciones. Los estatutos establecen las normas de organización, gestión y funcionamiento de la asociación.\n\nLos estatutos fueron aprobados el 15 de enero de 1985 y la última modificación se realizó el 10 de junio de 2019 en Asamblea General.";
  const introEu =
    data.textos.estatutosIntroEu ||
    "Denok Bat Elkartea Elkarte-lege espainiarraren arabera antolatutako irabazi-asmorik gabeko elkarte bat da. Estatutuek elkarteko antolaketa, kudeaketa eta funtzionamendu arauak ezartzen dituzte.\n\nEstatutuak 1985eko urtarrilaren 15ean onartu ziren eta azken aldaketa 2019ko ekainaren 10ean egin zen Batzar Nagusian.";
  const intro = lang === "eu" ? introEu : introEs;
  const bloquesIntro = intro.split(/\n{2,}/g).filter(Boolean);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">{t("nosotros.tab.estatutos")}</h2>
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4 text-muted-foreground leading-relaxed">
        {bloquesIntro.length > 0 ? bloquesIntro.map((b, i) => <p key={i}>{b}</p>) : <p>{intro}</p>}
        <div className="bg-muted/30 rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground mb-2">{t("nosotros.estatutos_vigentes")}</p>
          <ul className="text-sm space-y-2">
            {data.estatutos.actuales.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3">
                <span>{lang === "eu" ? (e.tituloEu || e.titulo) : e.titulo}</span>
                <a href={lang === "eu" ? (e.pdfUrlEu || e.pdfUrl) : e.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">
                  <Download className="w-4 h-4" />
                  PDF
                </a>
              </li>
            ))}
            {data.estatutos.actuales.length === 0 && (
              <li className="text-muted-foreground">{t("nosotros.sin_estatutos_vigentes")}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">{t("nosotros.estatutos_anteriores")}</h3>
        <div className="space-y-2">
          {data.estatutos.anteriores.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">{lang === "eu" ? (e.tituloEu || e.titulo) : e.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {e.vigenciaDesde} {e.vigenciaHasta ? `→ ${e.vigenciaHasta}` : "→ actual"}
                </p>
              </div>
              <a href={lang === "eu" ? (e.pdfUrlEu || e.pdfUrl) : e.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">
                <FileText className="w-4 h-4" />
                PDF
              </a>
            </div>
          ))}
          {data.estatutos.anteriores.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("nosotros.sin_estatutos_anteriores")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

const MESES = [
  { n: "01", es: "Enero", eu: "Urtarrila" },
  { n: "02", es: "Febrero", eu: "Otsaila" },
  { n: "03", es: "Marzo", eu: "Martxoa" },
  { n: "04", es: "Abril", eu: "Apirila" },
  { n: "05", es: "Mayo", eu: "Maiatza" },
  { n: "06", es: "Junio", eu: "Ekaina" },
  { n: "07", es: "Julio", eu: "Uztaila" },
  { n: "08", es: "Agosto", eu: "Abuztua" },
  { n: "09", es: "Septiembre", eu: "Iraila" },
  { n: "10", es: "Octubre", eu: "Urria" },
  { n: "11", es: "Noviembre", eu: "Azaroa" },
  { n: "12", es: "Diciembre", eu: "Abendua" },
];

function ActasTab({ lang, data }: { lang: string; data: NosotrosData }) {
  const { t } = useTranslation();
  const actas = data.actasAsamblea; // ya ordenadas desc por fecha desde el backend
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");

  const anios = Array.from(new Set(actas.map((a) => (a.fechaActa || "").slice(0, 4)).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const hayFiltro = Boolean(filtroAnio || filtroMes);
  const filtradas = actas.filter((a) => {
    const f = a.fechaActa || "";
    if (filtroAnio && f.slice(0, 4) !== filtroAnio) return false;
    if (filtroMes && f.slice(0, 7) !== `${filtroAnio}-${filtroMes}`) return false;
    return true;
  });
  const visibles = hayFiltro ? filtradas : filtradas.slice(0, 12);
  const mostrarNota = !hayFiltro && actas.length > 12;

  return (
    <div className="space-y-6">
      {actas.length > 0 && (
        <div className="flex gap-3">
          <a href={actas[0].pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2"><Download className="w-4 h-4" />{t("actas.publico.abrir_ultimo")}</Button>
          </a>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-semibold text-foreground">{t("actas.publico.indice")}</h3>
          {actas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroAnio}
                onChange={(e) => { setFiltroAnio(e.target.value); setFiltroMes(""); }}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                <option value="">{t("actas.publico.filtro_anio")}</option>
                {anios.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                disabled={!filtroAnio}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm disabled:opacity-50"
              >
                <option value="">{t("actas.publico.filtro_mes")}</option>
                {MESES.map((m) => <option key={m.n} value={m.n}>{lang === "eu" ? m.eu : m.es}</option>)}
              </select>
              {hayFiltro && (
                <button onClick={() => { setFiltroAnio(""); setFiltroMes(""); }} className="text-sm text-primary hover:underline">
                  {t("actas.publico.limpiar_filtros")}
                </button>
              )}
            </div>
          )}
        </div>
        {mostrarNota && (
          <p className="text-xs text-muted-foreground mb-3">
            {t("actas.publico.nota_12")}
          </p>
        )}
        <div className="space-y-2">
          {visibles.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">{lang === "eu" ? (a.tituloEu || a.titulo) : a.titulo}</p>
                <p className="text-xs text-muted-foreground">{a.fechaActa}</p>
              </div>
              <div className="flex gap-2">
                <a href={a.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">{t("actas.publico.ver_pdf")}</Button>
                </a>
                <a href={a.pdfUrl} download>
                  <Button size="sm">{t("actas.publico.descargar")}</Button>
                </a>
              </div>
            </div>
          ))}
          {visibles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {hayFiltro
                ? t("actas.publico.sin_resultados")
                : t("actas.publico.vacio")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function OrganigramaTab({ lang, data }: { lang: string; data: NosotrosData }) {
  const { t } = useTranslation();
  const [vista, setVista] = useState<"organigrama" | "directivos" | "presidencia" | "secretaria" | "tesoreria" | "vocales" | "delegados">("organigrama");

  const directivos = data.organigrama.directivos;
  const esCargo = (m: NosotrosMember, codigos: string[]) => {
    const code = String(m.cargoCodigo ?? "").toLowerCase().trim();
    return codigos.includes(code);
  };
  const presidencia = directivos.filter((m) => esCargo(m, ["presidencia", "vicepresidencia"]));
  const secretaria = directivos.filter((m) => esCargo(m, ["secretaria"]));
  const tesoreria = directivos.filter((m) => esCargo(m, ["tesoreria"]));
  const vocales = directivos.filter((m) => esCargo(m, ["vocal"]));

  const TITULOS_KEYS: Record<"directivos" | "presidencia" | "secretaria" | "tesoreria" | "vocales" | "delegados", string> = {
    directivos: "organigrama.junta_directiva",
    presidencia: "organigrama.presidencia",
    secretaria: "organigrama.secretaria",
    tesoreria: "organigrama.tesoreria",
    vocales: "organigrama.vocales",
    delegados: "organigrama.delegados_zona",
  };

  const renderCards = (miembros: NosotrosMember[], accent: "primary" | "secondary") => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {miembros.map((d, i) => (
        <div key={i} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className={`w-14 h-14 ${accent === "primary" ? "bg-primary/10" : "bg-secondary/10"} rounded-full flex items-center justify-center shrink-0`}>
            {d.foto ? (
              <img src={d.foto} alt={d.nombre} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <span className={`text-xl font-bold ${accent === "primary" ? "text-primary" : "text-secondary"}`}>{d.nombre?.[0] ?? "?"}</span>
            )}
          </div>
          <div>
            <h4 className="font-bold text-foreground">{d.nombre}</h4>
            {(lang === "eu" ? d.cargoEu : d.cargo) && (
              <p className="text-xs font-semibold text-primary mt-0.5">{lang === "eu" ? d.cargoEu : d.cargo}</p>
            )}
            {(lang === "eu" ? d.descripcionEu : d.descripcion) && (
              <p className="text-xs text-muted-foreground mt-1">{lang === "eu" ? d.descripcionEu : d.descripcion}</p>
            )}
          </div>
        </div>
      ))}
      {miembros.length === 0 && (
        <p className="text-sm text-muted-foreground col-span-full">{t("organigrama.no_miembros")}</p>
      )}
    </div>
  );

  const renderVista = (key: "directivos" | "presidencia" | "secretaria" | "tesoreria" | "vocales" | "delegados") => {
    const miembros =
      key === "directivos" ? directivos
      : key === "presidencia" ? presidencia
      : key === "secretaria" ? secretaria
      : key === "tesoreria" ? tesoreria
      : key === "vocales" ? vocales
      : data.organigrama.delegados;
    const accent: "primary" | "secondary" = key === "delegados" ? "secondary" : "primary";
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setVista("organigrama")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← {t("organigrama.volver")}
          </button>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-4">{t(TITULOS_KEYS[key])}</h3>
        {renderCards(miembros, accent)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border pb-1">
        {(["organigrama", "directivos", "delegados"] as const).map(v => (
          <button key={v} onClick={() => setVista(v)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${vista === v ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {v === "organigrama" ? t("organigrama.titulo") : v === "directivos" ? t("organigrama.direccion") : t("organigrama.delegados")}
          </button>
        ))}
      </div>

      {vista === "organigrama" && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <div className="flex flex-col items-center gap-4">
            {/* Top */}
            <div className="bg-primary text-white rounded-2xl px-8 py-4 text-center font-bold">
              <GitBranch className="w-5 h-5 mx-auto mb-1" />
              {t("organigrama.asamblea_general")}
            </div>
            <div className="w-px h-6 bg-border" />
            <button onClick={() => setVista("directivos")}
              className="bg-primary/10 border border-primary/20 rounded-2xl px-8 py-4 text-center font-bold text-primary hover:bg-primary/20 transition-colors">
              {t("organigrama.junta_directiva")}
            </button>
            <div className="w-full grid grid-cols-3 gap-4 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-border" />
              {[
                { key: "presidencia" as const, labelKey: "organigrama.presidencia" },
                { key: "secretaria" as const, labelKey: "organigrama.secretaria" },
                { key: "tesoreria" as const, labelKey: "organigrama.tesoreria" },
              ].map((area) => (
                <div key={area.key} className="pt-3">
                  <div className="w-px h-3 bg-border mx-auto" />
                  <button onClick={() => setVista(area.key)}
                    className="w-full bg-white border border-border rounded-xl p-3 text-center text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors">
                    {t(area.labelKey)}
                  </button>
                </div>
              ))}
            </div>
            <div className="w-full grid grid-cols-2 gap-4">
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-center">
                <button onClick={() => setVista("vocales")}
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center justify-center gap-1">
                  {t("organigrama.vocales")}
                  <span className="text-primary text-xs ml-1">→</span>
                </button>
              </div>
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-center">
                <button onClick={() => setVista("delegados")}
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center justify-center gap-1">
                  {t("organigrama.delegados_zona")}
                  <span className="text-primary text-xs ml-1">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {vista === "directivos" && renderVista("directivos")}
      {vista === "presidencia" && renderVista("presidencia")}
      {vista === "secretaria" && renderVista("secretaria")}
      {vista === "tesoreria" && renderVista("tesoreria")}
      {vista === "vocales" && renderVista("vocales")}
      {vista === "delegados" && renderVista("delegados")}
    </div>
  );
}

function GaleriaTab({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Array<{ id: number; titulo: string; tituloEu: string; fecha: string; tema: "Evento" | "Actividad"; mediaUrl?: string | null }>>(
    GALERIA_ITEMS.map((g) => ({ ...g, tema: (g.tema === "Actividad" ? "Actividad" : "Evento") as "Evento" | "Actividad", mediaUrl: null })),
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/galeria`);
        if (!r.ok) return;
        const d = await r.json();
        if (!active) return;
        const incoming = Array.isArray(d?.items) ? d.items : [];
        const mapped = incoming.map((g: any) => ({
          id: Number(g.id ?? 0),
          titulo: String(g.titulo ?? ""),
          tituloEu: String(g.tituloEu ?? g.titulo ?? ""),
          fecha: String(g.fecha ?? ""),
          tema: (g.tema === "Actividad" ? "Actividad" : "Evento") as "Evento" | "Actividad",
          mediaUrl: g.mediaUrl ? String(g.mediaUrl) : null,
        }));
        const sorted = mapped.sort(
          (a: { id: number; fecha: string }, b: { id: number; fecha: string }) => {
            const aTs = Date.parse(a.fecha || "1970-01-01");
            const bTs = Date.parse(b.fecha || "1970-01-01");
            return bTs - aTs || b.id - a.id;
          },
        );
        setItems(sorted);
      } catch {
        // fallback static
      }
    };
    load();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{t("galeria.titulo")}</h2>
        <Link href="/divulgacion?tab=galeria">
          <Button variant="outline" size="sm">
            {t("galeria.ver_completa")}
          </Button>
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">{t("galeria.aviso_divulgacion")}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {(() => {
          const albumMap = new Map<string, typeof items>();
          for (const item of items) {
            const key = `${item.tema}__${item.fecha}__${item.titulo}`;
            const bucket = albumMap.get(key) ?? [];
            bucket.push(item);
            albumMap.set(key, bucket);
          }
          const albums = Array.from(albumMap.entries())
            .map(([key, list]) => ({ key, cover: list[0], items: list }))
            .slice(0, 12);

          return albums.map(({ key, cover, items: albumItems }) => (
            <Link key={key} href="/divulgacion?tab=galeria" className="block">
              <div className="text-left bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all cursor-pointer group">
                <div className="h-32 bg-linear-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                  {cover.mediaUrl ? (
                    <img src={resolveMediaUrl(cover.mediaUrl)} alt={lang === "eu" ? cover.tituloEu : cover.titulo} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                  ) : (
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300">📷</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-foreground line-clamp-1">{lang === "eu" ? cover.tituloEu : cover.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(cover.fecha || "1970-01-01").toLocaleDateString("es-ES", { month: "short", year: "numeric" })} · {t(cover.tema === "Evento" ? "galeria.evento" : "galeria.actividad")} · {albumItems.length} {t("galeria.fotos")}
                  </p>
                </div>
              </div>
            </Link>
          ));
        })()}
      </div>
    </div>
  );
}

const ACTAS_TAB_ROLES = new Set(["socio", "delegado", "directivo", "contable", "administrador"]);

export default function QuienesSomos() {
  const { lang, t } = useTranslation();
  const [tab, setTab] = useState<Tab>("presentacion");
  const [data, setData] = useState<NosotrosData>(DEFAULT_DATA);
  const user = useStore((s) => s.user);
  const roles = user ? getUserRoles(user) : [];
  const verActas = roles.some((r) => ACTAS_TAB_ROLES.has(r));

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/nosotros/public`);
        if (!r.ok) return;
        const payload = await r.json();
        if (!active) return;
        setData({
          textos: {
            quienesSomosTitle: String(payload?.textos?.quienesSomosTitle ?? DEFAULT_DATA.textos.quienesSomosTitle),
            quienesSomosTitleEu: String(payload?.textos?.quienesSomosTitleEu ?? DEFAULT_DATA.textos.quienesSomosTitleEu),
            quienesSomosSubtitle: String(payload?.textos?.quienesSomosSubtitle ?? DEFAULT_DATA.textos.quienesSomosSubtitle),
            quienesSomosSubtitleEu: String(payload?.textos?.quienesSomosSubtitleEu ?? DEFAULT_DATA.textos.quienesSomosSubtitleEu),
            presentacionTitle: String(payload?.textos?.presentacionTitle ?? DEFAULT_DATA.textos.presentacionTitle),
            historiaEs: String(payload?.textos?.historiaEs ?? DEFAULT_DATA.textos.historiaEs),
            historiaEu: String(payload?.textos?.historiaEu ?? DEFAULT_DATA.textos.historiaEu),
            estatutosIntroEs: String(payload?.textos?.estatutosIntroEs ?? DEFAULT_DATA.textos.estatutosIntroEs),
            estatutosIntroEu: String(payload?.textos?.estatutosIntroEu ?? DEFAULT_DATA.textos.estatutosIntroEu),
          },
          hitos: Array.isArray(payload?.hitos) && payload.hitos.length > 0 ? payload.hitos : DEFAULT_DATA.hitos,
          estatutos: {
            actuales: Array.isArray(payload?.estatutos?.actuales) ? payload.estatutos.actuales : [],
            anteriores: Array.isArray(payload?.estatutos?.anteriores) ? payload.estatutos.anteriores : [],
          },
          actasAsamblea: Array.isArray(payload?.actasAsamblea) ? payload.actasAsamblea : [],
          organigrama: {
            fundadores: Array.isArray(payload?.organigrama?.fundadores) ? payload.organigrama.fundadores : [],
            directivos: Array.isArray(payload?.organigrama?.directivos) ? payload.organigrama.directivos : [],
            delegados: Array.isArray(payload?.organigrama?.delegados) ? payload.organigrama.delegados : [],
          },
        });
      } catch {
        // fallback con datos por defecto
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: "presentacion", label: "nosotros.tab.presentacion", icon: <Users className="w-4 h-4" /> },
    { key: "estatutos", label: "nosotros.tab.estatutos", icon: <FileText className="w-4 h-4" /> },
    { key: "organigrama", label: "nosotros.tab.organigrama", icon: <GitBranch className="w-4 h-4" /> },
    { key: "galeria", label: "nosotros.tab.galeria", icon: <Users className="w-4 h-4" /> },
    ...(verActas
      ? ([
          { key: "actas", label: "nosotros.tab.actas", icon: <ClipboardList className="w-4 h-4" /> },
        ] as { key: Tab; label: string; icon: ReactNode }[])
      : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-linear-to-b from-primary/5 to-background py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-foreground mb-3">
            {lang === "eu" ? (data.textos.quienesSomosTitleEu || "Nor Gara") : (data.textos.quienesSomosTitle || "Quiénes Somos")}
          </h1>
          <p className="text-xl text-muted-foreground">
            {lang === "eu"
              ? (data.textos.quienesSomosSubtitleEu || "1985etik zure ondoan — Aurkezpena, estatutuak, organigrama eta galeria")
              : (data.textos.quienesSomosSubtitle || "Desde 1985 a tu lado — Presentación, estatutos, organigrama y galería")}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-1 mb-8 overflow-x-auto pb-1 border-b border-border">
          {TABS.map(tabBtn => (
            <button key={tabBtn.key} onClick={() => setTab(tabBtn.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px ${tab === tabBtn.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {tabBtn.icon}
              {t(tabBtn.label)}
            </button>
          ))}
        </div>

        {tab === "presentacion" && <PresentacionTab lang={lang} data={data} />}
        {tab === "estatutos" && <EstatutosTab lang={lang} data={data} />}
        {tab === "organigrama" && <OrganigramaTab lang={lang} data={data} />}
        {tab === "galeria" && <GaleriaTab lang={lang} />}
        {tab === "actas" && verActas && <ActasTab lang={lang} data={data} />}
      </div>
    </div>
  );
}
