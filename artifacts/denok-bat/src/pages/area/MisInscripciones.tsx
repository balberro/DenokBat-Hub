import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Calendar, Tag } from "lucide-react";

const mockInscripciones = [
  { id: 1, nombre: "Excursión a Lekeitio", nombreEu: "Lekeitioko txangoa", tipo: "Evento", fecha: "2026-04-10", estado: "confirmed" },
  { id: 2, nombre: "Yoga matutino", nombreEu: "Goizeko yoga", tipo: "Actividad", fecha: "2026-04-01", estado: "confirmed" },
  { id: 3, nombre: "Taller de cocina", nombreEu: "Sukaldaritza tailerra", tipo: "Actividad", fecha: "2026-03-25", estado: "waiting" },
  { id: 4, nombre: "Teatro Arriaga", nombreEu: "Arriagako antzerkia", tipo: "Evento", fecha: "2026-05-12", estado: "confirmed" },
];

export default function MisInscripciones() {
  const { t, tb } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t("inscripciones.title")}</h1>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">{t("inscripciones.event")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground hidden sm:table-cell">{t("common.date")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground hidden sm:table-cell">{t("inscripciones.state")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockInscripciones.map((item) => (
              <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-foreground">{tb(item, "nombre")}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    <Tag className="w-3 h-3" />{item.tipo}
                  </div>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{item.fecha}</span>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.estado === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {item.estado === "confirmed" ? t("inscripciones.confirmed") : t("inscripciones.waiting")}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <Button variant="outline" size="sm">{t("common.modify")}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
