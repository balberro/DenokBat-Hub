import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/use-store";

const API = "/api";
const roleFilterOptions = ["usuario", "socio", "directivo", "delegado", "contable", "administrador"] as const;
type RoleOption = (typeof roleFilterOptions)[number];

type AdminUser = {
  id: number;
  username: string;
  nombre: string;
  apellidos?: string | null;
  email?: string | null;
  rol: RoleOption;
  avatarUrl?: string | null;
};

export default function AdminRoles() {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleOption>("usuario");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, RoleOption>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setNotice("");
    try {
      const r = await fetch(`${API}/admin/roles/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Error cargando usuarios para roles");
      const data = await r.json();
      const incomingUsers: AdminUser[] = Array.isArray(data?.users) ? data.users : [];
      const drafts: Record<number, RoleOption> = {};
      for (const user of incomingUsers) {
        drafts[user.id] = (roleFilterOptions.includes(user.rol) ? user.rol : "usuario") as RoleOption;
      }
      setUsers(incomingUsers);
      setRoleDrafts(drafts);
    } catch {
      setUsers([]);
      setRoleDrafts({});
      setNotice("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const changeRole = async (userId: number) => {
    if (!token) return;
    const role = roleDrafts[userId];
    if (!role) return;
    setSavingId(userId);
    setNotice("");
    try {
      const r = await fetch(`${API}/admin/roles/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        if (d?.error) throw new Error(String(d.error));
        const rawText = await r.text().catch(() => "");
        const shortText = rawText.trim().slice(0, 120);
        throw new Error(shortText ? `HTTP ${r.status}: ${shortText}` : `HTTP ${r.status}: No se pudo actualizar el rol`);
      }
      await load();
      setNotice("Rol actualizado correctamente.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error actualizando rol.");
    } finally {
      setSavingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (String(user.rol ?? "usuario").toLowerCase() !== roleFilter) return false;
      if (!q) return true;
      const fullName = `${user.nombre ?? ""} ${user.apellidos ?? ""}`.trim().toLowerCase();
      const username = String(user.username ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      return (
        fullName.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        String(user.rol ?? "usuario").toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, search]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t("menu.roles")}</h1>

      <div className="grid md:grid-cols-[1fr_220px] gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${t("common.search")} (${t("common.name")} o usuario o email o rol)`}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleOption)}
          className="px-3 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm capitalize"
        >
          {roleFilterOptions.map((role) => (
            <option key={role} value={role} className="capitalize">
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4">
            {u.avatarUrl ? (
              <img
                src={u.avatarUrl}
                alt={`${u.nombre ?? ""} ${u.apellidos ?? ""}`.trim()}
                className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                {(u.nombre?.[0] ?? "?").toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-foreground">{`${u.nombre ?? ""} ${u.apellidos ?? ""}`.trim()}</p>
              <p className="text-xs text-muted-foreground">@{u.username}</p>
              {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                {t("admin_roles.current")}:{" "}
                <span className="capitalize font-medium text-foreground">{u.rol || "usuario"}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={roleDrafts[u.id] ?? "usuario"}
                onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [u.id]: e.target.value as RoleOption }))}
                className="px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm capitalize"
              >
                {roleFilterOptions.map((role) => (
                  <option key={role} value={role} className="capitalize">
                    {role}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={() => changeRole(u.id)} disabled={savingId === u.id}>
                {savingId === u.id ? "Guardando..." : "Actualizar rol"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground mt-4">No hay usuarios para ese filtro.</p>
      )}
      {loading && <p className="text-sm text-muted-foreground mt-4">Cargando usuarios...</p>}
      {notice && <p className="text-sm text-muted-foreground mt-4">{notice}</p>}
      <div className="mt-4">
        <Button variant="outline" size="sm" disabled>
          {filtered.length} usuarios
        </Button>
      </div>
    </div>
  );
}
