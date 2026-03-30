import { useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Bus, Utensils, Users, ChevronLeft, ArrowRight, Image, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { useStore } from "@/store/use-store";

type Tab = "fiestas" | "excursiones" | "viajes";
type SubTab = "proxima" | "previstas" | "realizadas" | "proximo" | "previstos" | "realizados";

const FIESTAS = [
  { id: 1, nombre: "Día de Santa Águeda", nombreEu: "Santa Ageda eguna", descripcion: "Celebración tradicional con coros y procesos de Santa Águeda por las calles del municipio.", descripcionEu: "Santa Ageda bezpera ospakizuna, abesbatzekin eta prozesioarekin herriko kaleetan.", fecha: "2026-02-04", lugar: "Casco histórico", precio: 0, estado: "proxima" },
  { id: 2, nombre: "Fiesta de Primavera", nombreEu: "Udaberriko Jaia", descripcion: "Gran celebración anual con música en vivo, pintxos y actividades para toda la familia.", descripcionEu: "Urteko ospakizun nagusia, musika biziarekin, pintxoekin eta familia osoarentzako jarduerarekin.", fecha: "2026-04-19", lugar: "Plaza Mayor", precio: 5, estado: "prevista" },
  { id: 3, nombre: "Almuerzo de Hermandad", nombreEu: "Anaiarteko Bazkaria", descripcion: "Encuentro anual de todos los socios con comida tradicional vasca.", descripcionEu: "Bazkide guztien urteko topaketa euskal janari tradizionalarekin.", fecha: "2026-06-20", lugar: "Restaurante Kaia", precio: 25, estado: "prevista" },
];

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

function FiestasTab({ lang, user }: { lang: string; user: any }) {
  return (
    <div className="space-y-5">
      {FIESTAS.map((f) => (
        <div key={f.id} className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col sm:flex-row gap-5">
          <div className="w-24 h-24 rounded-2xl bg-secondary/10 flex flex-col items-center justify-center shrink-0">
            <span className="text-3xl font-extrabold text-secondary leading-none">{new Date(f.fecha).getDate()}</span>
            <span className="text-xs font-bold text-muted-foreground uppercase">
              {new Date(f.fecha).toLocaleString(lang === "eu" ? "es-ES" : "es-ES", { month: "short" })}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-xl font-bold text-foreground">{lang === "eu" ? f.nombreEu : f.nombre}</h3>
              <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${f.estado === "proxima" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                {f.estado === "proxima" ? (lang === "eu" ? "Hurrengoa" : "Próxima") : (lang === "eu" ? "Aurreikusita" : "Prevista")}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-3">{lang === "eu" ? f.descripcionEu : f.descripcion}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" />{f.lugar}</span>
              {f.precio > 0 && <span className="flex items-center gap-1.5 font-semibold text-secondary">{f.precio}€</span>}
            </div>
            {user && <Button size="sm" className="mt-4">{lang === "eu" ? "Informazioa" : "Más información"}</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExcursionesTab({ lang, user }: { lang: string; user: any }) {
  const [subTab, setSubTab] = useState<"proxima" | "previstas" | "realizadas">("proxima");
  const [detail, setDetail] = useState<typeof EXCURSIONES[0] | null>(null);

  const proxima = EXCURSIONES.find(e => e.estado === "proxima");
  const previstas = EXCURSIONES.filter(e => e.estado === "prevista");
  const realizadas = EXCURSIONES.filter(e => e.estado === "realizada");

  if (detail) {
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> {lang === "eu" ? "Itzuli" : "Volver"}
        </button>
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-secondary/10 to-background p-8">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${ESTADO_EXCURSION[detail.estado]?.color}`}>
              {lang === "eu" ? detail.estado : ESTADO_EXCURSION[detail.estado]?.label}
            </span>
            <h2 className="text-3xl font-bold text-foreground mt-3">{lang === "eu" ? detail.nombreEu : detail.nombre}</h2>
            <p className="text-muted-foreground mt-2">{lang === "eu" ? detail.descripcionEu : detail.descripcion}</p>
          </div>
          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-3"><Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{lang === "eu" ? "Data" : "Fecha"}</p><p className="font-semibold">{detail.fecha}</p></div></div>
              <div className="flex gap-3"><MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{lang === "eu" ? "Helmuga" : "Destino"}</p><p className="font-semibold">{detail.destino}</p></div></div>
              <div className="flex gap-3"><Bus className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{lang === "eu" ? "Autobus geltokiak" : "Paradas de autobús"}</p><p className="font-semibold">{detail.paradabus}</p></div></div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3"><Utensils className="w-5 h-5 text-secondary shrink-0 mt-0.5" /><div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{lang === "eu" ? "Bazkaria" : "Comida"}</p><p className="font-semibold">{detail.lugarComida}</p><p className="text-sm text-muted-foreground mt-1">{detail.menuComida}</p></div></div>
              <div className="flex gap-3"><Users className="w-5 h-5 text-secondary shrink-0 mt-0.5" /><div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{lang === "eu" ? "Plazak" : "Plazas libres"}</p><p className="font-semibold">{detail.plazasDisponibles}</p></div></div>
              <div><p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{lang === "eu" ? "Prezioa" : "Precio"}</p><p className="text-2xl font-extrabold text-secondary">{detail.precio}€</p></div>
            </div>
          </div>
          {detail.memoria && (
            <div className="px-8 pb-8">
              <div className="bg-muted/30 rounded-2xl p-6"><BookOpen className="w-5 h-5 text-primary mb-2" /><h3 className="font-bold text-foreground mb-2">{lang === "eu" ? "Memoria" : "Memoria de la excursión"}</h3><p className="text-muted-foreground">{detail.memoria}</p></div>
            </div>
          )}
          {detail.estado === "proxima" && (
            <div className="px-8 pb-8">
              {user ? <Button className="gap-2"><Users className="w-4 h-4" />{lang === "eu" ? "Izena eman" : "Inscribirme"}</Button>
                : <Link href="/login"><Button>{lang === "eu" ? "Sartu izena emateko" : "Accede para inscribirte"}</Button></Link>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-border">
        {(["proxima", "previstas", "realizadas"] as const).map((tab) => (
          <button key={tab} onClick={() => setSubTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${subTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab === "proxima" ? (lang === "eu" ? "Hurrengoa" : "Próxima") : tab === "previstas" ? (lang === "eu" ? "Aurreikusiak" : "Previstas") : (lang === "eu" ? "Egindakoak" : "Realizadas")}
          </button>
        ))}
      </div>

      {subTab === "proxima" && proxima && (
        <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-6 cursor-pointer hover:shadow-md transition-all" onClick={() => setDetail(proxima)}>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 mb-3 inline-block">{lang === "eu" ? "Hurrengoa" : "Próxima"}</span>
          <h3 className="text-2xl font-bold text-foreground mb-2">{lang === "eu" ? proxima.nombreEu : proxima.nombre}</h3>
          <p className="text-muted-foreground mb-4">{lang === "eu" ? proxima.descripcionEu : proxima.descripcion}</p>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" />{proxima.fecha}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" />{proxima.destino}</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-secondary" />{proxima.plazasDisponibles} {lang === "eu" ? "plaza libre" : "plazas libres"}</span>
            <span className="font-bold text-secondary">{proxima.precio}€</span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm font-semibold text-primary"><ArrowRight className="w-4 h-4" />{lang === "eu" ? "Xehetasunak ikusi" : "Ver detalles e inscripción"}</div>
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
                <span className="flex items-center gap-1 text-sm text-muted-foreground"><BookOpen className="w-4 h-4" />{lang === "eu" ? "Memoria" : "Con memoria"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ViajesTab({ lang, user }: { lang: string; user: any }) {
  const [subTab, setSubTab] = useState<"proximo" | "previstos" | "realizados">("proximo");
  const [detail, setDetail] = useState<typeof VIAJES[0] | null>(null);

  const proximo = VIAJES.find(v => v.estado === "proximo");
  const previstos = VIAJES.filter(v => v.estado === "previsto");
  const realizados = VIAJES.filter(v => v.estado === "realizado");

  if (detail) {
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> {lang === "eu" ? "Itzuli" : "Volver"}
        </button>
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-secondary/10 to-background p-8">
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
              <div className="bg-muted/30 rounded-2xl p-4"><p className="text-xs text-muted-foreground font-bold uppercase mb-1">{lang === "eu" ? "Datak" : "Fechas"}</p><p className="font-bold">{detail.fechas}</p></div>
              <div className="bg-muted/30 rounded-2xl p-4"><p className="text-xs text-muted-foreground font-bold uppercase mb-1">{lang === "eu" ? "Ostatua" : "Alojamiento"}</p><p className="font-bold">{detail.alojamiento}</p></div>
              <div className="bg-muted/30 rounded-2xl p-4"><p className="text-xs text-muted-foreground font-bold uppercase mb-1">{lang === "eu" ? "Prezioa" : "Precio"}</p><p className="text-2xl font-extrabold text-secondary">{detail.precio}€</p></div>
            </div>
            {detail.estado !== "realizado" && (
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-secondary" /><p className="text-muted-foreground">{detail.plazasDisponibles}/{detail.plazasTotal} {lang === "eu" ? "plaza libre" : "plazas libres"}</p></div>
            )}
          </div>
          {detail.memoria && (
            <div className="px-8 pb-8"><div className="bg-muted/30 rounded-2xl p-6"><BookOpen className="w-5 h-5 text-primary mb-2" /><h3 className="font-bold mb-2">{lang === "eu" ? "Memoria" : "Memoria del viaje"}</h3><p className="text-muted-foreground">{detail.memoria}</p></div></div>
          )}
          {(detail.estado === "proximo") && (
            <div className="px-8 pb-8">
              {user ? <Button><Users className="w-4 h-4 mr-2" />{lang === "eu" ? "Izena eman" : "Inscribirme"}</Button>
                : <Link href="/login"><Button>{lang === "eu" ? "Sartu izena emateko" : "Accede para inscribirte"}</Button></Link>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-border">
        {(["proximo", "previstos", "realizados"] as const).map((tab) => (
          <button key={tab} onClick={() => setSubTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${subTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab === "proximo" ? (lang === "eu" ? "Hurrengoa" : "Próximo") : tab === "previstos" ? (lang === "eu" ? "Aurreikusiak" : "Previstos") : (lang === "eu" ? "Egindakoak" : "Realizados")}
          </button>
        ))}
      </div>

      {subTab === "proximo" && proximo && (
        <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-6 cursor-pointer hover:shadow-md transition-all" onClick={() => setDetail(proximo)}>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 mb-3 inline-block">{lang === "eu" ? "Hurrengoa" : "Próximo"}</span>
          <h3 className="text-2xl font-bold text-foreground mb-2">{lang === "eu" ? proximo.nombreEu : proximo.nombre}</h3>
          <p className="text-muted-foreground mb-4">{lang === "eu" ? proximo.descripcionEu : proximo.descripcion}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="w-4 h-4 text-primary" />{proximo.fechas}</span>
            <span className="font-bold text-secondary text-lg">{proximo.precio}€</span>
            <span className="text-muted-foreground">{proximo.plazasDisponibles}/{proximo.plazasTotal} {lang === "eu" ? "libre" : "plazas libres"}</span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm font-semibold text-primary"><ArrowRight className="w-4 h-4" />{lang === "eu" ? "Xehetasunak ikusi" : "Ver detalles e inscripción"}</div>
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
                <span className="flex items-center gap-1 text-sm text-muted-foreground"><BookOpen className="w-4 h-4" />{lang === "eu" ? "Memoria" : "Con memoria"}</span>
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

  const TABS: { key: Tab; label: string; labelEu: string; emoji: string }[] = [
    { key: "fiestas", label: "Fiestas", labelEu: "Festak", emoji: "🎉" },
    { key: "excursiones", label: "Excursiones", labelEu: "Txangoak", emoji: "🚌" },
    { key: "viajes", label: "Viajes", labelEu: "Bidaiak", emoji: "✈️" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-b from-secondary/10 to-background py-16 border-b border-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-foreground mb-4">
            {lang === "eu" ? "Ekitaldiak" : "Eventos"}
          </h1>
          <p className="text-xl text-muted-foreground">
            {lang === "eu" ? "Festak, txangoak eta bidaiak bazkideen eskura" : "Fiestas, excursiones y viajes para todos los socios"}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab navigation */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-bold transition-all ${tab === t.key ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-white border border-border text-foreground hover:border-primary/30"}`}
            >
              <span>{t.emoji}</span>
              {lang === "eu" ? t.labelEu : t.label}
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
