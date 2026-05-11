import { useTranslation } from "@/i18n/translations";
import { useStore, getUserRoles } from "@/store/use-store";
import { useLocation, Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Calendar, Activity } from "lucide-react";

const API_ROOT = "/api";

type PagoDashboard = {
  estado?: string | null;
  importe?: string | number | null;
};

type InscripcionDashboard = {
  estado?: string | null;
  pagos?: PagoDashboard[];
};

export default function Dashboard() {
  const { t } = useTranslation();
  const user = useStore(s => s.user);
  const token = useStore(s => s.token);
  const setUser = useStore(s => s.setUser);
  const [, setLocation] = useLocation();
  const [inscripciones, setInscripciones] = useState<InscripcionDashboard[]>([]);
  const [loadingCuenta, setLoadingCuenta] = useState(false);
  const [errorCuenta, setErrorCuenta] = useState("");

  useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  useEffect(() => {
    if (!user || !token) return;
    (async () => {
      setLoadingCuenta(true);
      setErrorCuenta("");
      try {
        const r = await fetch(`${API_ROOT}/inscripciones`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error("No se pudo cargar el estado de cuenta");
        const d = await r.json();
        setInscripciones(Array.isArray(d?.items) ? d.items : []);
      } catch {
        setInscripciones([]);
        setErrorCuenta("No se pudo cargar el estado de cuenta.");
      } finally {
        setLoadingCuenta(false);
      }
    })();
  }, [user, token]);

  const cuentaResumen = useMemo(() => {
    let pagosPendientes = 0;
    let totalPendiente = 0;
    let compromisosPendientes = 0;

    for (const inscripcion of inscripciones) {
      if (inscripcion.estado && inscripcion.estado !== "confirmada") {
        compromisosPendientes += 1;
      }
      const pagos = Array.isArray(inscripcion.pagos) ? inscripcion.pagos : [];
      for (const pago of pagos) {
        if (String(pago.estado ?? "").toLowerCase() === "pendiente") {
          pagosPendientes += 1;
          const amount = Number(pago.importe ?? 0);
          if (Number.isFinite(amount)) totalPendiente += amount;
        }
      }
    }

    return { pagosPendientes, compromisosPendientes, totalPendiente };
  }, [inscripciones]);

  const showCuentaWidget = cuentaResumen.pagosPendientes > 0 || cuentaResumen.compromisosPendientes > 0;

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
              <div className="flex flex-wrap gap-2 mt-2">
                {getUserRoles(user).map(role => (
                  <span key={role} className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-semibold capitalize tracking-wide">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-12" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-2" /> {t('nav.logout')}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold mb-8">Resumen de actividad</h2>

        {loadingCuenta && (
          <div className="mb-6 rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
            Cargando estado de cuenta...
          </div>
        )}
        {errorCuenta && (
          <div className="mb-6 rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
            {errorCuenta}
          </div>
        )}
        {!loadingCuenta && !errorCuenta && showCuentaWidget && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-amber-900">Estado de Cuenta</h3>
                <p className="text-sm text-amber-800 mt-1">
                  Tienes compromisos pendientes.
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-amber-900">
                  {cuentaResumen.pagosPendientes > 0 && (
                    <span className="rounded-full bg-white/70 border border-amber-200 px-3 py-1">
                      Pagos pendientes: <strong>{cuentaResumen.pagosPendientes}</strong>
                    </span>
                  )}
                  {cuentaResumen.totalPendiente > 0 && (
                    <span className="rounded-full bg-white/70 border border-amber-200 px-3 py-1">
                      Total pendiente: <strong>{cuentaResumen.totalPendiente.toFixed(2)}€</strong>
                    </span>
                  )}
                  {cuentaResumen.compromisosPendientes > 0 && (
                    <span className="rounded-full bg-white/70 border border-amber-200 px-3 py-1">
                      Otros compromisos: <strong>{cuentaResumen.compromisosPendientes}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/mis-pagos">
                  <Button size="sm">Ver pagos</Button>
                </Link>
                <Link href="/mis-inscripciones">
                  <Button size="sm" variant="outline">Ver compromisos</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
        
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
        {getUserRoles(user).includes('directivo') && (
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
