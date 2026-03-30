import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, User as UserIcon, LogOut } from "lucide-react";
import { useTranslation } from "@/i18n/translations";
import { useStore, getUserRoles, type AppUser } from "@/store/use-store";

type LinkItem = { href: string; label: string };
type ActionItem = { action: "logout"; label: string };
type MenuItem = LinkItem | ActionItem;

const ROLE_LABELS: Record<string, { es: string; eu: string }> = {
  socio:         { es: "Socio/a",       eu: "Bazkidea" },
  delegado:      { es: "Delegado/a",    eu: "Ordezkaria" },
  directivo:     { es: "Directivo/a",   eu: "Zuzendaritza" },
  contable:      { es: "Contable",      eu: "Kontularia" },
  administrador: { es: "Administrador/a", eu: "Administratzailea" },
  usuario:       { es: "Usuario/a",     eu: "Erabiltzailea" },
};

const roleItems: Record<string, LinkItem[]> = {
  usuario: [
    { href: "/perfil", label: "menu.perfil" },
  ],
  socio: [
    { href: "/mis-eventos",         label: "menu.mis_eventos" },
    { href: "/mis-inscripciones",   label: "menu.mis_inscripciones" },
    { href: "/mis-pagos",           label: "menu.mis_pagos" },
    { href: "/mis-sugerencias",     label: "menu.mis_sugerencias" },
  ],
  delegado: [
    { href: "/mi-grupo",            label: "menu.mi_grupo" },
    { href: "/inscripciones-grupo", label: "menu.inscripciones_grupo" },
  ],
  directivo: [
    { href: "/admin/eventos",       label: "menu.admin_eventos" },
    { href: "/admin/actividades",   label: "menu.admin_actividades" },
  ],
  contable: [
    { href: "/admin/socios",        label: "menu.gestion_socios" },
    { href: "/admin/contabilidad",  label: "menu.gestion_contable" },
    { href: "/admin/subvenciones",  label: "menu.subvenciones" },
    { href: "/admin/divulgacion",   label: "menu.divulgacion_admin" },
    { href: "/admin/documentacion", label: "menu.documentacion" },
  ],
  administrador: [
    { href: "/admin/roles",         label: "menu.roles" },
    { href: "/admin/proveedores",   label: "menu.proveedores" },
    { href: "/admin/textos",        label: "menu.textos" },
    { href: "/admin/odoo",          label: "menu.odoo" },
    { href: "/admin/app",           label: "menu.app" },
    { href: "/admin/database",      label: "menu.database" },
  ],
};

function buildMenuSections(user: AppUser): { role: string; items: LinkItem[] }[] {
  const roles = getUserRoles(user);
  const seenHrefs = new Set<string>();
  return roles.map(role => {
    const items = (roleItems[role] ?? roleItems["usuario"]).filter(item => {
      if (seenHrefs.has(item.href)) return false;
      seenHrefs.add(item.href);
      return true;
    });
    return { role, items };
  }).filter(s => s.items.length > 0);
}

interface UserMenuProps {
  user: AppUser;
  onClose?: () => void;
  mobile?: boolean;
}

export function UserMenu({ user, onClose, mobile = false }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { t, lang } = useTranslation();
  const setUser = useStore((s) => s.setUser);
  const setToken = useStore((s) => s.setToken);
  const ref = useRef<HTMLDivElement>(null);

  const sections = buildMenuSections(user);
  const allRoles = getUserRoles(user);
  const rolesLabel = allRoles
    .map(r => ROLE_LABELS[r]?.[lang] ?? r)
    .join(" · ");

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("denok-bat-token");
    setOpen(false);
    onClose?.();
    setLocation("/");
  };

  useEffect(() => {
    if (mobile) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobile]);

  function renderItems(compact = false) {
    return (
      <>
        {sections.map(({ role, items }) => (
          <div key={role}>
            {sections.length > 1 && (
              <p className={`px-4 ${compact ? "py-1.5 text-[10px]" : "py-2 text-xs"} font-bold text-muted-foreground uppercase tracking-wider`}>
                {ROLE_LABELS[role]?.[lang] ?? role}
              </p>
            )}
            {items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { setOpen(false); onClose?.(); }}
                className={`block px-4 ${compact ? "py-2 text-sm" : "py-3 text-base"} font-medium text-foreground hover:bg-muted transition-colors ${compact ? "rounded" : "rounded-xl"}`}
              >
                {t(item.label)}
              </Link>
            ))}
          </div>
        ))}

        <div className={`${sections.length > 0 ? "border-t border-border/50 mt-1 pt-1" : ""}`}>
          <Link
            href="/perfil"
            onClick={() => { setOpen(false); onClose?.(); }}
            className={`block px-4 ${compact ? "py-2 text-sm" : "py-3 text-base"} font-medium text-foreground hover:bg-muted transition-colors ${compact ? "rounded" : "rounded-xl"}`}
          >
            {t("menu.perfil")}
          </Link>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 w-full px-4 ${compact ? "py-2 text-sm" : "py-3 text-base"} font-medium text-red-600 hover:bg-red-50 transition-colors ${compact ? "rounded" : "rounded-xl"}`}
          >
            <LogOut className="w-4 h-4" />
            {t("nav.logout")}
          </button>
        </div>
      </>
    );
  }

  if (mobile) {
    return (
      <div className="pt-4 mt-4 border-t border-border space-y-1">
        <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl mb-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-base leading-tight truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{rolesLabel}</p>
          </div>
        </div>
        {renderItems(false)}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors font-medium text-foreground"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <UserIcon className="w-4 h-4 text-primary" />
        </div>
        <span className="max-w-[120px] truncate text-sm">{user.name}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-border/60 py-2 z-50 max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-3 border-b border-border/40 mb-1">
            <p className="font-semibold text-foreground text-sm leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{rolesLabel}</p>
          </div>
          {renderItems(true)}
        </div>
      )}
    </div>
  );
}
