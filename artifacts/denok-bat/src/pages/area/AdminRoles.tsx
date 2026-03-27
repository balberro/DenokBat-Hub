import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { CheckCircle, Search } from "lucide-react";
import { useState } from "react";

const rolesDisponibles = ["usuario", "socio", "delegado", "directivo", "contable", "administrador"];

const mockUsuarios = [
  { id: 1, nombre: "María García López", email: "maria@email.com", rolActual: "socio" },
  { id: 2, nombre: "José Martínez Ruiz", email: "jose@email.com", rolActual: "usuario" },
  { id: 3, nombre: "Ana Fernández Vega", email: "ana@email.com", rolActual: "delegado" },
  { id: 4, nombre: "Luis Sánchez Torres", email: "luis@email.com", rolActual: "contable" },
  { id: 5, nombre: "Carmen Jiménez Osa", email: "carmen@email.com", rolActual: "usuario" },
];

export default function AdminRoles() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState<Record<number, string>>(
    Object.fromEntries(mockUsuarios.map((u) => [u.id, u.rolActual]))
  );
  const [saved, setSaved] = useState<number | null>(null);

  const filtered = mockUsuarios.filter((u) =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search)
  );

  const handleSave = (id: number) => {
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t("menu.roles")}</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-foreground">{u.nombre}</p>
              <p className="text-sm text-muted-foreground">{u.email}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("admin_roles.current")}: <span className="capitalize font-medium text-foreground">{u.rolActual}</span></p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={roles[u.id]}
                onChange={(e) => setRoles({ ...roles, [u.id]: e.target.value })}
                className="px-3 py-2 rounded-xl border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary capitalize"
              >
                {rolesDisponibles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <Button size="sm" onClick={() => handleSave(u.id)} className="gap-1.5">
                {saved === u.id ? <CheckCircle className="w-4 h-4" /> : null}
                {t("admin_roles.assign")}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4">{t("admin_roles.email_sent")}</p>
    </div>
  );
}
