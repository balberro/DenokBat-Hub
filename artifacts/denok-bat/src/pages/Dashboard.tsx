import { useTranslation } from "@/i18n/translations";
import { useStore } from "@/store/use-store";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Calendar, Activity } from "lucide-react";

export default function Dashboard() {
  const { t } = useTranslation();
  const user = useStore(s => s.user);
  const setUser = useStore(s => s.setUser);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  if (!user) return null;

  const handleLogout = () => {
    setUser(null);
    setLocation('/');
  };

  return (
    <div className="min-h-[80vh] bg-background pb-24">
      <div className="bg-foreground text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-3xl font-bold shadow-lg">
              {user.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-1">¡Hola, {user.name}!</h1>
              <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-semibold capitalize tracking-wide">
                Rol: {user.role}
              </span>
            </div>
          </div>
          <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-12" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-2" /> {t('nav.logout')}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold mb-8">Resumen de actividad</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-border shadow-sm flex items-start gap-4">
            <div className="p-4 bg-primary/10 text-primary rounded-2xl"><Activity className="w-8 h-8" /></div>
            <div>
              <p className="text-muted-foreground text-lg mb-1">Mis Actividades</p>
              <p className="text-3xl font-bold">2</p>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-3xl border border-border shadow-sm flex items-start gap-4">
            <div className="p-4 bg-secondary/20 text-secondary-foreground rounded-2xl"><Calendar className="w-8 h-8" /></div>
            <div>
              <p className="text-muted-foreground text-lg mb-1">Próximos Eventos</p>
              <p className="text-3xl font-bold">1</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-border shadow-sm flex items-start gap-4">
            <div className="p-4 bg-muted text-foreground rounded-2xl"><UserIcon className="w-8 h-8" /></div>
            <div>
              <p className="text-muted-foreground text-lg mb-1">Estado de Cuota</p>
              <p className="text-xl font-bold text-green-600">Al día</p>
            </div>
          </div>
        </div>

        {/* Role specific content mock */}
        {user.role === 'directivo' && (
          <div className="mt-12 bg-accent/30 p-8 rounded-3xl border border-accent">
            <h3 className="text-2xl font-bold mb-4 text-accent-foreground">Panel Directivo</h3>
            <p className="text-lg">Opciones de gestión de asociación (mockup).</p>
            <div className="flex gap-4 mt-6">
              <Button>Crear Actividad</Button>
              <Button variant="outline">Gestionar Eventos</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
