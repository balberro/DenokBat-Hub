import { useEffect, useRef, useState } from "react";
import { getUserRoles, useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Camera, CheckCircle } from "lucide-react";

export default function MiPerfil() {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const setUser = useStore((s) => s.setUser);
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    username: "",
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: "",
    avatarUrl: user?.avatar ?? "",
  });
  const roles = user ? getUserRoles(user) : [];
  const canEditFullProfile = roles.includes("usuario") || roles.includes("socio");
  const userUsername = (user as { username?: string } | null)?.username ?? "";
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const avatarPreview = String(form.avatarUrl || user?.avatar || "").trim();

  useEffect(() => {
    if (!user) return;
    const fallbackUsername = userUsername || (user.email ? String(user.email).split("@")[0] : "");
    const userTelefono =
      String((user as { telefono?: string | null; phone?: string | null } | null)?.telefono ?? "").trim() ||
      String((user as { telefono?: string | null; phone?: string | null } | null)?.phone ?? "").trim();
    setForm((prev) => ({
      ...prev,
      username: prev.username || fallbackUsername,
      nombre: user.name ?? prev.nombre ?? "",
      email: user.email ?? prev.email ?? "",
      telefono: prev.telefono || userTelefono,
      avatarUrl: user.avatar ?? prev.avatarUrl ?? "",
    }));
    if (!token) return;
    (async () => {
      try {
        const r = await fetch("/api/perfil/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const d = await r.json();
        setForm((prev) => ({
          ...prev,
          username: String(d?.username ?? prev.username ?? ""),
          nombre: String(d?.nombre ?? prev.nombre ?? ""),
          apellidos: String(d?.apellidos ?? ""),
          email: String(d?.email ?? prev.email ?? ""),
          telefono: String(d?.telefono ?? d?.phone ?? prev.telefono ?? ""),
          avatarUrl: String(d?.avatar_url ?? prev.avatarUrl ?? ""),
        }));

        const snap = useStore.getState().user;
        if (snap) {
          const apiAvatar = String(d?.avatar_url ?? "").trim();
          const nextName = String(d?.nombre ?? snap.name ?? "");
          const nextEmail = d?.email != null ? String(d.email) : snap.email;
          const norm = (v: string | null | undefined) => String(v ?? "").trim();
          const sameAvatar = norm(snap.avatar) === apiAvatar;
          const sameName = nextName === snap.name;
          const sameEmail = String(nextEmail ?? "") === String(snap.email ?? "");
          if (!sameAvatar || !sameName || !sameEmail) {
            useStore.getState().setUser({
              ...snap,
              name: nextName,
              email: nextEmail,
              avatar: apiAvatar || null,
            });
          }
        }
      } catch {
        // no-op
      }
    })();
  }, [token, user?.id, userUsername, canEditFullProfile]);

  const fileToDataUrl = async (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canEditFullProfile) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return;
    }
    if (!form.username.trim() || !form.nombre.trim() || !form.apellidos.trim() || !form.email.trim() || !form.telefono.trim()) {
      setNotice("Complete todos los campos obligatorios.");
      return;
    }
    if (!form.password || form.password.length < 8) {
      setNotice("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setNotice("La confirmación de contraseña no coincide.");
      return;
    }
    setSaving(true);
    setNotice("");
    void (async () => {
      try {
        const r = await fetch("/api/perfil/me", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => null);
          throw new Error(String(d?.error ?? "No se pudo guardar el perfil"));
        }
        const d = await r.json();
        if (user) {
          setUser({
            ...user,
            name: String(d?.nombre ?? user.name ?? ""),
            email: d?.email ? String(d.email) : null,
            avatar: d?.avatar_url ? String(d.avatar_url) : user.avatar,
          });
        }
        setSaved(true);
        setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Error guardando perfil");
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t("perfil.title")}</h1>

      {/* Avatar */}
      <div className="flex items-center gap-6 mb-10 p-6 bg-white rounded-2xl border border-border shadow-sm">
        <div className="relative">
          <button
            type="button"
            className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => avatarFileInputRef.current?.click()}
            aria-label={t("perfil.change_photo")}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
          </button>
          <button
            type="button"
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow pointer-events-none"
            tabIndex={-1}
            aria-hidden
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>
        <div>
          <p className="font-semibold text-lg text-foreground">{canEditFullProfile ? (form.username || "-") : user?.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          <label className="text-sm text-primary hover:underline mt-1 cursor-pointer inline-block">
            {t("perfil.change_photo")}
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const dataUrl = await fileToDataUrl(file);
                  setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
                } catch {
                  setNotice("No se pudo leer la imagen seleccionada.");
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-6">
        <h2 className="text-xl font-semibold text-foreground">{t("perfil.personal_data")}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {canEditFullProfile ? (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.username")}</label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-12" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("common.name")}</label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="h-12" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("perfil.surname")}</label>
                <Input value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} className="h-12" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.email")}</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("common.phone")}</label>
                <Input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="h-12" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.password")}</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="h-12"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.confirm_password")}</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="h-12"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("common.name")}</label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="h-12" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.email")}</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("common.phone")}</label>
                <Input type="tel" value={form.telefono} readOnly className="h-12 bg-muted/20" />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <Button type="submit" className="px-8 h-12 text-base" disabled={saving}>
            {t("perfil.save_changes")}
          </Button>
          {notice && <span className="text-sm text-red-600">{notice}</span>}
          {saved && (
            <span className="flex items-center gap-2 text-green-600 font-medium text-sm">
              <CheckCircle className="w-4 h-4" />
              {t("perfil.saved_ok")}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
