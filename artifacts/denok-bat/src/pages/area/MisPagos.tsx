import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const mockPagos = [
  { id: 1, concepto: "Cuota anual 2026", fecha: "2026-01-10", importe: "45.00 €", metodo: "Domiciliación", estado: "paid" },
  { id: 2, concepto: "Excursión Lekeitio", fecha: "2026-03-20", importe: "18.00 €", metodo: "Transferencia", estado: "paid" },
  { id: 3, concepto: "Teatro Arriaga", fecha: "2026-05-01", importe: "12.00 €", metodo: "Pendiente", estado: "pending" },
  { id: 4, concepto: "Taller cocina", fecha: "2026-03-25", importe: "8.00 €", metodo: "Efectivo", estado: "paid" },
];

const total = mockPagos.filter(p => p.estado === "paid").reduce((sum, p) => sum + parseFloat(p.importe), 0);

export default function MisPagos() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("pagos.title")}</h1>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {t("common.export")}
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">{t("pagos.concept")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground hidden sm:table-cell">{t("common.date")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">{t("common.amount")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground hidden sm:table-cell">{t("pagos.method")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">{t("common.status")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">{t("pagos.receipt")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockPagos.map((pago) => (
              <tr key={pago.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4 font-medium text-foreground">{pago.concepto}</td>
                <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">{pago.fecha}</td>
                <td className="px-5 py-4 font-semibold text-foreground">{pago.importe}</td>
                <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">{pago.metodo}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${pago.estado === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {pago.estado === "paid" ? t("common.paid") : t("common.pending")}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {pago.estado === "paid" && (
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">
                      <Download className="w-3.5 h-3.5" />PDF
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="bg-primary/10 rounded-xl px-6 py-3 text-right">
          <p className="text-sm text-muted-foreground">{t("common.total")} {t("common.paid")}</p>
          <p className="text-2xl font-bold text-primary">{total.toFixed(2)} €</p>
        </div>
      </div>
    </div>
  );
}
