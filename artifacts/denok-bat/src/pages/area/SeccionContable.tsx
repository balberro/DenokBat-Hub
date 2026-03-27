import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Download, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const secciones: Record<string, { titleKey: string; items: { label: string; labelEu: string; icon: string }[] }> = {
  "/admin/contabilidad": {
    titleKey: "menu.gestion_contable",
    items: [
      { label: "Facturación", labelEu: "Fakturaketa", icon: "📋" },
      { label: "Libro de caja", labelEu: "Kutxa-liburua", icon: "💰" },
      { label: "Balances", labelEu: "Balantzeak", icon: "⚖️" },
      { label: "Presupuestos", labelEu: "Aurrekontuak", icon: "📊" },
      { label: "Conciliación bancaria", labelEu: "Banku-kontziliazioa", icon: "🏦" },
    ],
  },
  "/admin/subvenciones": {
    titleKey: "menu.subvenciones",
    items: [
      { label: "Solicitudes activas", labelEu: "Eskabide aktiboak", icon: "📝" },
      { label: "Justificaciones pendientes", labelEu: "Zain dauden justifikazioak", icon: "⏳" },
      { label: "Subvenciones concedidas", labelEu: "Emandako laguntzak", icon: "✅" },
      { label: "Historial", labelEu: "Historia", icon: "📁" },
    ],
  },
  "/admin/divulgacion": {
    titleKey: "menu.divulgacion_admin",
    items: [
      { label: "Noticias", labelEu: "Berriak", icon: "📰" },
      { label: "Circulares", labelEu: "Zirkularrak", icon: "📢" },
      { label: "Galería de fotos", labelEu: "Argazki-galeria", icon: "🖼️" },
      { label: "Newsletter", labelEu: "Berri-buletina", icon: "✉️" },
    ],
  },
  "/admin/documentacion": {
    titleKey: "menu.documentacion",
    items: [
      { label: "Actas de reuniones", labelEu: "Bileren aktak", icon: "📄" },
      { label: "Convocatorias", labelEu: "Deialdiak", icon: "📅" },
      { label: "Solicitudes", labelEu: "Eskakizunak", icon: "📝" },
      { label: "Estatutos", labelEu: "Estatutuak", icon: "📖" },
      { label: "Contratos", labelEu: "Kontratuak", icon: "✍️" },
    ],
  },
};

export default function SeccionContable() {
  const { t, lang } = useTranslation();
  const [location] = useLocation();
  const seccion = secciones[location] ?? secciones["/admin/contabilidad"];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t(seccion.titleKey)}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-4 h-4" />{t("common.export")}</Button>
          <Button className="gap-2"><Plus className="w-4 h-4" />{t("common.create")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {seccion.items.map((item, i) => (
          <button
            key={i}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all text-left group"
          >
            <span className="text-3xl">{item.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {lang === "eu" ? item.labelEu : item.label}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <FileText className="w-3 h-3" /> {t("common.detail")}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
