import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import {
  Calendar, MapPin, Bus, Utensils, Users, ArrowRight,
  BookOpen, Clock, Search, Loader2, Euro, ChevronLeft,
} from "lucide-react";
import { useStore } from "@/store/use-store";

const API = "/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Fiesta = {
  id: number;
  nombre: string;
  nombreEu: string | null;
  descripcion: string | null;
  descripcionEu: string | null;
  fecha: string | null;
  lugar: string | null;
  fotoUrl: string | null;
  programa: string | null;
  memoria: string | null;
  menu: string | null;
  bus1: string | null;
  bus2: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  precio: string | null;
  plazasTotal: number | null;
  plazasDisponibles: number | null;
  estado: string | null;
};

type MainTab = "fiestas" | "excursiones" | "viajes";
type FiestaSection = "proxima" | "previstas" | "realizadas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  try {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return fecha; }
}

// ─── Fiestas section nav ──────────────────────────────────────────────────────

function FiestaSectionNav({
  lang, active, onChange, counts,
}: {
  lang: string;
  active: FiestaSection;
  onChange: (s: FiestaSection) => void;
  counts: { proxima: number; previstas: number; realizadas: number };
}) {
  const items: { key: FiestaSection; label: string; labelEu: string; activeClass: string }[] = [
    { key: "proxima",    label: "Próxima",   labelEu: "Hurrengoa",    activeClass: "border-green-400 text-green-700 bg-green-50" },
    { key: "previstas",  label: "Previstas", labelEu: "Aurreikusiak", activeClass: "border-blue-400 text-blue-700 bg-blue-50" },
    { key: "realizadas", label: "Realizadas",labelEu: "Egindakoak",   activeClass: "border-muted text-muted-foreground bg-muted/20" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`rounded-2xl border-2 p-3 text-center transition-all ${
            active === item.key
              ? item.activeClass + " shadow-sm font-bold"
              : "border-border bg-white text-muted-foreground hover:border-primary/30"
          }`}
        >
          <p className="text-sm font-bold">{lang === "eu" ? item.labelEu : item.label}</p>
          {counts[item.key] > 0 && (
            <p className="text-xs mt-0.5 opacity-60">
              {counts[item.key]} {lang === "eu" ? "fiesta" : counts[item.key] > 1 ? "fiestas" : "fiesta"}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Próxima detail card ──────────────────────────────────────────────────────

function ProximaCard({ f, lang }: { f: Fiesta; lang: string }) {
  const [inscrito, setInscrito] = useState(false);
  const nombre = lang === "eu" ? (f.nombreEu ?? f.nombre) : f.nombre;
  const descripcion = lang === "eu" ? (f.descripcionEu ?? f.descripcion) : f.descripcion;
  const precio = parseFloat(f.precio ?? "0");

  return (
    <div className="bg-white rounded-3xl border border-primary/20 shadow-md overflow-hidden">
      {f.fotoUrl ? (
        <div className="h-56 overflow-hidden relative">
          <img src={f.fotoUrl} alt={nombre} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              {lang === "eu" ? "Hurrengoa" : "Próxima"}
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-2">{nombre}</h2>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-primary/10 to-background p-6 border-b border-border">
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
            {lang === "eu" ? "Hurrengoa" : "Próxima"}
          </span>
          <h2 className="text-2xl font-extrabold text-foreground mt-2">{nombre}</h2>
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-4">
        {descripcion && <p className="text-muted-foreground leading-relaxed">{descripcion}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {f.fecha && (
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase mb-0.5">
                  {lang === "eu" ? "Data" : "Fecha"}
                </p>
                <p className="font-semibold text-sm">{formatFecha(f.fecha)}</p>
              </div>
            </div>
          )}
          {(f.horaInicio || f.horaFin) && (
            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase mb-0.5">
                  {lang === "eu" ? "Ordutegia" : "Horario"}
                </p>
                <p className="font-semibold text-sm">
                  {f.horaInicio ?? ""}{f.horaInicio && f.horaFin ? " – " : ""}{f.horaFin ?? ""}
                </p>
              </div>
            </div>
          )}
          {f.lugar && (
            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase mb-0.5">
                  {lang === "eu" ? "Lekua" : "Lugar"}
                </p>
                <p className="font-semibold text-sm">{f.lugar}</p>
              </div>
            </div>
          )}
          {precio > 0 && (
            <div className="flex gap-3">
              <Euro className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase mb-0.5">
                  {lang === "eu" ? "Prezioa" : "Precio"}
                </p>
                <p className="text-xl font-extrabold text-secondary">{precio}€</p>
              </div>
            </div>
          )}
        </div>

        {f.menu && (
          <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 flex gap-3">
            <Utensils className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase mb-1">
                {lang === "eu" ? "Menua" : "Menú"}
              </p>
              <p className="font-medium text-sm">{f.menu}</p>
            </div>
          </div>
        )}

        {(f.bus1 || f.bus2) && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
            <Bus className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase mb-1.5">
                {lang === "eu" ? "Autobus geltokiak" : "Paradas de autobús"}
              </p>
              <div className="space-y-1">
                {f.bus1 && <p className="text-sm font-medium">📍 {f.bus1}</p>}
                {f.bus2 && <p className="text-sm font-medium">📍 {f.bus2}</p>}
              </div>
            </div>
          </div>
        )}

        {f.programa && (
          <div className="bg-muted/30 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground font-bold uppercase mb-2">
              {lang === "eu" ? "Programa" : "Programa"}
            </p>
            <p className="text-sm whitespace-pre-line leading-relaxed text-foreground">{f.programa}</p>
          </div>
        )}

        {f.plazasDisponibles !== null && f.plazasDisponibles > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4 text-secondary" />
            <span>{f.plazasDisponibles} {lang === "eu" ? "plaza libre" : "plazas disponibles"}</span>
          </div>
        )}

        <div className="pt-2">
          {inscrito ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold text-sm">
                ✓ {lang === "eu" ? "Izena emanda" : "Inscrito"}
              </span>
              <Button variant="outline" size="sm" onClick={() => setInscrito(false)}>
                {lang === "eu" ? "Baja eman" : "Cancelar inscripción"}
              </Button>
            </div>
          ) : (
            <Button size="lg" className="gap-2" onClick={() => setInscrito(true)}>
              <Users className="w-4 h-4" />
              {lang === "eu" ? "Izena eman" : "Inscribirme"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Previstas list ───────────────────────────────────────────────────────────

function PrevistasList({ fiestas, lang }: { fiestas: Fiesta[]; lang: string }) {
  if (fiestas.length === 0) {
    return (
      <p className="text-center py-12 text-muted-foreground">
        {lang === "eu" ? "Ez dago fiesta aurreikusita" : "No hay fiestas previstas por el momento"}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {fiestas.map(f => {
        const nombre = lang === "eu" ? (f.nombreEu ?? f.nombre) : f.nombre;
        const descripcion = lang === "eu" ? (f.descripcionEu ?? f.descripcion) : f.descripcion;
        const precio = parseFloat(f.precio ?? "0");
        return (
          <div key={f.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center shrink-0">
              {f.fecha ? (
                <>
                  <span className="text-lg font-extrabold text-blue-700 leading-none">
                    {new Date(f.fecha + "T12:00:00").getDate()}
                  </span>
                  <span className="text-[10px] font-bold text-blue-500 uppercase">
                    {new Date(f.fecha + "T12:00:00").toLocaleDateString("es-ES", { month: "short" })}
                  </span>
                </>
              ) : <Calendar className="w-5 h-5 text-blue-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground">{nombre}</p>
              {descripcion && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{descripcion}</p>}
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {f.lugar && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" />{f.lugar}</span>}
                {f.horaInicio && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" />{f.horaInicio}{f.horaFin ? ` – ${f.horaFin}` : ""}</span>}
                {precio > 0 && <span className="font-bold text-secondary">{precio}€</span>}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 self-center" />
          </div>
        );
      })}
    </div>
  );
}

// ─── Realizadas list ──────────────────────────────────────────────────────────

function RealizadasList({ fiestas, lang }: { fiestas: Fiesta[]; lang: string }) {
  const [searchName, setSearchName] = useState("");
  const [searchDate, setSearchDate] = useState("");

  if (fiestas.length === 0) {
    return (
      <p className="text-center py-12 text-muted-foreground">
        {lang === "eu" ? "Ez dago oraindik fiesta eginik" : "Aún no hay fiestas realizadas"}
      </p>
    );
  }

  const latest = fiestas[0];
  const rest = fiestas.slice(1);

  const filtered = rest.filter(f => {
    const nombre = (lang === "eu" ? (f.nombreEu ?? f.nombre) : f.nombre) ?? "";
    const matchName = searchName === "" || nombre.toLowerCase().includes(searchName.toLowerCase());
    const matchDate = searchDate === "" || (f.fecha ?? "").startsWith(searchDate);
    return matchName && matchDate;
  });

  const latestNombre = lang === "eu" ? (latest.nombreEu ?? latest.nombre) : latest.nombre;

  return (
    <div className="space-y-6">
      {/* Latest realized */}
      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        {latest.fotoUrl && (
          <div className="h-48 overflow-hidden relative">
            <img src={latest.fotoUrl} alt={latestNombre} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <span className="absolute bottom-3 left-4 bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full">
              {lang === "eu" ? "Azken egindakoa" : "Última realizada"}
            </span>
          </div>
        )}
        <div className="p-5">
          {!latest.fotoUrl && (
            <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
              {lang === "eu" ? "Azken egindakoa" : "Última realizada"}
            </span>
          )}
          <h3 className="text-xl font-extrabold text-foreground mb-1">{latestNombre}</h3>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
            {latest.fecha && (
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary" />{formatFecha(latest.fecha)}</span>
            )}
            {latest.lugar && (
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" />{latest.lugar}</span>
            )}
          </div>
          {latest.memoria && (
            <div className="bg-muted/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                  {lang === "eu" ? "Memoria" : "Memoria de la fiesta"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{latest.memoria}</p>
            </div>
          )}
        </div>
      </div>

      {/* Searchable index */}
      {rest.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground mb-3">
            {lang === "eu" ? "Aurreko festak" : "Fiestas anteriores"}
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={lang === "eu" ? "Izena bilatu…" : "Buscar por nombre…"}
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="month"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {(searchName || searchDate) && (
              <button onClick={() => { setSearchName(""); setSearchDate(""); }}
                className="text-sm text-muted-foreground hover:text-foreground underline px-2">
                {lang === "eu" ? "Garbitu" : "Limpiar"}
              </button>
            )}
          </div>
          {filtered.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">
              {lang === "eu" ? "Ez da emaitzarik aurkitu" : "Sin resultados"}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map(f => {
                const nombre = lang === "eu" ? (f.nombreEu ?? f.nombre) : f.nombre;
                return (
                  <div key={f.id} className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted/30 flex flex-col items-center justify-center shrink-0">
                      {f.fecha && (
                        <>
                          <span className="text-xs font-extrabold text-muted-foreground leading-none">
                            {new Date(f.fecha + "T12:00:00").getDate()}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">
                            {new Date(f.fecha + "T12:00:00").toLocaleDateString("es-ES", { month: "short" })}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{nombre}</p>
                      {f.fecha && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(f.fecha + "T12:00:00").toLocaleDateString("es-ES", { year: "numeric", month: "long" })}
                          {f.lugar ? ` · ${f.lugar}` : ""}
                        </p>
                      )}
                    </div>
                    {f.memoria && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <BookOpen className="w-3.5 h-3.5" /> Memoria
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fiestas tab ──────────────────────────────────────────────────────────────

function FiestasTab({ lang }: { lang: string }) {
  const [section, setSection] = useState<FiestaSection>("proxima");
  const [fiestas, setFiestas] = useState<Fiesta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiestas = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/fiestas`);
      const d = await r.json();
      setFiestas(d.items ?? []);
    } catch { setFiestas([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFiestas(); }, [fetchFiestas]);

  const proxima   = fiestas.find(f => f.estado === "proxima") ?? null;
  const previstas = fiestas.filter(f => f.estado === "prevista");
  const realizadas = fiestas.filter(f => f.estado === "realizada");
  const counts = { proxima: proxima ? 1 : 0, previstas: previstas.length, realizadas: realizadas.length };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <FiestaSectionNav lang={lang} active={section} onChange={setSection} counts={counts} />
      {section === "proxima" && (
        proxima
          ? <ProximaCard f={proxima} lang={lang} />
          : <p className="text-center py-12 text-muted-foreground">
              {lang === "eu" ? "Ez dago fiesta hurrengoa konfiguratuta" : "No hay próxima fiesta configurada"}
            </p>
      )}
      {section === "previstas"  && <PrevistasList fiestas={previstas}  lang={lang} />}
      {section === "realizadas" && <RealizadasList fiestas={realizadas} lang={lang} />}
    </div>
  );
}

// ─── Placeholder for excursiones / viajes ────────────────────────────────────

function ComingSoon({ label, lang }: { label: string; lang: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
      <p className="text-lg font-semibold mb-1">{label}</p>
      <p className="text-sm">{lang === "eu" ? "Laster eskuragarri" : "Próximamente disponible"}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MisEventos() {
  const { t, lang } = useTranslation();
  const [tab, setTab] = useState<MainTab>("fiestas");

  const TABS: { key: MainTab; label: string; labelEu: string; emoji: string }[] = [
    { key: "fiestas",     label: "Fiestas",     labelEu: "Festak",   emoji: "🎉" },
    { key: "excursiones", label: "Excursiones", labelEu: "Txangoak", emoji: "🚌" },
    { key: "viajes",      label: "Viajes",      labelEu: "Bidaiak",  emoji: "✈️" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t("menu.mis_eventos")}</h1>

      {/* Main tab bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              tab === tb.key
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-white border border-border text-foreground hover:border-primary/30"
            }`}
          >
            <span>{tb.emoji}</span>
            {lang === "eu" ? tb.labelEu : tb.label}
          </button>
        ))}
      </div>

      {tab === "fiestas"     && <FiestasTab lang={lang} />}
      {tab === "excursiones" && <ComingSoon label={lang === "eu" ? "Txangoak" : "Excursiones"} lang={lang} />}
      {tab === "viajes"      && <ComingSoon label={lang === "eu" ? "Bidaiak" : "Viajes"} lang={lang} />}
    </div>
  );
}
