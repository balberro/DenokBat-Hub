import { useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Clock, Users, Trophy, CalendarDays, UserCheck, ChevronLeft, ArrowRight } from "lucide-react";
import { useStore } from "@/store/use-store";
import { Link } from "wouter";

type EstadoActividad = "prevista" | "abierta" | "en_curso" | "terminada";

interface ActividadDetalle {
  slug: string;
  nombre: string;
  nombreEu: string;
  emoji: string;
  descripcion: string;
  descripcionEu: string;
  monitor: string;
  horario: string;
  calendario: string;
  estado: EstadoActividad;
  precioInscripcion?: number;
  plazasDisponibles?: number;
  participantes?: string[];
  puntuaciones?: { nombre: string; puntos: number }[];
  memoria?: string;
  proximaFecha?: string;
}

const ACTIVIDADES: ActividadDetalle[] = [
  {
    slug: "yoga",
    nombre: "Yoga",
    nombreEu: "Yoga",
    emoji: "🧘",
    descripcion: "Clases de yoga suave adaptado para personas mayores. Mejora la flexibilidad, el equilibrio y la relajación a través de posturas accesibles y técnicas de respiración.",
    descripcionEu: "Adinekoentzat egokitutako yoga leuna. Malgutasuna, oreka eta erlaxazioa hobetzen du postura irisgarrien eta arnas tekniken bidez.",
    monitor: "Amaia Larrea",
    horario: "Lunes y Miércoles · 10:00-11:00h",
    calendario: "Todo el año salvo agosto y festivos",
    estado: "en_curso",
    participantes: ["María García", "José Martínez", "Ana Fernández", "Luis González", "Carmen López", "Marta Sánchez", "Juan Pérez", "Elena Kova", "Rosa Benito", "Pilar Castro"],
  },
  {
    slug: "gimnasia",
    nombre: "Gimnasia",
    nombreEu: "Gimnasia",
    emoji: "🤸",
    descripcion: "Ejercicios físicos adaptados para mantener la movilidad, fuerza y coordinación. Las sesiones combinan calentamiento, ejercicios de fuerza suave y estiramientos.",
    descripcionEu: "Mugikortasuna, indarra eta koordinazioa mantentzeko gorputz-ariketa moldatuak. Saioek beroketa, indar ariketak eta luzapenak konbinatzen dituzte.",
    monitor: "Begoña Urrutia",
    horario: "Martes y Viernes · 9:30-10:30h",
    calendario: "Septiembre a junio, excepto festivos",
    estado: "en_curso",
    participantes: ["Ana Fernández", "Luis González", "Carmen López", "Pedro Ramírez", "Marta Sánchez", "Juan Pérez", "Elena Kova", "Rosa Benito"],
  },
  {
    slug: "taichi",
    nombre: "Tai Chi",
    nombreEu: "Tai Chi",
    emoji: "🥋",
    descripcion: "Arte marcial suave de origen chino que mejora el equilibrio, la coordinación y la concentración. Movimientos lentos y continuos que fortalecen el cuerpo y la mente.",
    descripcionEu: "Txinako arte martial leuna, orekan, koordinazioan eta kontzentrazioan hobetzen duena. Mugimendu motel eta jarraituak gorputza eta burua indartzen dituzte.",
    monitor: "Jon Eguia",
    horario: "Lunes y Miércoles · 11:30-12:30h",
    calendario: "Todo el año",
    estado: "abierta",
    precioInscripcion: 0,
    plazasDisponibles: 7,
  },
  {
    slug: "montanismo",
    nombre: "Montañismo",
    nombreEu: "Mendizaletasuna",
    emoji: "🏔️",
    descripcion: "Rutas de senderismo y montañismo por los entornos naturales del País Vasco. Actividades para distintos niveles de dificultad, siempre con guía experimentado.",
    descripcionEu: "Euskal Herriko ingurune naturaletako mendi-ibilaldiak. Zailtasun maila desberdinetako jarduerak, beti gida esperientziadunarekin.",
    monitor: "Patxi Mendibil",
    horario: "Primer y tercer sábado de cada mes · 9:00h",
    calendario: "Todo el año (con suspensión por mal tiempo)",
    estado: "abierta",
    precioInscripcion: 5,
    plazasDisponibles: 18,
  },
  {
    slug: "mus",
    nombre: "Mus",
    nombreEu: "Mus",
    emoji: "🃏",
    descripcion: "El juego de cartas más popular del País Vasco. Partidas semanales y torneo anual. Abierto a todos los niveles, con clases para principiantes.",
    descripcionEu: "Euskal Herriko karta-jokorik ezagunena. Asteko partida eta urteko txapelketa. Maila guztietarako irekia, hasiberrientzako klasekin.",
    monitor: "Mikel Arteaga (árbitro)",
    horario: "Jueves y Sábado · 16:00-19:00h",
    calendario: "Todo el año",
    estado: "abierta",
    precioInscripcion: 0,
    plazasDisponibles: 12,
    puntuaciones: [
      { nombre: "María G. / José M.", puntos: 847 },
      { nombre: "Ana F. / Luis G.", puntos: 763 },
      { nombre: "Carmen L. / Pedro R.", puntos: 701 },
      { nombre: "Marta S. / Juan P.", puntos: 688 },
      { nombre: "Elena K. / Rosa B.", puntos: 654 },
    ],
  },
];

