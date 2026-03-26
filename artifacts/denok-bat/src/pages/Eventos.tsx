import { useTranslation } from "@/i18n/translations";
import { Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppEventos } from "@/hooks/use-app-api";

export default function Eventos() {
  const { t, tb } = useTranslation();
  const { data, isLoading } = useAppEventos();
  const eventos = data?.items ?? [];

  return (
    <div className="pb-20">
      <section className="py-16 bg-gradient-to-b from-secondary/10 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold mb-4 text-foreground">{t("nav.events")}</h1>
          <p className="text-xl text-muted-foreground">
            Próximos eventos y actividades especiales de la asociación
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-lg">{t("common.loading")}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {eventos.map((evento) => {
              const fecha = new Date(evento.fechaInicio);
              const dia = fecha.getDate();
              const mes = fecha.toLocaleString("es-ES", { month: "short" }).toUpperCase();
              return (
                <div key={evento.id} className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all flex">
                  <div className="w-24 bg-secondary/20 flex flex-col items-center justify-center p-4 shrink-0">
                    <span className="text-4xl font-extrabold text-secondary leading-none">{dia}</span>
                    <span className="text-sm font-bold text-muted-foreground">{mes}</span>
                  </div>
                  <div className="p-6 flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">{tb(evento, "nombre")}</h3>
                    {tb(evento, "descripcion") && (
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{tb(evento, "descripcion")}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {evento.lugar && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-primary" />
                          {evento.lugar}
                        </span>
                      )}
                      {evento.plazasDisponibles != null && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-secondary" />
                          {evento.plazasDisponibles} {t("common.spots_available")}
                        </span>
                      )}
                    </div>
                    <Button size="sm" className="mt-4 rounded-xl">{t("common.enroll")}</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
