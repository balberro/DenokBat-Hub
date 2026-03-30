import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, User as UserIcon, LogOut } from "lucide-react";
import { useTranslation } from "@/i18n/translations";
import { useStore } from "@/store/use-store";
import type { UserProfile } from "@workspace/api-client-react";

type MenuItem = { href: string; label: string } | { action: "logout"; label: string };

const roleMenus: Record<string, MenuItem[]> = {
  usuario: [
    { href: "/perfil", label: "menu.perfil" },
    { action: "logout", label: "nav.logout" },
  ],
  socio: [
    { href: "/mis-eventos", label: "menu.mis_eventos" },
    { href: "/mis-inscripciones", label: "menu.mis_inscripciones" },
    { href: "/mis-pagos", label: "menu.mis_pagos" },
    { href: "/mis-sugerencias", label: "menu.mis_sugerencias" },
    { href: "/perfil", label: "menu.perfil" },
    { action: "logout", label: "nav.logout" },
  ],
  delegado: [
    { href: "/mi-grupo", label: "menu.mi_grupo" },
    { href: "/inscripciones-grupo", label: "menu.inscripciones_grupo" },
    { href: "/perfil", label: "menu.perfil" },
    { action: "logout", label: "nav.logout" },
  ],
  directivo: [
    { href: "/admin/eventos", label: "menu.admin_eventos" },
    { href: "/admin/actividades", label: "menu.admin_actividades" },
    { href: "/perfil", label: "menu.perfil" },
    { action: "logout", label: "nav.logout" },
  ],
  contable: [
    { href: "/admin/socios", label: "menu.gestion_socios" },
    { href: "/admin/contabilidad", label: "menu.gestion_contable" },
    { href: "/admin/subvenciones", label: "menu.subvenciones" },
    { href: "/admin/divulgacion", label: "menu.divulgacion_admin" },
    { href: "/admin/documentacion", label: "menu.documentacion" },
    { href: "/perfil", label: "menu.perfil" },
    { action: "logout", label: "nav.logout" },
  ],
  administrador: [
    { href: "/admin/roles", label: "menu.roles" },
    { href: "/admin/proveedores", label: "menu.proveedores" },
    { href: "/admin/textos", label: "menu.textos" },
    { href: "/admin/odoo", label: "menu.odoo" },
    { href: "/admin/app", label: "menu.app" },
    { href: "/perfil", label: "menu.perfil" },
    { action: "logout", label: "nav.logout" },
  ],
};

interface UserMenuProps {
  user: UserProfile;
  onClose?: () => void;
  mobile?: boolean;
}

export function UserMenu({ user, onClose, mobile = false }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const setUser = useStore((s) => s.setUser);
  const setToken = useStore((s) => s.setToken);
  const ref = useRef<HTMLDivElement>(null);

  const items = roleMenus[user.role] ?? roleMenus["usuario"];

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

  if (mobile) {
    return (
      <div className="pt-4 mt-4 border-t border-border space-y-1">
        <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl mb-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-base leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>
        {items.map((item, i) =>
          "action" in item ? (
            <button
              key={i}
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t(item.label)}
            </button>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { setOpen(false); onClose?.(); }}
              className="block px-4 py-3 rounded-xl text-base font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              {t(item.label)}
            </Link>
          )
        )}
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
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-border/60 py-2 z-50">
          <div className="px-4 py-3 border-b border-border/40 mb-1">
            <p className="font-semibold text-foreground text-sm leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{user.role}</p>
          </div>
          {items.map((item, i) =>
            "action" in item ? (
              <button
                key={i}
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t(item.label)}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                {t(item.label)}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
