import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Camera } from "lucide-react";
import { useState } from "react";

const mockActividades = [
  { id: 1, nombre: "Yoga matutino", nombreEu: "Goizeko yoga", frecuencia: "Lunes y miércoles", estado: "open", inscritos: 14, plazas: 20 },
  { id: 2, nombre: "Taller de pintura", nombreEu: "Margotze tailerra", frecuencia: "Viernes", estado: "open", inscritos: 10, plazas: 10 },
  { id: 3, nombre: "Informática básica", nombreEu: "Informatika oinarrizkoa", frecuencia: "Martes y jueves", estado: "closed", inscritos: 18, plazas: 18 },
  { id: 4, nombre: "Gimnasia suave", nombreEu: "Gimnasia leuna", frecuencia: "Diario", estado: "open", inscritos: 25, plazas: 35 },
];

const estadoStyle: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export default function AdminActividades() {
  const { t, tb } = useTranslation();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("menu.admin_actividades")}</h1>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("admin.new_activity")}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-lg text-foreground">{t("admin.new_activity")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["Nombre (ES)", "Nombre (EU)", "Frecuencia", "Lugar", "Plazas", "Precio"].map((label) => (
              <div key={label}>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">{label}</label>
                <input className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button>{t("common.save")}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {mockActividades.map((act) => (
          <div key={act.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-foreground">{tb(act, "nombre")}</p>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${estadoStyle[act.estado]}`}>
                  {act.estado === "open" ? t("common.open") : t("common.closed")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{act.frecuencia} · {act.inscritos}/{act.plazas} {t("eventos.places")}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Camera className="w-4 h-4" />{t("admin.upload_photos")}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Edit className="w-4 h-4" />{t("common.edit")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
