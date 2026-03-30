import { useState, type ReactNode } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Download, Plus, Search, Calendar, FileText, Newspaper, BookOpen, ImageIcon, ChevronDown } from "lucide-react";
import { useStore, getUserRoles } from "@/store/use-store";

type Tab = "hoja" | "pulunpe" | "noticias" | "articulos" | "galeria";

const HOJAS = [
  { id: 1, titulo: "Hoja Informativa nº 47", tituloEu: "Informazio Orria 47", fecha: "2026-03-01", categoria: "General", contenido: "En este número: renovación de cuotas anuales, nuevas actividades para primavera, recordatorio del almuerzo de hermandad, próximas excursiones y noticias del equipo directivo.", contenidoEu: "Ale honetan: urteko kuoten berritze, udaberrirako jarduera berriak, anaiarteko bazkariaren gogorarazpena, datozen txangoak eta zuzendaritza taldearen berriak." },
  { id: 2, titulo: "Hoja Informativa nº 46", tituloEu: "Informazio Orria 46", fecha: "2026-02-01", categoria: "General", contenido: "Resumen de enero: inscripciones abiertas, actos Santa Águeda, resultados del torneo de mus.", contenidoEu: "Urtarrileko laburpena: izena ematea irekita, Santa Ageda ekintzak, mus txapelketaren emaitzak." },
  { id: 3, titulo: "Hoja Informativa nº 45", tituloEu: "Informazio Orria 45", fecha: "2026-01-01", categoria: "Especial", contenido: "Número especial de inicio de año con los objetivos de 2026 y el calendario completo de actividades.", contenidoEu: "Urte hasierako ale berezia 2026ko helburuekin eta jardueren egutegi osoarekin." },
];

const PULUNPES = [
  { id: 1, titulo: "Pulunpe Primavera 2026", tituloEu: "Pulunpe Udaberria 2026", fecha: "2026-03-15", descripcion: "Edición de primavera con reportaje sobre el torneo de mus y la excursión a Donostia.", anio: 2026, mes: 3 },
  { id: 2, titulo: "Pulunpe Invierno 2026", tituloEu: "Pulunpe Negua 2026", fecha: "2026-01-15", descripcion: "Repaso de las actividades navideñas y agenda del primer trimestre.", anio: 2026, mes: 1 },
  { id: 3, titulo: "Pulunpe Otoño 2025", tituloEu: "Pulunpe Udazkena 2025", fecha: "2025-10-15", descripcion: "Resumen del verano y programación de otoño.", anio: 2025, mes: 10 },
];

const NOTICIAS = [
  { id: 1, titulo: "Renovación de las instalaciones deportivas", tituloEu: "Kiroldegiko instalazioen berritzea", fecha: "2026-03-10", descripcion: "Las nuevas instalaciones deportivas estarán listas para el próximo trimestre.", descripcionEu: "Kirol instalazio berriak hurrengo hiruhilekoan prest egongo dira.", categoria: "Instalaciones" },
  { id: 2, titulo: "Acuerdo con farmacias del municipio", tituloEu: "Udaleko farmaziekin akordioa", fecha: "2026-02-20", descripcion: "Los socios obtendrán un 10% de descuento presentando su carnet.", descripcionEu: "Bazkideek %10 deskontua izango dute txartela aurkeztuz.", categoria: "Servicios" },
  { id: 3, titulo: "Éxito del torneo de mus 2026", tituloEu: "2026ko mus txapelketaren arrakasta", fecha: "2026-02-05", descripcion: "Más de 40 participantes en la primera ronda del torneo anual.", descripcionEu: "40 parte-hartzaile baino gehiago urteko txapelketaren lehen txandan.", categoria: "Actividades" },
  { id: 4, titulo: "Nueva web de la asociación", tituloEu: "Elkartearen web berria", fecha: "2026-01-15", descripcion: "Estrenamos la nueva página web bilingüe con acceso al área de socios.", descripcionEu: "Bazkideen eremurako sarbidea duen web elebidunen orri berria estreinatzen dugu.", categoria: "Digital" },
];

