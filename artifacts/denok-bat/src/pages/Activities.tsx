import { useTranslation } from "@/i18n/translations";
import { useAppActividades } from "@/hooks/use-app-api";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users } from "lucide-react";
import { useStore } from "@/store/use-store";
import { Link } from "wouter";

export default function Activities() {
  const { t, tb } = useTranslation();
  const { data, isLoading } = useAppActividades();
  const user = useStore(s => s.user);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">{t('common.loading')}</div>;
  }

  const actividades = data?.items || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary/5 py-16 border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-foreground mb-4">{t('nav.activities')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">Descubre todas las actividades que tenemos preparadas para ti. Mantente activo, aprende cosas nuevas y socializa.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {actividades.map((act) => (
            <div key={act.id} className="bg-white rounded-3xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all flex flex-col h-full">
              {/* diverse activities for seniors photo */}
              <img src="https://pixabay.com/get/g373617f4053c6e0cd9d41313dce984317c9d13a7707e750f579f8975a526346325170b7045b25556530e94d4c64a0e4770916fdc0a3e2463fad9a032521a4333_1280.jpg" alt="Actividad" className="w-full h-48 object-cover" />
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-bold">
                    {act.categoria}
                  </span>
                  {act.estado === 'cerrada' && (
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold">{t('common.full')}</span>
                  )}
                </div>
                
                <h3 className="text-2xl font-bold mb-3">{tb(act, 'nombre')}</h3>
                <p className="text-muted-foreground text-lg mb-6 flex-1">{tb(act, 'descripcion')}</p>
                
                <div className="space-y-3 mb-6 bg-muted/50 p-4 rounded-xl">
                  <div className="flex items-center gap-3 text-muted-foreground font-medium">
                    <Clock className="w-5 h-5 text-primary" /> {act.horario || 'Horario a convenir'}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground font-medium">
                    <Users className="w-5 h-5 text-primary" /> {act.plazasDisponibles} {t('common.spots_available')}
                  </div>
                </div>

                {user ? (
                  <Button 
                    className="w-full text-lg h-14" 
                    disabled={act.estado === 'cerrada' || act.inscrito}
                    variant={act.inscrito ? "outline" : "default"}
                  >
                    {act.inscrito ? t('common.enrolled') : t('common.enroll')}
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button variant="outline" className="w-full text-lg h-14">
                      {t('nav.login')} para inscribirse
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
