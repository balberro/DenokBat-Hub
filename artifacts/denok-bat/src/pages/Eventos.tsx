import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Bus, Utensils, Users, ChevronLeft, ArrowRight, BookOpen, Clock, Search, Loader2, Euro } from "lucide-react";
import { Link } from "wouter";
import { useStore } from "@/store/use-store";

type Tab = "fiestas" | "excursiones" | "viajes";
type SubTab = "proxima" | "previstas" | "realizadas" | "proximo" | "previstos" | "realizados";

const EXCURSIONES = [
  {
    id: 1, estado: "proxima",
    nombre: "Donostia y el Peine del Viento", nombreEu: "Donostia eta Haizearen Orrazia",
    descripcion: "Visita cultural a San Sebastián con paseo por la Parte Vieja y visita al Peine del Viento de Chillida.", descripcionEu: "Kulturaldia San Sebastianen Alde Zaharra eta Chillida-ren Haizearen Orrazia ikusiz.",
    fecha: "10 de mayo de 2026", destino: "San Sebastián (Gipuzkoa)",
    lugarComida: "Restaurante Kaia-Kaipe", menuComida: "Menú degustación pintxos + postre + vino",
    precio: 18, plazasDisponibles: 32,
    paradabus: "Sede Central 08:00 · Calle Mayor 08:15 · Polideportivo 08:25",
  },
  {
    id: 2, estado: "prevista",
    nombre: "Laguardia y Bodegas Ysios", nombreEu: "Laguardia eta Ysios Bodegak",
    descripcion: "La medieval Laguardia con visita a la bodega Ysios diseñada por Calatrava.", descripcionEu: "Erdi Aroko Laguardia, Calatravak diseinatutako Ysios upategiarekin.",
    fecha: "14 de junio de 2026", destino: "Laguardia (Álava)",
    lugarComida: "Restaurante El Bodegón", menuComida: "Comida típica alavesa + cata de vinos",
    precio: 25, plazasDisponibles: 45,
    paradabus: "Sede Central 08:30 · Calle Mayor 08:45",
  },
  {
    id: 3, estado: "prevista",
    nombre: "Pamplona medieval", nombreEu: "Erdi Aroko Iruñea",
    descripcion: "Casco histórico, ciudadela y Museo de Navarra.", descripcionEu: "Hiri historikoa, gotorlekua eta Nafarroako Museoa.",
    fecha: "19 de julio de 2026", destino: "Pamplona (Navarra)",
    lugarComida: "Restaurante Túbal", menuComida: "Menú navarro completo",
    precio: 22, plazasDisponibles: 48,
    paradabus: "Sede Central 07:45 · Calle Mayor 08:00 · Polideportivo 08:10",
  },
  {
    id: 4, estado: "realizada",
    nombre: "Bilbao: Guggenheim y Casco Viejo", nombreEu: "Bilbao: Guggenheim eta Alde Zaharra",
    descripcion: "Visita guiada al Guggenheim Bilbao y paseo por el casco viejo con pintxos.", descripcionEu: "Guggenheim Bilbaoko bisita gidatua eta Alde Zaharreko pasealdia pintxoekin.",
    fecha: "8 de marzo de 2026", destino: "Bilbao (Bizkaia)",
    lugarComida: "Siete Calles", menuComida: "Pintxos en el Casco Viejo",
    precio: 12, plazasDisponibles: 0,
    paradabus: "Sede Central 09:00 · Polideportivo 09:15",
    memoria: "Jornada excelente con 55 participantes. El Guggenheim impresionó a todos. Los pintxos en el Casco Viejo fueron el broche perfecto.",
  },
];

