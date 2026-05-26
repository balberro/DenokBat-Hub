import { useStore, getUserRoles } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import MiPerfil from "./area/MiPerfil";
import MisEventos from "./area/MisEventos";
import MisInscripciones from "./area/MisInscripciones";
import MisPagos from "./area/MisPagos";
import MisSugerencias from "./area/MisSugerencias";
import MiGrupo from "./area/MiGrupo";
import InscripcionesGrupo from "./area/InscripcionesGrupo";
import PagosGrupo from "./area/PagosGrupo";
import AdminEventos from "./area/AdminEventos";
import AdminActividades from "./area/AdminActividades";
import DatosAsociacion from "./area/DatosAsociacion";
import GestionSocios from "./area/GestionSocios";
import AdminRoles from "./area/AdminRoles";
import AdminTextos from "./area/AdminTextos";
import AdminDB from "./area/AdminDB";
import SeccionContable from "./area/SeccionContable";
import SeccionAdmin from "./area/SeccionAdmin";
import AdminNosotros from "./area/AdminNosotros";
import AdminGestionSugerencias from "./area/AdminGestionSugerencias";
import BuzonPropuestas from "./area/BuzonPropuestas";
import GestionConvocatorias from "./area/GestionConvocatorias";
import GestionActas from "./area/GestionActas";
import HistorialActas from "./area/HistorialActas";
import GestionExpedientes from "./area/GestionExpedientes";
import SubvencionesNueva from "./area/SubvencionesNueva";
import SubvencionesEnCurso from "./area/SubvencionesEnCurso";
import SubvencionesHistorial from "./area/SubvencionesHistorial";

const allowedRoles: Record<string, string[]> = {
  "/perfil":              ["usuario","socio","delegado","directivo","contable","administrador"],
  "/mis-eventos":         ["socio"],
  "/mis-inscripciones":   ["socio"],
  "/mis-pagos":           ["socio"],
  "/mis-sugerencias":     ["socio"],
  "/mi-grupo":            ["delegado"],
  "/inscripciones-grupo": ["delegado"],
  "/pagos-grupo":         ["delegado","contable","administrador"],
  "/admin/eventos":       ["directivo","administrador"],
  "/admin/actividades":   ["directivo","administrador"],
  "/admin/nosotros":      ["directivo","administrador"],
  "/admin/sugerencias":   ["directivo"],
  "/admin/propuestas-junta": ["directivo"],
  "/admin/convocatorias": ["directivo", "contable"],
  "/admin/actas":         ["directivo", "contable"],
  "/historial-actas":     ["socio","delegado","directivo","contable","administrador"],
  "/admin/expedientes":   ["directivo", "contable"],
  "/admin/socios":        ["contable","administrador"],
  "/admin/datos-asociacion": ["contable", "administrador"],
  "/admin/contabilidad":  ["contable","administrador"],
  "/admin/subvenciones":  ["contable","administrador"],
  "/admin/subvenciones/nueva": ["contable","administrador"],
  "/admin/subvenciones/en-curso": ["contable","administrador"],
  "/admin/subvenciones/historial": ["contable","administrador"],
  "/admin/divulgacion":   ["contable","administrador"],
  "/admin/documentacion": ["contable","administrador"],
  "/admin/roles":         ["administrador"],
  "/admin/textos":        ["administrador"],
  "/admin/proveedores":   ["administrador"],
  "/admin/odoo":          ["administrador"],
  "/admin/app":           ["administrador"],
  "/admin/footer":        ["administrador"],
  "/admin/privacidad":    ["administrador"],
  "/admin/database":      ["administrador"],
};

const components: Record<string, React.ComponentType> = {
  "/perfil":              MiPerfil,
  "/mis-eventos":         MisEventos,
  "/mis-inscripciones":   MisInscripciones,
  "/mis-pagos":           MisPagos,
  "/mis-sugerencias":     MisSugerencias,
  "/mi-grupo":            MiGrupo,
  "/inscripciones-grupo": InscripcionesGrupo,
  "/pagos-grupo":         PagosGrupo,
  "/admin/eventos":       AdminEventos,
  "/admin/actividades":   AdminActividades,
  "/admin/nosotros":      AdminNosotros,
  "/admin/sugerencias":   AdminGestionSugerencias,
  "/admin/propuestas-junta": BuzonPropuestas,
  "/admin/convocatorias": GestionConvocatorias,
  "/admin/actas":         GestionActas,
  "/historial-actas":     HistorialActas,
  "/admin/expedientes":   GestionExpedientes,
  "/admin/socios":        GestionSocios,
  "/admin/datos-asociacion": DatosAsociacion,
  "/admin/contabilidad":  SeccionContable,
  "/admin/subvenciones":  SeccionContable,
  "/admin/subvenciones/nueva": SubvencionesNueva,
  "/admin/subvenciones/en-curso": SubvencionesEnCurso,
  "/admin/subvenciones/historial": SubvencionesHistorial,
  "/admin/divulgacion":   SeccionContable,
  "/admin/documentacion": SeccionContable,
  "/admin/roles":         AdminRoles,
  "/admin/textos":        AdminTextos,
  "/admin/proveedores":   SeccionAdmin,
  "/admin/odoo":          SeccionAdmin,
  "/admin/app":           SeccionAdmin,
  "/admin/footer":        SeccionAdmin,
  "/admin/privacidad":    SeccionAdmin,
  "/admin/database":      AdminDB,
};

/**
 * Botón "Volver" para páginas accedidas desde el menú de usuario.
 * Usa el historial del navegador si existe; en su defecto, lleva a la home.
 */
function BackButton() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t("common.back")}
      >
        <ArrowLeft className="w-4 h-4" />
        {t("common.back")}
      </button>
    </div>
  );
}

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
  if (roles && !getUserRoles(user).some(r => roles.includes(r))) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 gap-4">
        <p className="text-2xl font-bold text-foreground">{t("area.restricted")}</p>
        <p className="text-muted-foreground">{t("area.no_permission")}</p>
        <Link href="/"><Button variant="outline">{t("common.back")}</Button></Link>
      </div>
    );
  }

  const Component = components[location];
  if (!Component) {
    return (
      <>
        <BackButton />
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
          <p className="text-xl text-muted-foreground">{t("common.no_data")}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <BackButton />
      <Component />
    </>
  );
}