const ARTICULOS = [
  { id: 1, titulo: "El Camino de Santiago en bicicleta", tituloEu: "Donostia bidea bizikletaz", fecha: "2026-03-01", descripcion: "Artículo sobre la experiencia de un grupo de socios en el Camino del Norte.", descripcionEu: "Bazkide talde baten esperientziaren inguruko artikulua Ipar Bidean.", categoria: "Experiencias" },
  { id: 2, titulo: "Recetas tradicionales vascas", tituloEu: "Euskal sukaldaritza tradizionala", fecha: "2026-02-01", descripcion: "Nuestras socias comparten sus mejores recetas de siempre.", descripcionEu: "Gure bazkideek beren betiereko errezeta onenak partekatzen dituzte.", categoria: "Gastronomía" },
];

const GALERIA = [
  { id: 1, titulo: "Excursión a Bilbao", tituloEu: "Bilbaoko Txangoa", fecha: "2026-03-08", tema: "Evento", emoji: "🏛️" },
  { id: 2, titulo: "Fiesta de Carnavales", tituloEu: "Inauterietako Jaia", fecha: "2026-02-14", tema: "Evento", emoji: "🎭" },
  { id: 3, titulo: "Clase de Yoga - Enero", tituloEu: "Yoga Klasea - Urtarrila", fecha: "2026-01-15", tema: "Actividad", emoji: "🧘" },
  { id: 4, titulo: "Torneo de Mus", tituloEu: "Mus Txapelketa", fecha: "2026-02-05", tema: "Actividad", emoji: "🃏" },
  { id: 5, titulo: "Almuerzo de Navidad", tituloEu: "Gabonetako Bazkaria", fecha: "2025-12-20", tema: "Evento", emoji: "🎄" },
  { id: 6, titulo: "Senderismo Otoño", tituloEu: "Udazkeneko Mendi-ibilaldia", fecha: "2025-10-12", tema: "Actividad", emoji: "🏔️" },
];

function SearchBar({ value, onChange, lang }: { value: string; onChange: (v: string) => void; lang: string }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={lang === "eu" ? "Bilatu..." : "Buscar..."}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
    </div>
  );
}

