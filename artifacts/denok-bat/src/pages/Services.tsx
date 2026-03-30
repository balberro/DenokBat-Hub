import { useTranslation } from "@/i18n/translations";
import { useAppServicios } from "@/hooks/use-app-api";
import { HeartPulse, Scale, Scissors, Phone } from "lucide-react";

const ICON_MAP: Record<string, any> = {
  'Scale': Scale,
  'HeartPulse': HeartPulse,
  'Scissors': Scissors,
};

export default function Services() {
  const { t, tb } = useTranslation();
  const { data, isLoading } = useAppServicios();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">{t('common.loading')}</div>;
  }

  const servicios = data?.items || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary/5 py-16 border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold text-foreground mb-4">{t('nav.services')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Servicios diseñados para facilitar tu día a día, con condiciones especiales para nuestros socios.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servicios.map((srv) => {
            const Icon = (srv.icono && ICON_MAP[srv.icono]) || HeartPulse;
            return (
              <div key={srv.id} className="bg-white p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all text-center">
                <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{tb(srv, 'nombre')}</h3>
                <p className="text-muted-foreground text-lg mb-8">{tb(srv, 'descripcion')}</p>
                <button className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-muted text-foreground font-semibold hover:bg-muted/80 transition-colors">
                  <Phone className="w-5 h-5" /> Consultar
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
