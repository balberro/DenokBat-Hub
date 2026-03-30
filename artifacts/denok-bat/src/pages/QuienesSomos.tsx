import { useState, type ReactNode } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { FileText, Download, Users, GitBranch } from "lucide-react";
import { Link } from "wouter";

type Tab = "presentacion" | "estatutos" | "organigrama" | "galeria";

const FUNDADORES = [
  { nombre: "Patxi Aguirre Mendibil", descripcion: "Promotor y primer presidente de la asociación.", descripcionEu: "Elkartearen sustatzaile eta lehen presidentea." },
  { nombre: "María Josefa Etxebarria", descripcion: "Cofundadora y responsable de actividades.", descripcionEu: "Sortzailekidea eta jardueraren arduraduna." },
  { nombre: "José Ignacio Larrea", descripcion: "Cofundador y primer tesorero.", descripcionEu: "Sortzailekidea eta lehen diruzaina." },
  { nombre: "Ana María Goikoetxea", descripcion: "Cofundadora y primera secretaria.", descripcionEu: "Sortzailekidea eta lehen idazkaria." },
  { nombre: "Luis Zabala Uriarte", descripcion: "Cofundador y primer vocal de socios.", descripcionEu: "Sortzailekidea eta lehen bazkide ordezkaria." },
];

const DIRECTIVOS = [
  { nombre: "María Etxebarria", cargo: "Presidenta", cargoEu: "Presidentea" },
  { nombre: "Jose Aguirre", cargo: "Vicepresidente", cargoEu: "Presidenteordea" },
  { nombre: "Ana Goikoetxea", cargo: "Secretaria", cargoEu: "Idazkaria" },
  { nombre: "Luis Zabala", cargo: "Tesorero", cargoEu: "Diruzaina" },
  { nombre: "Ane Larrinaga", cargo: "Vocal de Actividades", cargoEu: "Jardueretako Bozeramailea" },
  { nombre: "Mikel Uriarte", cargo: "Vocal de Eventos", cargoEu: "Ekitaldietako Bozeramailea" },
];

const DELEGADOS = [
  { nombre: "Elena Bilbao", cargo: "Delegada Zona Norte", cargoEu: "Ipar Zonako Ordezkaria", grupo: "Zona Norte" },
  { nombre: "Pedro Iturriaga", cargo: "Delegado Zona Sur", cargoEu: "Hego Zonako Ordezkaria", grupo: "Zona Sur" },
  { nombre: "Carmen Zubizarreta", cargo: "Delegada Zona Este", cargoEu: "Ekialde Zonako Ordezkaria", grupo: "Zona Este" },
];

const GALERIA_ITEMS = [
  { id: 1, titulo: "Excursión a Bilbao", tituloEu: "Bilbaoko Txangoa", fecha: "2026-03-08", tema: "Evento", emoji: "🏛️" },
  { id: 2, titulo: "Fiesta de Carnavales", tituloEu: "Inauterietako Jaia", fecha: "2026-02-14", tema: "Evento", emoji: "🎭" },
  { id: 3, titulo: "Clase de Yoga - Enero", tituloEu: "Yoga Klasea", fecha: "2026-01-15", tema: "Actividad", emoji: "🧘" },
  { id: 4, titulo: "Torneo de Mus", tituloEu: "Mus Txapelketa", fecha: "2026-02-05", tema: "Actividad", emoji: "🃏" },
  { id: 5, titulo: "Almuerzo de Navidad", tituloEu: "Gabonetako Bazkaria", fecha: "2025-12-20", tema: "Evento", emoji: "🎄" },
  { id: 6, titulo: "Senderismo Otoño", tituloEu: "Udazkeneko Mendi-ibilaldia", fecha: "2025-10-12", tema: "Actividad", emoji: "🏔️" },
];