const VIAJES = [
  {
    id: 1, estado: "proximo",
    nombre: "Galicia: Rías Bajas y Santiago", nombreEu: "Galizia: Rias Baixas eta Santiago",
    descripcion: "5 días por las Rías Bajas gallegas con paradas en Vigo, Cambados, Pontevedra y visita a Santiago de Compostela.", descripcionEu: "5 egun Galiziar Rias Baixetatik Vigo, Cambados, Pontevedra eta Santiagora bisitarekin.",
    fechas: "15 - 19 septiembre 2026", alojamiento: "Hotel Parador de Santiago (4★)",
    precio: 450, plazasDisponibles: 28, plazasTotal: 40,
    destinos: ["Vigo", "Cambados", "Pontevedra", "Santiago de Compostela"],
  },
  {
    id: 2, estado: "previsto",
    nombre: "Cantabria: Picos de Europa", nombreEu: "Kantabria: Europako Mendilerroa",
    descripcion: "4 días por Santander, Picos de Europa y la Cueva de Altamira.", descripcionEu: "4 egun Santander, Europako Mendilerroa eta Altamirako kobazulotik.",
    fechas: "8 - 11 octubre 2026", alojamiento: "Hotel Picos de Europa (3★)",
    precio: 320, plazasDisponibles: 35, plazasTotal: 35,
    destinos: ["Santander", "Potes", "Altamira", "Comillas"],
  },
  {
    id: 3, estado: "realizado",
    nombre: "Portugal: Oporto y el Duero", nombreEu: "Portugal: Porto eta Duero",
    descripcion: "5 días por Oporto y la región vinícola del Duero.", descripcionEu: "5 egun Porto eta Duero mahats-ardo eskualdetik.",
    fechas: "2 - 6 junio 2026", alojamiento: "Hotel Infante de Sagres (4★)",
    precio: 490, plazasDisponibles: 0, plazasTotal: 38,
    destinos: ["Oporto", "Valle del Duero", "Guimarães"],
    memoria: "Viaje espectacular. 38 socios disfrutaron de la gastronomía portuguesa, los paisajes del Duero y la arquitectura azulejo de Oporto.",
  },
];

const ESTADO_EXCURSION: Record<string, { label: string; color: string }> = {
  proxima: { label: "Próxima", color: "bg-green-100 text-green-700" },
  proximo: { label: "Próximo", color: "bg-green-100 text-green-700" },
  prevista: { label: "Prevista", color: "bg-blue-100 text-blue-700" },
  previsto: { label: "Previsto", color: "bg-blue-100 text-blue-700" },
  realizada: { label: "Realizada", color: "bg-muted text-muted-foreground" },
  realizado: { label: "Realizado", color: "bg-muted text-muted-foreground" },
};

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
  publicado: boolean | null;
};

type FiestaSection = "proxima" | "previstas" | "realizadas";

function formatFecha(fecha: string | null, _lang: string): string {
  if (!fecha) return "—";
  try {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return fecha;
  }
}

function FiestaSectionNav({
  active,
  onChange,
  counts,
}: {
  active: FiestaSection;
  onChange: (s: FiestaSection) => void;
  counts: { proxima: number; previstas: number; realizadas: number };
}) {
  const { t } = useTranslation();
  const items: { key: FiestaSection; labelKey: string }[] = [
    { key: "proxima", labelKey: "eventos.next" },
    { key: "previstas", labelKey: "eventos.open_enrollment" },
    { key: "realizadas", labelKey: "eventos.last_realized" },
  ];

  return (
    <div className="flex gap-2 mb-6 border-b border-border">
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            active === item.key
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t(item.labelKey)}
          {counts[item.key] > 0 ? ` (${counts[item.key]})` : ""}
        </button>
      ))}
    </div>
  );
}

