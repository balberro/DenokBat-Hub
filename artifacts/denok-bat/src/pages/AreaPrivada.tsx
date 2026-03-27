import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";

import MiPerfil from "./area/MiPerfil";
import MisEventos from "./area/MisEventos";
import MisInscripciones from "./area/MisInscripciones";
import MisPagos from "./area/MisPagos";
import MisSugerencias from "./area/MisSugerencias";
import MiGrupo from "./area/MiGrupo";
import InscripcionesGrupo from "./area/InscripcionesGrupo";
import AdminEventos from "./area/AdminEventos";
import AdminActividades from "./area/AdminActividades";
import GestionSocios from "./area/GestionSocios";
import AdminRoles from "./area/AdminRoles";
import AdminTextos from "./area/AdminTextos";
import SeccionContable from "./area/SeccionContable";
import SeccionAdmin from "./area/SeccionAdmin";

const allowedRoles: Record<string, string[]> = {
  "/perfil":              ["usuario","socio","delegado","directivo","contable","administrador"],
  "/mis-eventos":         ["socio"],
  "/mis-inscripciones":   ["socio"],
  "/mis-pagos":           ["socio"],
  "/mis-sugerencias":     ["socio"],
  "/mi-grupo":            ["delegado"],
  "/inscripciones-grupo": ["delegado"],
  "/admin/eventos":       ["directivo","administrador"],
  "/admin/actividades":   ["directivo","administrador"],
  "/admin/socios":        ["contable","administrador"],
  "/admin/contabilidad":  ["contable","administrador"],
  "/admin/subvenciones":  ["contable","administrador"],
  "/admin/divulgacion":   ["contable","administrador"],
  "/admin/documentacion": ["contable","administrador"],
  "/admin/roles":         ["administrador"],
  "/admin/textos":        ["administrador"],
  "/admin/proveedores":   ["administrador"],
  "/admin/odoo":          ["administrador"],
  "/admin/app":           ["administrador"],
};

const components: Record<string, React.ComponentType> = {
  "/perfil":              MiPerfil,
  "/mis-eventos":         MisEventos,
  "/mis-inscripciones":   MisInscripciones,
  "/mis-pagos":           MisPagos,
  "/mis-sugerencias":     MisSugerencias,
  "/mi-grupo":            MiGrupo,
  "/inscripciones-grupo": InscripcionesGrupo,
  "/admin/eventos":       AdminEventos,
  "/admin/actividades":   AdminActividades,
  "/admin/socios":        GestionSocios,
  "/admin/contabilidad":  SeccionContable,
  "/admin/subvenciones":  SeccionContable,
  "/admin/divulgacion":   SeccionContable,
  "/admin/documentacion": SeccionContable,
  "/admin/roles":         AdminRoles,
  "/admin/textos":        AdminTextos,
  "/admin/proveedores":   SeccionAdmin,
  "/admin/odoo":          SeccionAdmin,
  "/admin/app":           SeccionAdmin,
};

export default function AreaPrivada() {
  const user = useStore((s) => s.user);
  const { t } = useTranslation();
  const [location] = useLocation();

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 gap-6">
        <p className="text-xl text-muted-foreground">{t("auth.login_subtitle")}</p>
        <Link href="/login">
          <Button size="lg">{t("nav.login")}</Button>
        </Link>
      </div>
    );
  }

  const roles = allowedRoles[location];
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 gap-4">
        <p className="text-2xl font-bold text-foreground">Acceso restringido</p>
        <p className="text-muted-foreground">No tienes permisos para esta sección.</p>
        <Link href="/"><Button variant="outline">{t("common.back")}</Button></Link>
      </div>
    );
  }

  const Component = components[location];
  if (!Component) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-xl text-muted-foreground">{t("common.no_data")}</p>
      </div>
    );
  }

  return <Component />;
}
