import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { FileText, Download, Users, GitBranch } from "lucide-react";
import { Link } from "wouter";

type Tab = "presentacion" | "estatutos" | "organigrama" | "galeria";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type NosotrosMember = {
  id: number;
  nombre: string;
  cargo: string;
  cargoEu: string;
  descripcion: string;
  descripcionEu: string;
  foto: string;
};

type NosotrosData = {
  textos: {
    quienesSomosTitle: string;
    presentacionTitle: string;
    historiaEs: string;
    historiaEu: string;
  };
  hitos: Array<{ year: string; texto: string; textoEu: string; icon: string; imageUrl?: string }>;
  estatutos: {
    actuales: Array<{
      id: number;
      titulo: string;
      tituloEu: string | null;
      pdfUrl: string;
      vigenciaDesde: string;
      vigenciaHasta: string | null;
    }>;
    anteriores: Array<{
      id: number;
      titulo: string;
      tituloEu: string | null;
      pdfUrl: string;
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
    presentacionTitle: "Nuestra Historia",
    historiaEs:
      "Denok Bat nació en 1985 de la mano de un pequeño grupo de jubilados y jubiladas del País Vasco que creían en la convivencia y la solidaridad. En sus inicios contaban con unos 40 socios; hoy somos más de 1.200.",
    historiaEu:
      "Denok Bat 1985ean sortu zen, Euskal Herriko jubilatu eta erretiratu talde txiki baten eskutik, elkarrekintzan eta laguntasunean sinesten zutenak. Hasieran 40 kide inguru ziren; gaur egun, 1.200 bazkide baino gehiago ditugu.",
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
  const historia = lang === "eu" ? data.textos.historiaEu : data.textos.historiaEs;
  const bloques = historia.split(/\n{2,}/g).filter(Boolean);
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">{lang === "eu" ? "Gure Historia" : (data.textos.presentacionTitle || "Nuestra Historia")}</h2>
        <div className="prose prose-gray max-w-none space-y-4 text-muted-foreground leading-relaxed">
          {bloques.length > 0 ? bloques.map((b, i) => <p key={i}>{b}</p>) : <p>{historia}</p>}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-5">{lang === "eu" ? "Sortzaileak" : "Los Fundadores"}</h2>
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
  const all = [...data.estatutos.actuales, ...data.estatutos.anteriores];
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Estatutuak" : "Estatutos"}</h2>
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4 text-muted-foreground leading-relaxed">
        <p>
          {lang === "eu"
            ? "Denok Bat Elkartea Elkarte-lege espainiarraren arabera antolatutako irabazi-asmorik gabeko elkarte bat da. Estatutuek elkarteko antolaketa, kudeaketa eta funtzionamendu arauak ezartzen dituzte."
            : "La Asociación Denok Bat es una asociación sin ánimo de lucro constituida conforme a la ley española de asociaciones. Los estatutos establecen las normas de organización, gestión y funcionamiento de la asociación."}
        </p>
        <p>
          {lang === "eu"
            ? "Estatutuak 1985eko urtarrilaren 15ean onartu ziren eta azken aldaketa 2019ko ekainaren 10ean egin zen Batzar Nagusian."
            : "Los estatutos fueron aprobados el 15 de enero de 1985 y la última modificación se realizó el 10 de junio de 2019 en Asamblea General."}
        </p>
        <div className="bg-muted/30 rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground mb-2">{lang === "eu" ? "Estatutu indardunak" : "Estatutos vigentes"}</p>
          <ul className="text-sm space-y-2">
            {data.estatutos.actuales.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3">
                <span>{lang === "eu" ? (e.tituloEu || e.titulo) : e.titulo}</span>
                <a href={e.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">
                  <Download className="w-4 h-4" />
                  PDF
                </a>
              </li>
            ))}
            {data.estatutos.actuales.length === 0 && (
              <li className="text-muted-foreground">{lang === "eu" ? "Ez dago estatutu indardunik." : "No hay estatutos vigentes."}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">{lang === "eu" ? "Aurreko estatutuak" : "Estatutos anteriores"}</h3>
        <div className="space-y-2">
          {data.estatutos.anteriores.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">{lang === "eu" ? (e.tituloEu || e.titulo) : e.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {e.vigenciaDesde} {e.vigenciaHasta ? `→ ${e.vigenciaHasta}` : "→ actual"}
                </p>
              </div>
              <a href={e.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">
                <FileText className="w-4 h-4" />
                PDF
              </a>
            </div>
          ))}
          {data.estatutos.anteriores.length === 0 && (
            <p className="text-sm text-muted-foreground">{lang === "eu" ? "Ez dago aurreko estatuturik." : "No hay estatutos anteriores."}</p>
          )}
        </div>
      </div>

      {all.length > 0 && (
        <div className="flex gap-3">
          <a href={all[0].pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2"><Download className="w-4 h-4" />{lang === "eu" ? "Azken PDFa ireki" : "Abrir último PDF"}</Button>
          </a>
        </div>
      )}
      {all.length === 0 && (
        <div className="flex gap-3">
          <Button className="gap-2" disabled><Download className="w-4 h-4" />{lang === "eu" ? "Ez dago PDFarik" : "Sin PDFs cargados"}</Button>
        </div>
      )}
      <div className="hidden">
        <Button variant="outline" className="gap-2"><FileText className="w-4 h-4" />{lang === "eu" ? "Batzar Nagusiak" : "Actas Asambleas"}</Button>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">{lang === "eu" ? "Batzar Akten Indizea" : "Índice de actas de asamblea"}</h3>
        <div className="space-y-2">
          {data.actasAsamblea.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">{lang === "eu" ? (a.tituloEu || a.titulo) : a.titulo}</p>
                <p className="text-xs text-muted-foreground">{a.fechaActa}</p>
              </div>
              <div className="flex gap-2">
                <a href={a.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">Ver PDF</Button>
                </a>
                <a href={a.pdfUrl} download>
                  <Button size="sm">Descargar</Button>
                </a>
              </div>
            </div>
          ))}
          {data.actasAsamblea.length === 0 && (
            <p className="text-sm text-muted-foreground">{lang === "eu" ? "Ez dago aktarik." : "No hay actas registradas."}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OrganigramaTab({ lang, data }: { lang: string; data: NosotrosData }) {
  const [vista, setVista] = useState<"organigrama" | "directivos" | "delegados">("organigrama");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border pb-1">
        {(["organigrama", "directivos", "delegados"] as const).map(v => (
          <button key={v} onClick={() => setVista(v)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${vista === v ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {v === "organigrama" ? (lang === "eu" ? "Organigrama" : "Organigrama") : v === "directivos" ? (lang === "eu" ? "Zuzendaritza" : "Dirección") : (lang === "eu" ? "Ordezkari" : "Delegados")}
          </button>
        ))}
      </div>

      {vista === "organigrama" && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <div className="flex flex-col items-center gap-4">
            {/* Top */}
            <div className="bg-primary text-white rounded-2xl px-8 py-4 text-center font-bold">
              <GitBranch className="w-5 h-5 mx-auto mb-1" />
              {lang === "eu" ? "Batzar Nagusia" : "Asamblea General"}
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="bg-primary/10 border border-primary/20 rounded-2xl px-8 py-4 text-center font-bold text-primary">
              {lang === "eu" ? "Zuzendaritza Batzordea" : "Junta Directiva"}
            </div>
            <div className="w-full grid grid-cols-3 gap-4 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-border" />
              {["Presidencia", "Secretaría", "Tesorería"].map((area, i) => (
                <div key={i} className="pt-3">
                  <div className="w-px h-3 bg-border mx-auto" />
                  <div className="bg-white border border-border rounded-xl p-3 text-center text-sm font-semibold text-foreground">
                    {lang === "eu" ? ["Presidentzia", "Idazkaritza", "Diruzaintza"][i] : area}
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full grid grid-cols-2 gap-4">
              {[
                { es: "Vocales (Actividades y Eventos)", eu: "Bozeramaileak" },
                { es: "Delegados de Zona", eu: "Zona Ordezkari" },
              ].map((area, i) => (
                <div key={i} className="bg-muted/30 border border-border rounded-xl p-4 text-center">
                  <button onClick={() => setVista(i === 0 ? "directivos" : "delegados")}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center justify-center gap-1">
                    {lang === "eu" ? area.eu : area.es}
                    <span className="text-primary text-xs ml-1">→</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {vista === "directivos" && (
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4">{lang === "eu" ? "Zuzendaritza Batzordea" : "Junta Directiva"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.organigrama.directivos.map((d, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  {d.foto ? (
                    <img src={d.foto} alt={d.nombre} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-primary">{d.nombre?.[0] ?? "?"}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{d.nombre}</h4>
                  {(lang === "eu" ? d.descripcionEu : d.descripcion) && (
                    <p className="text-xs text-muted-foreground mt-1">{lang === "eu" ? d.descripcionEu : d.descripcion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {vista === "delegados" && (
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4">{lang === "eu" ? "Zona Ordezkari" : "Delegados de Zona"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.organigrama.delegados.map((d, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
                <div className="w-14 h-14 bg-secondary/10 rounded-full flex items-center justify-center shrink-0">
                  {d.foto ? (
                    <img src={d.foto} alt={d.nombre} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-secondary">{d.nombre?.[0] ?? "?"}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{d.nombre}</h4>
                  {(lang === "eu" ? d.descripcionEu : d.descripcion) && (
                    <p className="text-xs text-muted-foreground mt-1">{lang === "eu" ? d.descripcionEu : d.descripcion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GaleriaTab({ lang }: { lang: string }) {
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
        const sorted = mapped.sort((a, b) => {
          const aTs = Date.parse(a.fecha || "1970-01-01");
          const bTs = Date.parse(b.fecha || "1970-01-01");
          return bTs - aTs || b.id - a.id;
        });
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
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Argazki Galeria" : "Galería de Fotos"}</h2>
        <Link href="/divulgacion?tab=galeria">
          <Button variant="outline" size="sm">
            {lang === "eu" ? "Galeria osoa ikusi" : "Ver galería completa"}
          </Button>
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">{lang === "eu" ? "Galeria osoa Dibulgazioa atalean dago." : "La galería completa está disponible en la sección de Divulgación."}</p>
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
                    {new Date(cover.fecha || "1970-01-01").toLocaleDateString("es-ES", { month: "short", year: "numeric" })} · {lang === "eu" ? (cover.tema === "Evento" ? "Ekitaldia" : "Jarduera") : cover.tema} · {albumItems.length} {lang === "eu" ? "argazki" : "fotos"}
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

export default function QuienesSomos() {
  const { lang } = useTranslation();
  const [tab, setTab] = useState<Tab>("presentacion");
  const [data, setData] = useState<NosotrosData>(DEFAULT_DATA);

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
            presentacionTitle: String(payload?.textos?.presentacionTitle ?? DEFAULT_DATA.textos.presentacionTitle),
            historiaEs: String(payload?.textos?.historiaEs ?? DEFAULT_DATA.textos.historiaEs),
            historiaEu: String(payload?.textos?.historiaEu ?? DEFAULT_DATA.textos.historiaEu),
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

  const TABS: { key: Tab; label: string; labelEu: string; icon: ReactNode }[] = [
    { key: "presentacion", label: "Presentación", labelEu: "Aurkezpena", icon: <Users className="w-4 h-4" /> },
    { key: "estatutos", label: "Estatutos", labelEu: "Estatutuak", icon: <FileText className="w-4 h-4" /> },
    { key: "organigrama", label: "Organigrama", labelEu: "Organigrama", icon: <GitBranch className="w-4 h-4" /> },
    { key: "galeria", label: "Galería", labelEu: "Galeria", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-linear-to-b from-primary/5 to-background py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-foreground mb-3">
            {lang === "eu" ? "Nor Gara" : (data.textos.quienesSomosTitle || "Quiénes Somos")}
          </h1>
          <p className="text-xl text-muted-foreground">
            {lang === "eu"
              ? "1985etik zure ondoan — Aurkezpena, estatutuak, organigrama eta galeria"
              : "Desde 1985 a tu lado — Presentación, estatutos, organigrama y galería"}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-1 mb-8 overflow-x-auto pb-1 border-b border-border">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.icon}
              {lang === "eu" ? t.labelEu : t.label}
            </button>
          ))}
        </div>

        {tab === "presentacion" && <PresentacionTab lang={lang} data={data} />}
        {tab === "estatutos" && <EstatutosTab lang={lang} data={data} />}
        {tab === "organigrama" && <OrganigramaTab lang={lang} data={data} />}
        {tab === "galeria" && <GaleriaTab lang={lang} />}
      </div>
    </div>
  );
}
