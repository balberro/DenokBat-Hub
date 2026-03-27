import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Construction } from "lucide-react";

const sections: Record<string, { labelKey: string; roles: string[] }> = {
  "/perfil":                  { labelKey: "menu.perfil",             roles: ["usuario","socio","delegado","directivo","contable","administrador"] },
  "/mis-eventos":             { labelKey: "menu.mis_eventos",         roles: ["socio","directivo"] },
  "/mis-inscripciones":       { labelKey: "menu.mis_inscripciones",   roles: ["socio","directivo"] },
  "/mis-pagos":               { labelKey: "menu.mis_pagos",           roles: ["socio","directivo"] },
  "/mis-sugerencias":         { labelKey: "menu.mis_sugerencias",     roles: ["socio","directivo"] },
  "/mi-grupo":                { labelKey: "menu.mi_grupo",            roles: ["delegado"] },
  "/inscripciones-grupo":     { labelKey: "menu.inscripciones_grupo", roles: ["delegado"] },
  "/admin/eventos":           { labelKey: "menu.admin_eventos",       roles: ["directivo","administrador"] },
  "/admin/actividades":       { labelKey: "menu.admin_actividades",   roles: ["directivo","administrador"] },
  "/admin/socios":            { labelKey: "menu.gestion_socios",      roles: ["contable","administrador"] },
  "/admin/contabilidad":      { labelKey: "menu.gestion_contable",    roles: ["contable","administrador"] },
  "/admin/subvenciones":      { labelKey: "menu.subvenciones",        roles: ["contable","administrador"] },
  "/admin/divulgacion":       { labelKey: "menu.divulgacion_admin",   roles: ["contable","administrador"] },
  "/admin/documentacion":     { labelKey: "menu.documentacion",       roles: ["contable","administrador"] },
  "/admin/roles":             { labelKey: "menu.roles",               roles: ["administrador"] },
  "/admin/proveedores":       { labelKey: "menu.proveedores",         roles: ["administrador"] },
  "/admin/odoo":              { labelKey: "menu.odoo",                roles: ["administrador"] },
  "/admin/app":               { labelKey: "menu.app",                 roles: ["administrador"] },
};

export default function AreaPrivada() {
  const user = useStore((s) => s.user);
  const { t } = useTranslation();
  const [location] = useLocation();

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-xl text-muted-foreground mb-6">
          {t('auth.login_cta')}
        </p>
        <Link href="/login">
          <Button size="lg">{t('nav.login')}</Button>
        </Link>
      </div>
    );
  }

  const section = sections[location];

  if (!section) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-xl text-muted-foreground">Sección no encontrada</p>
      </div>
    );
  }

  const hasAccess = section.roles.includes(user.role);

  if (!hasAccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-xl font-semibold text-foreground mb-2">Acceso restringido</p>
        <p className="text-muted-foreground mb-6">No tienes permisos para acceder a esta sección.</p>
        <Link href="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Construction className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t(section.labelKey)}</h1>
          <p className="text-muted-foreground text-lg">
            Esta sección está en desarrollo. Pronto estará disponible.
          </p>
        </div>
        <div className="flex gap-3 mt-4">
          <Link href="/">
            <Button variant="outline">Volver al inicio</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