const ESTADO_CONFIG: Record<EstadoActividad, { label: string; labelEu: string; color: string }> = {
  prevista: { label: "Prevista", labelEu: "Aurreikusita", color: "bg-blue-100 text-blue-700" },
  abierta: { label: "Abierta", labelEu: "Irekia", color: "bg-green-100 text-green-700" },
  en_curso: { label: "En curso", labelEu: "Martxan", color: "bg-primary/10 text-primary" },
  terminada: { label: "Terminada", labelEu: "Amaituta", color: "bg-muted text-muted-foreground" },
};

function EstadoBadge({ estado, lang }: { estado: EstadoActividad; lang: string }) {
  const cfg = ESTADO_CONFIG[estado];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${cfg.color}`}>
      {lang === "eu" ? cfg.labelEu : cfg.label}
    </span>
  );
}

function ActividadPage({ act, lang, user, onBack }: { act: ActividadDetalle; lang: string; user: any; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ChevronLeft className="w-5 h-5" /> {lang === "eu" ? "Itzuli" : "Volver"}
      </button>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-10 flex items-center gap-6">
          <span className="text-7xl">{act.emoji}</span>
          <div>
            <h1 className="text-4xl font-extrabold text-foreground">{lang === "eu" ? act.nombreEu : act.nombre}</h1>
            <div className="mt-2"><EstadoBadge estado={act.estado} lang={lang} /></div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Description */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-3">{lang === "eu" ? "Zer da?" : "En qué consiste"}</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{lang === "eu" ? act.descripcionEu : act.descripcion}</p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-2xl p-5">
              <UserCheck className="w-5 h-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">{lang === "eu" ? "Monitora" : "Monitor/a"}</p>
              <p className="font-bold text-foreground">{act.monitor}</p>
            </div>
            <div className="bg-muted/30 rounded-2xl p-5">
              <Clock className="w-5 h-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">{lang === "eu" ? "Ordutegia" : "Horario"}</p>
              <p className="font-bold text-foreground">{act.horario}</p>
            </div>
            <div className="bg-muted/30 rounded-2xl p-5">
              <CalendarDays className="w-5 h-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">{lang === "eu" ? "Egutegia" : "Calendario"}</p>
              <p className="font-bold text-foreground">{act.calendario}</p>
            </div>
          </div>

          {/* Estado: ABIERTA */}
          {act.estado === "abierta" && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-green-800 mb-3">{lang === "eu" ? "Izena emateko aukera" : "Inscripción abierta"}</h2>
              {act.precioInscripcion !== undefined && act.precioInscripcion > 0 && (
                <p className="text-green-700 mb-2">
                  {lang === "eu" ? "Prezioa" : "Precio"}: <strong>{act.precioInscripcion}€</strong>
                </p>
              )}
              {act.plazasDisponibles !== undefined && (
                <p className="text-green-700 mb-4">
                  {lang === "eu" ? "Libre daude" : "Plazas disponibles"}: <strong>{act.plazasDisponibles}</strong>
                </p>
              )}
              {user ? (
                <Button className="gap-2">{lang === "eu" ? "Izena eman" : "Inscribirme"}</Button>
              ) : (
                <Link href="/login"><Button>{lang === "eu" ? "Sartu izena emateko" : "Accede para inscribirte"}</Button></Link>
              )}
            </div>
          )}

          {/* Estado: EN CURSO — lista de participantes */}
          {act.estado === "en_curso" && act.participantes && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {lang === "eu" ? "Parte-hartzaileak" : "Participantes"}
              </h2>
              {/* Mus scores */}
              {act.puntuaciones ? (
                <div className="space-y-2">
                  {act.puntuaciones.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/30 rounded-xl px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">{i + 1}</span>
                        <span className="font-medium text-foreground">{p.nombre}</span>
                      </div>
                      <span className="font-bold text-primary">{p.puntos} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {act.participantes.map((p, i) => (
                    <div key={i} className="bg-muted/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground">{p}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Estado: TERMINADA */}
          {act.estado === "terminada" && (
            <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-secondary" />
                <h2 className="text-lg font-bold text-foreground">{lang === "eu" ? "Memoria" : "Memoria de la actividad"}</h2>
              </div>
              <p className="text-muted-foreground">{act.memoria ?? (lang === "eu" ? "Memoria prestatzeko." : "La memoria está en preparación.")}</p>
              {act.proximaFecha && (
                <p className="text-sm text-muted-foreground mt-2">
                  {lang === "eu" ? "Hurrengo saioa" : "Próxima edición"}: <strong>{act.proximaFecha}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Activities() {
  const { t, lang } = useTranslation();
  const user = useStore(s => s.user);
  const [selected, setSelected] = useState<ActividadDetalle | null>(null);

  if (selected) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <ActividadPage act={selected} lang={lang} user={user} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-b from-primary/8 to-background py-16 border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-foreground mb-4">
            {lang === "eu" ? "Zahartze Aktiboa" : "Envejecimiento Activo"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {lang === "eu"
              ? "Aktibo egon, gauza berriak ikasi eta sozializatu elkartearekin."
              : "Mantente activo, aprende cosas nuevas y socializa con la asociación."}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ACTIVIDADES.map((act) => (
            <button
              key={act.slug}
              onClick={() => setSelected(act)}
              className="bg-white rounded-3xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all text-left group"
            >
              <div className="h-36 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <span className="text-6xl group-hover:scale-110 transition-transform duration-300">{act.emoji}</span>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-2xl font-bold text-foreground">{lang === "eu" ? act.nombreEu : act.nombre}</h3>
                  <EstadoBadge estado={act.estado} lang={lang} />
                </div>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                  {lang === "eu" ? act.descripcionEu : act.descripcion}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{act.horario}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                  {lang === "eu" ? "Xehetasunak ikusi" : "Ver detalles"} <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
