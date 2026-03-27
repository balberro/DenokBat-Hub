import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { ExternalLink, Settings, Package, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function SeccionAdmin() {
  const { t } = useTranslation();
  const [location] = useLocation();

  if (location === "/admin/odoo") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <ExternalLink className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Odoo</h1>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 text-center space-y-4">
          <p className="text-muted-foreground">Acceso al sistema de gestión Odoo 17</p>
          <p className="text-sm text-muted-foreground">URL: <span className="font-mono text-foreground">https://vls18755.dinaserver.com</span></p>
          <Button className="gap-2 mt-4" onClick={() => window.open("https://vls18755.dinaserver.com", "_blank")}>
            <ExternalLink className="w-4 h-4" /> Abrir Odoo
          </Button>
        </div>
      </div>
    );
  }

  if (location === "/admin/proveedores") {
    const proveedores = [
      { nombre: "Transportes Bilbao SL", tipo: "Transporte", contacto: "944 111 222", estado: "Activo" },
      { nombre: "Catering Euskadi", tipo: "Alimentación", contacto: "944 333 444", estado: "Activo" },
      { nombre: "Imprenta Rápida", tipo: "Imprenta", contacto: "944 555 666", estado: "Activo" },
      { nombre: "Mantenimiento ABC", tipo: "Mantenimiento", contacto: "944 777 888", estado: "Inactivo" },
    ];
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t("menu.proveedores")}</h1>
          <Button className="gap-2"><Package className="w-4 h-4" />{t("common.create")}</Button>
        </div>
        <div className="space-y-3">
          {proveedores.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{p.nombre}</p>
                <p className="text-sm text-muted-foreground">{p.tipo} · {p.contacto}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.estado === "Activo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {p.estado}
              </span>
              <Button variant="outline" size="sm">{t("common.edit")}</Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (location === "/admin/app") {
    const settings = [
      { label: "Nombre de la asociación", labelEu: "Elkartearen izena", value: "Denok Bat" },
      { label: "Email de contacto", labelEu: "Kontaktu-emaila", value: "info@denokbat.eus" },
      { label: "Teléfono", labelEu: "Telefonoa", value: "+34 944 000 000" },
      { label: "Idioma por defecto", labelEu: "Hizkuntza lehenetsia", value: "Euskara" },
    ];
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">App</h1>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-5">
          {settings.map((s, i) => (
            <div key={i}>
              <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">{s.label}</label>
              <input
                defaultValue={s.value}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button>{t("common.save")}</Button>
            <Button variant="outline">{t("common.cancel")}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-foreground">{t("menu.roles")}</h1>
    </div>
  );
}
