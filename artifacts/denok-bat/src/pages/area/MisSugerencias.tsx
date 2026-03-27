import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MessageSquare, ChevronRight } from "lucide-react";

const mockSugerencias = [
  { id: 1, categoria: "Actividades", texto: "Sería interesante organizar clases de baile vasco.", fecha: "2026-02-14", respuesta: "Estamos valorando la propuesta." },
  { id: 2, categoria: "Servicios", texto: "El servicio de transporte al centro de salud es muy útil, ampliar horarios.", fecha: "2026-01-28", respuesta: null },
  { id: 3, categoria: "Instalaciones", texto: "La sala de reuniones necesita mejor iluminación.", fecha: "2025-12-10", respuesta: "Gracias, ya hemos solicitado presupuesto." },
];

export default function MisSugerencias() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("menu.mis_sugerencias")}</h1>
        <Link href="/sugerencias">
          <Button className="gap-2">
            <MessageSquare className="w-4 h-4" />
            {t("common.create")}
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {mockSugerencias.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">{s.categoria}</span>
                  <span className="text-xs text-muted-foreground">{t("sugerencias.sent_at")} {s.fecha}</span>
                </div>
                <p className="text-foreground">{s.texto}</p>
                {s.respuesta ? (
                  <div className="mt-3 pl-3 border-l-2 border-primary/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{t("sugerencias.response")}</p>
                    <p className="text-sm text-foreground">{s.respuesta}</p>
                  </div>
                ) : (
                  <p className="text-xs text-yellow-600 mt-3 font-medium">{t("sugerencias.no_response")}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