function PresentacionTab({ lang }: { lang: string }) {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">{lang === "eu" ? "Gure Historia" : "Nuestra Historia"}</h2>
        <div className="prose prose-gray max-w-none space-y-4 text-muted-foreground leading-relaxed">
          <p>
            {lang === "eu"
              ? "Denok Bat 1985ean sortu zen, Euskal Herriko jubilatu eta erretiratu talde txiki baten eskutik, elkarrekintzan eta laguntasunean sinesten zutenak. Hasieran 40 kide inguru ziren; gaur egun, 1.200 bazkide baino gehiago ditugu."
              : "Denok Bat nació en 1985 de la mano de un pequeño grupo de jubilados y jubiladas del País Vasco que creían en la convivencia y la solidaridad. En sus inicios contaban con unos 40 socios; hoy somos más de 1.200."}
          </p>
          <p>
            {lang === "eu"
              ? "Gure helburua beti berdintsua izan da: adin nagusiko pertsonen ongizatea sustatzea, parte-hartzea bultzatzea eta bizitza aktiboa ahalbidetzea. Horretarako, jarduera anitz eskaintzen ditugu: yoga, gimnasia, mendi-ibilaldiak, kulturaldia eta askoz gehiago."
              : "Nuestro propósito siempre ha sido el mismo: promover el bienestar de las personas mayores, fomentar la participación y facilitar una vida activa. Para ello ofrecemos una amplia gama de actividades: yoga, gimnasia, montañismo, excursiones culturales y mucho más."}
          </p>
          <p>
            {lang === "eu"
              ? "Denok Bat hitz egiten du: 'denak bat' esan nahi du euskaraz. Izen hau gure filosofiaren sinbolo da: batasunean eta elkartasunean, denok batera."
              : "Denok Bat significa 'todos juntos' en euskera. Un nombre que sintetiza nuestra filosofía: en unión y solidaridad, todos y todas juntas."}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-5">{lang === "eu" ? "Sortzaileak" : "Los Fundadores"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FUNDADORES.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-5 flex items-start gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary">{f.nombre[0]}</span>
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
        {[
          { year: "1985", texto: lang === "eu" ? "Sorrera" : "Fundación", icon: "🌱" },
          { year: "1992", texto: lang === "eu" ? "Lehen egoitza" : "Primera sede", icon: "🏠" },
          { year: "2005", texto: lang === "eu" ? "500 bazkide" : "500 socios", icon: "🎉" },
          { year: "2026", texto: lang === "eu" ? "+1.200 bazkide" : "+1.200 socios", icon: "⭐" },
        ].map((h, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5 text-center">
            <span className="text-3xl">{h.icon}</span>
            <p className="text-2xl font-extrabold text-primary mt-2">{h.year}</p>
            <p className="text-sm text-muted-foreground mt-1">{h.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstatutosTab({ lang }: { lang: string }) {
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
          <p className="text-sm font-semibold text-foreground mb-1">{lang === "eu" ? "Oinarrizko artikuluak:" : "Artículos principales:"}</p>
          <ul className="text-sm space-y-1">
            <li>• {lang === "eu" ? "Art. 1 — Izena eta egoitza" : "Art. 1 — Denominación y domicilio"}</li>
            <li>• {lang === "eu" ? "Art. 2 — Helburuak" : "Art. 2 — Fines y objetivos"}</li>
            <li>• {lang === "eu" ? "Art. 3 — Bazkideak" : "Art. 3 — Los socios"}</li>
            <li>• {lang === "eu" ? "Art. 4 — Organo gobernatzaileak" : "Art. 4 — Órganos de gobierno"}</li>
            <li>• {lang === "eu" ? "Art. 5 — Ekonomia eta finantza" : "Art. 5 — Régimen económico"}</li>
          </ul>
        </div>
      </div>
      <div className="flex gap-3">
        <Button className="gap-2"><Download className="w-4 h-4" />{lang === "eu" ? "Estatutuak deskargatu (PDF)" : "Descargar Estatutos (PDF)"}</Button>
        <Button variant="outline" className="gap-2"><FileText className="w-4 h-4" />{lang === "eu" ? "Batzar Nagusiak" : "Actas Asambleas"}</Button>
      </div>
    </div>
  );
}

function OrganigramaTab({ lang }: { lang: string }) {
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
            {DIRECTIVOS.map((d, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary">{d.nombre[0]}</span>
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{d.nombre}</h4>
                  <p className="text-sm text-muted-foreground">{lang === "eu" ? d.cargoEu : d.cargo}</p>
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
            {DELEGADOS.map((d, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
                <div className="w-14 h-14 bg-secondary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-secondary">{d.nombre[0]}</span>
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{d.nombre}</h4>
                  <p className="text-sm text-muted-foreground">{lang === "eu" ? d.cargoEu : d.cargo}</p>
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
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Argazki Galeria" : "Galería de Fotos"}</h2>
        <Link href="/divulgacion">
          <Button variant="outline" size="sm">
            {lang === "eu" ? "Galeria osoa ikusi" : "Ver galería completa"}
          </Button>
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">{lang === "eu" ? "Galeria osoa Dibulgazioa atalean dago." : "La galería completa está disponible en la sección de Divulgación."}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {GALERIA_ITEMS.map(g => (
          <div key={g.id} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all cursor-pointer group">
            <div className="h-32 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{g.emoji}</span>
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm text-foreground line-clamp-1">{lang === "eu" ? g.tituloEu : g.titulo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{new Date(g.fecha).toLocaleDateString("es-ES", { month: "short", year: "numeric" })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuienesSomos() {
  const { lang } = useTranslation();
  const [tab, setTab] = useState<Tab>("presentacion");

  const TABS: { key: Tab; label: string; labelEu: string; icon: ReactNode }[] = [
    { key: "presentacion", label: "Presentación", labelEu: "Aurkezpena", icon: <Users className="w-4 h-4" /> },
    { key: "estatutos", label: "Estatutos", labelEu: "Estatutuak", icon: <FileText className="w-4 h-4" /> },
    { key: "organigrama", label: "Organigrama", labelEu: "Organigrama", icon: <GitBranch className="w-4 h-4" /> },
    { key: "galeria", label: "Galería", labelEu: "Galeria", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-b from-primary/5 to-background py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-foreground mb-3">
            {lang === "eu" ? "Nor Gara" : "Quiénes Somos"}
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

        {tab === "presentacion" && <PresentacionTab lang={lang} />}
        {tab === "estatutos" && <EstatutosTab lang={lang} />}
        {tab === "organigrama" && <OrganigramaTab lang={lang} />}
        {tab === "galeria" && <GaleriaTab lang={lang} />}
      </div>
    </div>
  );
}