function HojaTab({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const latest = HOJAS[0];
  const filtered = HOJAS.slice(1).filter(h => (lang === "eu" ? h.tituloEu : h.titulo).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Azken Informazio Orria" : "Última Hoja Informativa"}</h2>
        {canCreate && <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{lang === "eu" ? "Berria" : "Nueva"}</Button>}
      </div>
      <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">{latest.categoria}</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Calendar className="w-4 h-4" />{new Date(latest.fecha).toLocaleDateString("es-ES")}</span>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">{lang === "eu" ? latest.tituloEu : latest.titulo}</h3>
        <p className="text-muted-foreground leading-relaxed">{lang === "eu" ? latest.contenidoEu : latest.contenido}</p>
        <Button variant="outline" size="sm" className="mt-4 gap-2"><Download className="w-4 h-4" />{lang === "eu" ? "Deskargatu PDF" : "Descargar PDF"}</Button>
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground mb-3">{lang === "eu" ? "Aurreko aleak" : "Números anteriores"}</h3>
        <SearchBar value={search} onChange={setSearch} lang={lang} />
        <div className="mt-3 space-y-2">
          {filtered.map(h => (
            <div key={h.id} className="bg-white rounded-2xl border border-border overflow-hidden">
              <button onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-semibold text-foreground">{lang === "eu" ? h.tituloEu : h.titulo}</p>
                  <p className="text-sm text-muted-foreground">{new Date(h.fecha).toLocaleDateString("es-ES")} · {h.categoria}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === h.id ? "rotate-180" : ""}`} />
              </button>
              {expanded === h.id && (
                <div className="px-4 pb-4 pt-1 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">{lang === "eu" ? h.contenidoEu : h.contenido}</p>
                  <Button variant="outline" size="sm" className="gap-2"><Download className="w-3.5 h-3.5" />{lang === "eu" ? "Deskargatu" : "Descargar"}</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PulunpeTab({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const [search, setSearch] = useState("");
  const latest = PULUNPES[0];
  const filtered = PULUNPES.slice(1).filter(p => (lang === "eu" ? p.tituloEu : p.titulo).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Azken Pulunpea" : "Último Pulunpe"}</h2>
        {canCreate && <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{lang === "eu" ? "PDF berria" : "Nuevo PDF"}</Button>}
      </div>
      <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-6 flex items-start gap-5">
        <div className="w-16 h-20 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0">
          <FileText className="w-8 h-8 text-secondary" />
        </div>
        <div className="flex-1">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
            <Calendar className="w-4 h-4" />{new Date(latest.fecha).toLocaleDateString("es-ES", { year: "numeric", month: "long" })}
          </span>
          <h3 className="text-xl font-bold text-foreground mb-2">{lang === "eu" ? latest.tituloEu : latest.titulo}</h3>
          <p className="text-muted-foreground text-sm mb-4">{latest.descripcion}</p>
          <Button className="gap-2"><Download className="w-4 h-4" />{lang === "eu" ? "Deskargatu PDF" : "Descargar PDF"}</Button>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground mb-3">{lang === "eu" ? "Aurreko aleak" : "Números anteriores"}</h3>
        <SearchBar value={search} onChange={setSearch} lang={lang} />
        <div className="mt-3 space-y-2">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-secondary" />
                <div>
                  <p className="font-semibold text-foreground">{lang === "eu" ? p.tituloEu : p.titulo}</p>
                  <p className="text-sm text-muted-foreground">{new Date(p.fecha).toLocaleDateString("es-ES", { year: "numeric", month: "long" })}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2 shrink-0"><Download className="w-3.5 h-3.5" />{lang === "eu" ? "Deskargatu" : "Descargar"}</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoticiasTab({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const [search, setSearch] = useState("");
  const filtered = NOTICIAS.filter(n => (lang === "eu" ? n.tituloEu : n.titulo).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Berriak" : "Noticias"}</h2>
        {canCreate && <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{lang === "eu" ? "Berria" : "Nueva"}</Button>}
      </div>
      <SearchBar value={search} onChange={setSearch} lang={lang} />
      <div className="space-y-4">
        {filtered.map((n, i) => (
          <div key={n.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${i === 0 ? "border-primary/20" : "border-border"}`}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-accent text-accent-foreground rounded-full text-xs font-bold">{n.categoria}</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(n.fecha).toLocaleDateString("es-ES")}</span>
            </div>
            <h3 className="font-bold text-foreground mb-1">{lang === "eu" ? n.tituloEu : n.titulo}</h3>
            <p className="text-muted-foreground text-sm">{lang === "eu" ? n.descripcionEu : n.descripcion}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArticulosTab({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const [search, setSearch] = useState("");
  const filtered = ARTICULOS.filter(a => (lang === "eu" ? a.tituloEu : a.titulo).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Artikuluak" : "Artículos"}</h2>
        {canCreate && <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{lang === "eu" ? "Berria" : "Nuevo"}</Button>}
      </div>
      {filtered[0] && (
        <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-6 flex items-start gap-5">
          <div className="w-16 h-20 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div>
            <span className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1"><Calendar className="w-4 h-4" />{new Date(filtered[0].fecha).toLocaleDateString("es-ES", { year: "numeric", month: "long" })}</span>
            <span className="px-2.5 py-0.5 bg-accent text-accent-foreground rounded-full text-xs font-bold inline-block mb-2">{filtered[0].categoria}</span>
            <h3 className="text-xl font-bold text-foreground mb-2">{lang === "eu" ? filtered[0].tituloEu : filtered[0].titulo}</h3>
            <p className="text-muted-foreground text-sm mb-4">{lang === "eu" ? filtered[0].descripcionEu : filtered[0].descripcion}</p>
            <Button className="gap-2"><Download className="w-4 h-4" />{lang === "eu" ? "Deskargatu PDF" : "Descargar PDF"}</Button>
          </div>
        </div>
      )}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-3">{lang === "eu" ? "Aurrekoak" : "Anteriores"}</h3>
        <SearchBar value={search} onChange={setSearch} lang={lang} />
        <div className="mt-3 space-y-2">
          {filtered.slice(1).map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">{lang === "eu" ? a.tituloEu : a.titulo}</p>
                  <p className="text-sm text-muted-foreground">{new Date(a.fecha).toLocaleDateString("es-ES", { year: "numeric", month: "long" })} · {a.categoria}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2 shrink-0"><Download className="w-3.5 h-3.5" />{lang === "eu" ? "PDF" : "PDF"}</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GaleriaTab({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const [search, setSearch] = useState("");
  const [tema, setTema] = useState<"todo" | "Evento" | "Actividad">("todo");
  const filtered = GALERIA.filter(g => {
    const matchTema = tema === "todo" || g.tema === tema;
    const matchSearch = (lang === "eu" ? g.tituloEu : g.titulo).toLowerCase().includes(search.toLowerCase());
    return matchTema && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Argazki Galeria" : "Galería de Fotos"}</h2>
        {canCreate && <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{lang === "eu" ? "Argazkiak" : "Añadir fotos"}</Button>}
      </div>
      <div className="flex gap-3 flex-wrap items-center">
        <SearchBar value={search} onChange={setSearch} lang={lang} />
        <div className="flex gap-2 shrink-0">
          {(["todo", "Evento", "Actividad"] as const).map(t => (
            <button key={t} onClick={() => setTema(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tema === t ? "bg-primary text-white" : "bg-white border border-border text-foreground hover:border-primary/30"}`}>
              {t === "todo" ? (lang === "eu" ? "Dena" : "Todo") : t === "Evento" ? (lang === "eu" ? "Ekitaldia" : "Evento") : (lang === "eu" ? "Jarduera" : "Actividad")}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(g => (
          <div key={g.id} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all cursor-pointer group">
            <div className="h-32 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{g.emoji}</span>
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm text-foreground line-clamp-1">{lang === "eu" ? g.tituloEu : g.titulo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(g.fecha).toLocaleDateString("es-ES", { month: "short", year: "numeric" })} · {lang === "eu" ? (g.tema === "Evento" ? "Ekitaldia" : "Jarduera") : g.tema}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Divulgacion() {
  const { lang } = useTranslation();
  const user = useStore(s => s.user);
  const [tab, setTab] = useState<Tab>("hoja");
  const canCreate = user ? getUserRoles(user).some(r => r === "directivo" || r === "administrador") : false;

  const TABS: { key: Tab; label: string; labelEu: string; icon: ReactNode }[] = [
    { key: "hoja", label: "Hoja Informativa", labelEu: "Informazio Orria", icon: <Newspaper className="w-4 h-4" /> },
    { key: "pulunpe", label: "Pulunpe", labelEu: "Pulunpe", icon: <FileText className="w-4 h-4" /> },
    { key: "noticias", label: "Noticias", labelEu: "Berriak", icon: <Newspaper className="w-4 h-4" /> },
    { key: "articulos", label: "Artículos", labelEu: "Artikuluak", icon: <BookOpen className="w-4 h-4" /> },
    { key: "galeria", label: "Galería", labelEu: "Galeria", icon: <ImageIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-b from-primary/5 to-background py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-foreground mb-3">
            {lang === "eu" ? "Dibulgazioa" : "Divulgación"}
          </h1>
          <p className="text-xl text-muted-foreground">
            {lang === "eu" ? "Informazio orria, Pulunpea, berriak, artikuluak eta galeria" : "Hoja informativa, Pulunpe, noticias, artículos y galería"}
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

        {tab === "hoja" && <HojaTab lang={lang} canCreate={canCreate} />}
        {tab === "pulunpe" && <PulunpeTab lang={lang} canCreate={canCreate} />}
        {tab === "noticias" && <NoticiasTab lang={lang} canCreate={canCreate} />}
        {tab === "articulos" && <ArticulosTab lang={lang} canCreate={canCreate} />}
        {tab === "galeria" && <GaleriaTab lang={lang} canCreate={canCreate} />}
      </div>
    </div>
  );
}
