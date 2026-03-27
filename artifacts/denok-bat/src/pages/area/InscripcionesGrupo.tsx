import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Download, Printer, Mail } from "lucide-react";

const mockEvento = {
  nombre: "Excursión a Lekeitio",
  nombreEu: "Lekeitioko txangoa",
  fecha: "2026-04-10",
  precio: "18.00 €",
};

const mockInscritos = [
  { id: 1, nombre: "María García López", genero: "F", pagado: "18.00 €", parada: "Bilbao Centro", subactividad: "—", observaciones: "" },
  { id: 2, nombre: "José Martínez Ruiz", genero: "M", pagado: "18.00 €", parada: "Basurto", subactividad: "—", observaciones: "Silla de ruedas" },
  { id: 3, nombre: "Ana Fernández Vega", genero: "F", pagado: "0.00 €", parada: "Bilbao Centro", subactividad: "—", observaciones: "" },
  { id: 4, nombre: "Carmen Jiménez Osa", genero: "F", pagado: "18.00 €", parada: "Rekalde", subactividad: "—", observaciones: "" },
];

export default function InscripcionesGrupo() {
  const { t, tb } = useTranslation();
  const totalPagado = mockInscritos.reduce((s, i) => s + parseFloat(i.pagado), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t("grupo_inscripcion.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Mail className="w-4 h-4" />Email</Button>
          <Button variant="outline" size="sm" className="gap-1.5"><Printer className="w-4 h-4" />{t("common.print")}</Button>
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-4 h-4" />{t("common.export")}</Button>
        </div>
      </div>

      {/* Evento header */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6">
        <p className="font-bold text-foreground text-lg">{tb(mockEvento, "nombre")}</p>
        <p className="text-sm text-muted-foreground">{t("common.date")}: {mockEvento.fecha} · {t("common.amount")}: {mockEvento.precio}</p>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.name")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.gender")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.paid")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("grupo_inscripcion.bus_stop")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("grupo_inscripcion.subactivity")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("grupo_inscripcion.observations")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockInscritos.map((i) => (
              <tr key={i.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{i.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.genero}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${parseFloat(i.pagado) > 0 ? "text-green-600" : "text-red-500"}`}>{i.pagado}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{i.parada}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.subactividad}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.observaciones || "—"}</td>
                <td className="px-4 py-3">
                  <Button variant="outline" size="sm">{t("common.modify")}</Button>
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-bold">
              <td className="px-4 py-3" colSpan={2}>{t("grupo_inscripcion.total_line")}</td>
              <td className="px-4 py-3 text-green-700">{totalPagado.toFixed(2)} €</td>
              <td colSpan={4} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
