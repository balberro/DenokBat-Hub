import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";
import { useState } from "react";

const mockOpenEvents = [
  { id: 1, nombre: "Excursión a San Sebastián", nombreEu: "Donostiara txangoa", fecha: "2026-04-15", lugar: "Donostia", plazas: 8, precio: "12 €" },
  { id: 2, nombre: "Cena de primavera", nombreEu: "Udaberriko afaria", fecha: "2026-04-22", lugar: "Bilbao", plazas: 20, precio: "18 €" },
  { id: 3, nombre: "Visita al Guggenheim", nombreEu: "Guggenheim bisita", fecha: "2026-05-05", lugar: "Bilbao", plazas: 3, precio: "6 €" },
];

const mockEnrolled = [
  { id: 4, nombre: "Teatro en Arriaga", nombreEu: "Antzerkia Arriagan", fecha: "2026-03-30", estado: "Confirmada" },
  { id: 5, nombre: "Taller de pintura", nombreEu: "Margotze tailerra", fecha: "2026-04-08", estado: "Lista espera" },
];

export default function MisEventos() {
  const { t, tb } = useTranslation();
  const [enrolled, setEnrolled] = useState<number[]>([]);

  const toggleEnroll = (id: number) => {
    setEnrolled((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <h1 className="text-3xl font-bold text-foreground">{t("menu.mis_eventos")}</h1>

      {/* Open for enrollment */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-foreground">{t("eventos.open_enrollment")}</h2>
        {mockOpenEvents.length === 0 ? (
          <p className="text-muted-foreground">{t("eventos.no_open")}</p>
        ) : (
          <div className="space-y-3">
            {mockOpenEvents.map((ev) => (
              <div key={ev.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-lg">{tb(ev, "nombre")}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{ev.fecha}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{ev.lugar}</span>
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{ev.plazas} {t("eventos.places")}</span>
                    <span className="font-semibold text-primary">{ev.precio}</span>
                  </div>
                </div>
                <Button
                  variant={enrolled.includes(ev.id) ? "outline" : "default"}
                  onClick={() => toggleEnroll(ev.id)}
                  className="shrink-0"
                >
                  {enrolled.includes(ev.id) ? t("eventos.cancel_enroll") : t("eventos.enroll_now")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My active enrollments */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-foreground">{t("eventos.enrolled")}</h2>
        {mockEnrolled.length === 0 ? (
          <p className="text-muted-foreground">{t("eventos.no_enrolled")}</p>
        ) : (
          <div className="space-y-3">
            {mockEnrolled.map((ev) => (
              <div key={ev.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-lg">{tb(ev, "nombre")}</p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{ev.fecha}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${ev.estado === "Confirmada" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {ev.estado === "Confirmada" ? t("inscripciones.confirmed") : t("inscripciones.waiting")}
                </span>
                <Button variant="outline" size="sm">{t("common.modify")}</Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
