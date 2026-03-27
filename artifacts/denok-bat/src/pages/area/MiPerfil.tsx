import { useState } from "react";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Camera, CheckCircle } from "lucide-react";

export default function MiPerfil() {
  const user = useStore((s) => s.user);
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nombre: user?.name ?? "",
    apellidos: "",
    email: user?.email ?? "",
    telefono: "",
    direccion: "",
    dni: "",
    fechaNacimiento: "",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t("perfil.title")}</h1>

      {/* Avatar */}
      <div className="flex items-center gap-6 mb-10 p-6 bg-white rounded-2xl border border-border shadow-sm">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
          </div>
          <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow">
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>
        <div>
          <p className="font-semibold text-lg text-foreground">{user?.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          <button className="text-sm text-primary hover:underline mt-1">{t("perfil.change_photo")}</button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-6">
        <h2 className="text-xl font-semibold text-foreground">{t("perfil.personal_data")}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label className="block text-sm font-semibold mb-1.5">{t("perfil.dni")}</label>
            <Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} className="h-12" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">{t("perfil.birth_date")}</label>
            <Input type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} className="h-12" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold mb-1.5">{t("common.address")}</label>
            <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="h-12" />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <Button type="submit" className="px-8 h-12 text-base">
            {t("perfil.save_changes")}
          </Button>
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