function FiestaCardProxima({ f, lang, user }: { f: Fiesta; lang: string; user: any }) {
  const { t } = useTranslation();
  const nombre = lang === "eu" ? (f.nombreEu ?? f.nombre) : f.nombre;
  const descripcion = lang === "eu" ? (f.descripcionEu ?? f.descripcion) : f.descripcion;
  const precio = parseFloat(f.precio ?? "0");

  return (
    <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-6">
      {f.fotoUrl ? (
        <div className="h-48 rounded-xl overflow-hidden relative mb-5">
          <img src={f.fotoUrl} alt={nombre} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              {t("eventos.next")}
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-2">{nombre}</h2>
          </div>
        </div>
      ) : (
        <div className="bg-linear-to-br from-primary/10 via-secondary/5 to-background p-6 rounded-xl mb-5">
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
            {t("eventos.next")}
          </span>
          <h2 className="text-2xl font-bold text-foreground mt-3">{nombre}</h2>
        </div>
      )}

      <div>
        {f.fotoUrl && <h2 className="text-2xl font-bold text-foreground mb-3">{nombre}</h2>}
        {descripcion && (
          <p className="text-muted-foreground mb-4 leading-relaxed">{descripcion}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {f.fecha && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-0.5">
                  {t("eventos.date")}
                </p>
                <p className="font-semibold text-foreground">{formatFecha(f.fecha, lang)}</p>
              </div>
            </div>
          )}

          {(f.horaInicio || f.horaFin) && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-0.5">
                  {t("eventos.schedule")}
                </p>
                <p className="font-semibold text-foreground">
                  {f.horaInicio ?? ""}{f.horaInicio && f.horaFin ? " – " : ""}{f.horaFin ?? ""}
                </p>
              </div>
            </div>
          )}

          {f.lugar && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-0.5">
                  {t("eventos.place")}
                </p>
                <p className="font-semibold text-foreground">{f.lugar}</p>
              </div>
            </div>
          )}

          {precio > 0 && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <Euro className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-0.5">
                  {t("eventos.price")}
                </p>
                <p className="text-2xl font-extrabold text-secondary">{precio}€</p>
              </div>
            </div>
          )}
        </div>

        {f.menu && (
          <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-5 mb-5">
            <div className="flex gap-3">
              <Utensils className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-1">
                  {t("eventos.menu")}
                </p>
                <p className="text-foreground font-medium">{f.menu}</p>
              </div>
            </div>
          </div>
        )}

        {(f.bus1 || f.bus2) && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-5">
            <div className="flex gap-3">
              <Bus className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-2">
                  {t("eventos.bus_stops")}
                </p>
                <div className="space-y-1">
                  {f.bus1 && <p className="font-medium text-foreground">📍 {f.bus1}</p>}
                  {f.bus2 && <p className="font-medium text-foreground">📍 {f.bus2}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {f.programa && (
          <div className="bg-muted/30 rounded-2xl p-5 mb-5">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-2">
              {t("eventos.program")}
            </p>
            <p className="text-foreground whitespace-pre-line leading-relaxed">{f.programa}</p>
          </div>
        )}

        {f.plazasDisponibles !== null && f.plazasDisponibles > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Users className="w-4 h-4 text-secondary" />
            <span>{f.plazasDisponibles} {t("eventos.places_available")}</span>
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          {user ? (
            <Button size="lg" className="gap-2">
              <Users className="w-4 h-4" />
              {t("eventos.enroll_short")}
            </Button>
          ) : (
            <Link href="/login">
              <Button size="lg" variant="outline" className="gap-2">
                {t("eventos.access_to_enroll")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function FiestaPrevistas({ fiestas, lang }: { fiestas: Fiesta[]; lang: string }) {
  const { t } = useTranslation();
  if (fiestas.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        {t("eventos.none_planned")}
      </div>
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
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center shrink-0">
              {f.fecha ? (
                <>
                  <span className="text-xl font-extrabold text-blue-700 leading-none">
                    {new Date(f.fecha + "T12:00:00").getDate()}
                  </span>
                  <span className="text-xs font-bold text-blue-500 uppercase">
                    {new Date(f.fecha + "T12:00:00").toLocaleDateString("es-ES", { month: "short" })}
                  </span>
                </>
              ) : (
                <Calendar className="w-6 h-6 text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-lg mb-1">{nombre}</h3>
              {descripcion && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{descripcion}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm">
                {f.lugar && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-primary" />{f.lugar}
                  </span>
                )}
                {(f.horaInicio) && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />{f.horaInicio}{f.horaFin ? ` – ${f.horaFin}` : ""}
                  </span>
                )}
                {precio > 0 && (
                  <span className="font-bold text-secondary">{precio}€</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FiestaRealizadas({ fiestas, lang }: { fiestas: Fiesta[]; lang: string }) {
  const { t } = useTranslation();
  const [searchName, setSearchName] = useState("");
  const [searchDate, setSearchDate] = useState("");

  if (fiestas.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        {t("eventos.none_realized")}
      </div>
    );
  }

  // Latest realized fiesta (first in list, since ordered by date desc)
  const latest = fiestas[0];
  const rest = fiestas.slice(1);

  // Filter the index
  const filtered = rest.filter(f => {
    const nombre = (lang === "eu" ? (f.nombreEu ?? f.nombre) : f.nombre) ?? "";
    const matchName = searchName === "" || nombre.toLowerCase().includes(searchName.toLowerCase());
    const matchDate = searchDate === "" || (f.fecha ?? "").startsWith(searchDate);
    return matchName && matchDate;
  });

  const latestNombre = lang === "eu" ? (latest.nombreEu ?? latest.nombre) : latest.nombre;
  const latestDescripcion = lang === "eu" ? (latest.descripcionEu ?? latest.descripcion) : latest.descripcion;

  return (
    <div className="space-y-6">
      {/* Latest realized with memory */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {latest.fotoUrl && (
          <div className="h-48 overflow-hidden relative">
            <img src={latest.fotoUrl} alt={latestNombre} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full">
                {t("eventos.last_realized")}
              </span>
            </div>
          </div>
        )}
        <div className="p-6">
          {!latest.fotoUrl && (
            <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
              {t("eventos.last_realized")}
            </span>
          )}
          <h3 className="text-xl font-bold text-foreground mb-1">{latestNombre}</h3>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
            {latest.fecha && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {formatFecha(latest.fecha, lang)}
              </span>
            )}
            {latest.lugar && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />{latest.lugar}
              </span>
            )}
          </div>
          {latestDescripcion && (
            <p className="text-muted-foreground mb-4 leading-relaxed">{latestDescripcion}</p>
          )}
          {latest.memoria && (
            <div className="bg-muted/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <p className="font-bold text-sm text-foreground">{t("eventos.memory")}</p>
              </div>
              <p className="text-muted-foreground leading-relaxed">{latest.memoria}</p>
            </div>
          )}
        </div>
      </div>

      {/* Searchable index of previous ones */}
      {rest.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4">
            {t("eventos.previous_fiestas")}
          </h3>

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("eventos.search_placeholder")}
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="month"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {(searchName || searchDate) && (
              <button
                onClick={() => { setSearchName(""); setSearchDate(""); }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {t("eventos.clear")}
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              {t("eventos.no_results_search")}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map(f => {
                const nombre = lang === "eu" ? (f.nombreEu ?? f.nombre) : f.nombre;
                return (
                  <div key={f.id} className="bg-white rounded-xl border border-border px-5 py-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted/30 flex flex-col items-center justify-center shrink-0">
                      {f.fecha && (
                        <>
                          <span className="text-sm font-extrabold text-muted-foreground leading-none">
                            {new Date(f.fecha + "T12:00:00").getDate()}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            {new Date(f.fecha + "T12:00:00").toLocaleDateString("es-ES", { month: "short" })}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{nombre}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        {f.fecha && (
                          <span>{new Date(f.fecha + "T12:00:00").toLocaleDateString("es-ES", { year: "numeric", month: "long" })}</span>
                        )}
                        {f.lugar && <span>· {f.lugar}</span>}
                      </div>
                    </div>
                    {f.memoria && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <BookOpen className="w-3.5 h-3.5" />
                        {t("eventos.memory_short")}
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

function FiestasTab({ lang, user }: { lang: string; user: any }) {
  const { t } = useTranslation();
  const [section, setSection] = useState<FiestaSection>("proxima");
  const [fiestas, setFiestas] = useState<Fiesta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiestas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fiestas");
      const data = await res.json();
      setFiestas(data.items ?? []);
    } catch {
      setFiestas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiestas(); }, [fetchFiestas]);

  const proxima = fiestas.find(f => f.estado === "proxima") ?? null;
  const previstas = fiestas.filter(f => f.estado === "prevista");
  const realizadas = fiestas.filter(f => f.estado === "realizada");

  const counts = { proxima: proxima ? 1 : 0, previstas: previstas.length, realizadas: realizadas.length };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <FiestaSectionNav active={section} onChange={setSection} counts={counts} />

      {section === "proxima" && (
        proxima ? (
          <FiestaCardProxima f={proxima} lang={lang} user={user} />
        ) : (
          <div className="text-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
            {t("eventos.no_next_configured")}
          </div>
        )
      )}

      {section === "previstas" && <FiestaPrevistas fiestas={previstas} lang={lang} />}
      {section === "realizadas" && <FiestaRealizadas fiestas={realizadas} lang={lang} />}
    </div>
  );
}

function ExcursionesTab({ lang, user }: { lang: string; user: any }) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<"proxima" | "previstas" | "realizadas">("proxima");
  const [detail, setDetail] = useState<typeof EXCURSIONES[0] | null>(null);

  const proxima = EXCURSIONES.find(e => e.estado === "proxima");
  const previstas = EXCURSIONES.filter(e => e.estado === "prevista");
  const realizadas = EXCURSIONES.filter(e => e.estado === "realizada");

  if (detail) {
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> {t("eventos.back")}
        </button>
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="bg-linear-to-br from-secondary/10 to-background p-8">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${ESTADO_EXCURSION[detail.estado]?.color}`}>
              {lang === "eu" ? detail.estado : ESTADO_EXCURSION[detail.estado]?.label}
            </span>
            <h2 className="text-3xl font-bold text-foreground mt-3">{lang === "eu" ? detail.nombreEu : detail.nombre}</h2>
            <p className="text-muted-foreground mt-2">{lang === "eu" ? detail.descripcionEu : detail.descripcion}</p>
          </div>
          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-3"><Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{t("eventos.date")}</p><p className="font-semibold">{detail.fecha}</p></div></div>
              <div className="flex gap-3"><MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{t("eventos.destination")}</p><p className="font-semibold">{detail.destino}</p></div></div>
              <div className="flex gap-3"><Bus className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{t("eventos.bus_stops")}</p><p className="font-semibold">{detail.paradabus}</p></div></div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3"><Utensils className="w-5 h-5 text-secondary shrink-0 mt-0.5" /><div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{t("eventos.meal")}</p><p className="font-semibold">{detail.lugarComida}</p><p className="text-sm text-muted-foreground mt-1">{detail.menuComida}</p></div></div>
              <div className="flex gap-3"><Users className="w-5 h-5 text-secondary shrink-0 mt-0.5" /><div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{t("eventos.free_places")}</p><p className="font-semibold">{detail.plazasDisponibles}</p></div></div>
              <div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{t("eventos.price")}</p><p className="text-2xl font-extrabold text-secondary">{detail.precio}€</p></div>
            </div>
          </div>
          {detail.memoria && (
            <div className="px-8 pb-8">
              <div className="bg-muted/30 rounded-2xl p-6"><BookOpen className="w-5 h-5 text-primary mb-2" /><h3 className="font-bold text-foreground mb-2">{t("eventos.memory_excursion")}</h3><p className="text-muted-foreground">{detail.memoria}</p></div>
            </div>
          )}
          {detail.estado === "proxima" && (
            <div className="px-8 pb-8">
              {user ? <Button className="gap-2"><Users className="w-4 h-4" />{t("eventos.enroll_short")}</Button>
                : <Link href="/login"><Button>{t("eventos.access_to_enroll_short")}</Button></Link>}
            </div>
          )}
        </div>
      </div>
    );
  }

  const subTabLabel = (k: "proxima" | "previstas" | "realizadas") =>
    k === "proxima" ? t("eventos.next") : k === "previstas" ? t("eventos.subnav.previstas") : t("eventos.subnav.realizadas");

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-border">
        {(["proxima", "previstas", "realizadas"] as const).map((tab) => (
          <button key={tab} onClick={() => setSubTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${subTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {subTabLabel(tab)}
          </button>
        ))}
      </div>

      {subTab === "proxima" && proxima && (
        <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-6 cursor-pointer hover:shadow-md transition-all" onClick={() => setDetail(proxima)}>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 mb-3 inline-block">{t("eventos.next")}</span>
          <h3 className="text-2xl font-bold text-foreground mb-2">{lang === "eu" ? proxima.nombreEu : proxima.nombre}</h3>
          <p className="text-muted-foreground mb-4">{lang === "eu" ? proxima.descripcionEu : proxima.descripcion}</p>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" />{proxima.fecha}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" />{proxima.destino}</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-secondary" />{proxima.plazasDisponibles} {t("eventos.free_places_inline")}</span>
            <span className="font-bold text-secondary">{proxima.precio}€</span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm font-semibold text-primary"><ArrowRight className="w-4 h-4" />{t("eventos.see_details")}</div>
        </div>
      )}

      {subTab === "previstas" && (
        <div className="space-y-4">
          {previstas.map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all" onClick={() => setDetail(e)}>
              <div className="w-16 h-16 bg-blue-50 rounded-xl flex flex-col items-center justify-center shrink-0">
                <span className="text-xl font-extrabold text-blue-700">{new Date(e.fecha.split(" ")[2] + "-" + (["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"].indexOf(e.fecha.split(" ")[2]?.toLowerCase() ?? "") + 1).toString().padStart(2,"0") + "-01").getDate() || "?"}</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground">{lang === "eu" ? e.nombreEu : e.nombre}</h4>
                <p className="text-sm text-muted-foreground">{e.fecha} · {e.destino}</p>
              </div>
              <span className="text-secondary font-bold">{e.precio}€</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}

      {subTab === "realizadas" && (
        <div className="space-y-4">
          {realizadas.map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-border p-5 cursor-pointer hover:shadow-md transition-all" onClick={() => setDetail(e)}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">{lang === "eu" ? e.nombreEu : e.nombre}</h4>
                  <p className="text-sm text-muted-foreground">{e.fecha} · {e.destino}</p>
                </div>
                <span className="flex items-center gap-1 text-sm text-muted-foreground"><BookOpen className="w-4 h-4" />{t("eventos.with_memory")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ViajesTab({ lang, user }: { lang: string; user: any }) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<"proximo" | "previstos" | "realizados">("proximo");
  const [detail, setDetail] = useState<typeof VIAJES[0] | null>(null);

  const proximo = VIAJES.find(v => v.estado === "proximo");
  const previstos = VIAJES.filter(v => v.estado === "previsto");
  const realizados = VIAJES.filter(v => v.estado === "realizado");

  if (detail) {
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> {t("eventos.back")}
        </button>
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="bg-linear-to-br from-secondary/10 to-background p-8">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${ESTADO_EXCURSION[detail.estado]?.color}`}>
              {ESTADO_EXCURSION[detail.estado]?.label}
            </span>
            <h2 className="text-3xl font-bold text-foreground mt-3">{lang === "eu" ? detail.nombreEu : detail.nombre}</h2>
            <p className="text-muted-foreground mt-2">{lang === "eu" ? detail.descripcionEu : detail.descripcion}</p>
          </div>
          <div className="p-8 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {detail.destinos.map((d, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-3 text-center"><MapPin className="w-4 h-4 text-primary mx-auto mb-1" /><p className="text-sm font-semibold">{d}</p></div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-2xl p-4"><p className="text-xs text-muted-foreground font-bold uppercase mb-1">{t("eventos.dates")}</p><p className="font-bold">{detail.fechas}</p></div>
              <div className="bg-muted/30 rounded-2xl p-4"><p className="text-xs text-muted-foreground font-bold uppercase mb-1">{t("eventos.lodging")}</p><p className="font-bold">{detail.alojamiento}</p></div>
              <div className="bg-muted/30 rounded-2xl p-4"><p className="text-xs text-muted-foreground font-bold uppercase mb-1">{t("eventos.price")}</p><p className="text-2xl font-extrabold text-secondary">{detail.precio}€</p></div>
            </div>
            {detail.estado !== "realizado" && (
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-secondary" /><p className="text-muted-foreground">{detail.plazasDisponibles}/{detail.plazasTotal} {t("eventos.free_places_inline")}</p></div>
            )}
          </div>
          {detail.memoria && (
            <div className="px-8 pb-8"><div className="bg-muted/30 rounded-2xl p-6"><BookOpen className="w-5 h-5 text-primary mb-2" /><h3 className="font-bold mb-2">{t("eventos.memory_trip")}</h3><p className="text-muted-foreground">{detail.memoria}</p></div></div>
          )}
          {(detail.estado === "proximo") && (
            <div className="px-8 pb-8">
              {user ? <Button><Users className="w-4 h-4 mr-2" />{t("eventos.enroll_short")}</Button>
                : <Link href="/login"><Button>{t("eventos.access_to_enroll_short")}</Button></Link>}
            </div>
          )}
        </div>
      </div>
    );
  }

  const subTabLabel = (k: "proximo" | "previstos" | "realizados") =>
    k === "proximo" ? t("eventos.subnav.proximo") : k === "previstos" ? t("eventos.subnav.previstos") : t("eventos.subnav.realizados");

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-border">
        {(["proximo", "previstos", "realizados"] as const).map((tab) => (
          <button key={tab} onClick={() => setSubTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${subTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {subTabLabel(tab)}
          </button>
        ))}
      </div>

      {subTab === "proximo" && proximo && (
        <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-6 cursor-pointer hover:shadow-md transition-all" onClick={() => setDetail(proximo)}>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 mb-3 inline-block">{t("eventos.subnav.proximo")}</span>
          <h3 className="text-2xl font-bold text-foreground mb-2">{lang === "eu" ? proximo.nombreEu : proximo.nombre}</h3>
          <p className="text-muted-foreground mb-4">{lang === "eu" ? proximo.descripcionEu : proximo.descripcion}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="w-4 h-4 text-primary" />{proximo.fechas}</span>
            <span className="font-bold text-secondary text-lg">{proximo.precio}€</span>
            <span className="text-muted-foreground">{proximo.plazasDisponibles}/{proximo.plazasTotal} {t("eventos.free_places_inline")}</span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm font-semibold text-primary"><ArrowRight className="w-4 h-4" />{t("eventos.see_details")}</div>
        </div>
      )}

      {subTab === "previstos" && (
        <div className="space-y-3">
          {previstos.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all" onClick={() => setDetail(v)}>
              <div className="flex-1">
                <h4 className="font-bold text-foreground">{lang === "eu" ? v.nombreEu : v.nombre}</h4>
                <p className="text-sm text-muted-foreground">{v.fechas}</p>
              </div>
              <span className="text-secondary font-bold">{v.precio}€</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}

      {subTab === "realizados" && (
        <div className="space-y-3">
          {realizados.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-border p-5 cursor-pointer hover:shadow-md transition-all" onClick={() => setDetail(v)}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">{lang === "eu" ? v.nombreEu : v.nombre}</h4>
                  <p className="text-sm text-muted-foreground">{v.fechas}</p>
                </div>
                <span className="flex items-center gap-1 text-sm text-muted-foreground"><BookOpen className="w-4 h-4" />{t("eventos.with_memory")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Eventos() {
  const { t, lang } = useTranslation();
  const user = useStore(s => s.user);
  const [tab, setTab] = useState<Tab>("fiestas");

  const TABS: { key: Tab; labelKey: string; emoji: string }[] = [
    { key: "fiestas", labelKey: "eventos.tab.fiestas", emoji: "🎉" },
    { key: "excursiones", labelKey: "eventos.tab.excursiones", emoji: "🚌" },
    { key: "viajes", labelKey: "eventos.tab.viajes", emoji: "✈️" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-linear-to-b from-secondary/10 to-background py-16 border-b border-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-foreground mb-4">
            {t("eventos.title")}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("eventos.subtitle")}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab navigation */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-bold transition-all ${tab === tb.key ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-white border border-border text-foreground hover:border-primary/30"}`}
            >
              <span>{tb.emoji}</span>
              {t(tb.labelKey)}
            </button>
          ))}
        </div>

        {tab === "fiestas" && <FiestasTab lang={lang} user={user} />}
        {tab === "excursiones" && <ExcursionesTab lang={lang} user={user} />}
        {tab === "viajes" && <ViajesTab lang={lang} user={user} />}
      </div>
    </div>
  );
}
