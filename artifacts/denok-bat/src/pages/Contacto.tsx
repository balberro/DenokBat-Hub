import { useTranslation } from "@/i18n/translations";
import { Phone, Mail, MapPin, Clock, MessageCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getEmbeddableMapUrl(rawValue: string) {
  const value = String(rawValue ?? "").trim();
  if (!value) return "";

  // Permite pegar un iframe completo en el panel admin y extrae su src.
  if (value.startsWith("<")) {
    const iframeSrcMatch = value.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
    if (iframeSrcMatch?.[1]) {
      return iframeSrcMatch[1].replaceAll("&amp;", "&").trim();
    }
  }

  return value;
}

export default function Contacto() {
  const { t } = useTranslation();
  const EMPTY_FORM = {
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    username: "",
    password: "",
    confirmPassword: "",
    acceptedPrivacy: false,
  };
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cfg, setCfg] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/config/public`);
        if (!r.ok) return;
        const d = await r.json();
        if (!active) return;
        setCfg({
          address: String(d?.["footer.contact.address"] ?? d?.["contact.address"] ?? ""),
          phone: String(d?.["footer.contact.phone"] ?? d?.["contact.phone"] ?? ""),
          email: String(d?.["footer.contact.email"] ?? d?.["contact.email"] ?? ""),
          whatsapp: String(d?.["footer.contact.whatsapp"] ?? d?.["contact.whatsapp"] ?? ""),
          hours: String(d?.["footer.contact.hours"] ?? d?.["contact.hours"] ?? ""),
          mapEmbed: String(d?.["footer.contact.map_embed"] ?? d?.["contact.map_embed"] ?? ""),
        });
      } catch {
        // keep defaults
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.nombre.trim()) nextErrors.nombre = "El nombre es obligatorio";
    if (!form.apellidos.trim()) nextErrors.apellidos = "Los apellidos son obligatorios";
    if (!form.email.trim()) nextErrors.email = "El email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Email no válido";
    if (!form.telefono.trim()) nextErrors.telefono = "El teléfono es obligatorio";
    if (!form.username.trim()) nextErrors.username = "El usuario es obligatorio";
    else if (form.username.trim().length < 4) nextErrors.username = "Mínimo 4 caracteres";
    if (!form.password) nextErrors.password = "La contraseña es obligatoria";
    else if (form.password.length < 8) nextErrors.password = "Mínimo 8 caracteres";
    if (!form.confirmPassword) nextErrors.confirmPassword = "Debe confirmar la contraseña";
    else if (form.confirmPassword !== form.password) nextErrors.confirmPassword = "Las contraseñas no coinciden";
    if (!form.acceptedPrivacy) nextErrors.acceptedPrivacy = "Debe aceptar la política de privacidad";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEnviado(true);
      } else {
        const d = await res.json().catch(() => null);
        setSubmitError(String(d?.error ?? "No se pudo completar el registro."));
      }
    } catch {
      setSubmitError("No se pudo completar el registro.");
    } finally {
      setLoading(false);
    }
  };

  const contactItems = [
    { icon: MapPin, labelKey: "contact.address_label", value: cfg.address || "-" },
    { icon: Phone, labelKey: "contact.phone_label", value: cfg.phone || "-" },
    { icon: Mail, labelKey: "contact.email_label", value: cfg.email || "-" },
    { icon: MessageCircle, labelKey: "contact.whatsapp_label", value: cfg.whatsapp || "-" },
    { icon: Clock, labelKey: "contact.hours_label", value: cfg.hours || "-" },
  ];
  const mapUrl = getEmbeddableMapUrl(cfg.mapEmbed || "");
  const isEmbeddableMap =
    mapUrl.includes("google.com/maps/embed") ||
    mapUrl.includes("google.es/maps/embed") ||
    mapUrl.includes("www.openstreetmap.org/export/embed.html");

  return (
    <div className="pb-20">
      <section className="py-16 bg-linear-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold mb-4 text-foreground">Registro</h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-6">{t("contact.info_title")}</h2>
            <div className="space-y-4">
              {contactItems.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-border">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t(item.labelKey)}</p>
                    <p className="text-foreground font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl overflow-hidden border border-border h-64">
              {mapUrl && isEmbeddableMap ? (
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  title="Mapa ubicación Denok Bat"
                />
              ) : mapUrl ? (
                <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center px-4">
                  <p className="text-muted-foreground">
                    La URL del mapa no es embebible. Abre el mapa en una pestaña nueva.
                  </p>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-primary-foreground"
                  >
                    Abrir mapa
                  </a>
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  Mapa no configurado
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-border p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-6">{t("form.enter_your_data_title")}</h2>
            <p className="text-sm text-muted-foreground mb-4">Datos introducidos o modificados a continuación</p>
            {enviado ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-primary">{t("contact.sent_title")}</h3>
                <p className="text-muted-foreground mt-2">{t("contact.sent_body")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-base font-semibold text-foreground">{t("form.personal_data_title")}</h3>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t("form.name")} *</label>
                    <input
                      type="text"
                      autoComplete="off"
                      className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.nombre ? "border-red-500" : "border-border"}`}
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    />
                    {errors.nombre && <p className="text-xs text-red-600 mt-1">{errors.nombre}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t("common.surname")} *</label>
                    <input
                      type="text"
                      autoComplete="off"
                      className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.apellidos ? "border-red-500" : "border-border"}`}
                      value={form.apellidos}
                      onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                    />
                    {errors.apellidos && <p className="text-xs text-red-600 mt-1">{errors.apellidos}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t("form.email")} *</label>
                    <input
                      type="email"
                      autoComplete="off"
                      className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.email ? "border-red-500" : "border-border"}`}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t("form.phone")} *</label>
                    <input
                      type="tel"
                      autoComplete="off"
                      className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.telefono ? "border-red-500" : "border-border"}`}
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    />
                    {errors.telefono && <p className="text-xs text-red-600 mt-1">{errors.telefono}</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-base font-semibold text-foreground">{t("form.access_data_title")}</h3>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t("form.username")} *</label>
                    <input
                      type="text"
                      autoComplete="off"
                      className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.username ? "border-red-500" : "border-border"}`}
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                    {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t("form.password")} *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className={`w-full px-4 py-3 pr-11 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.password ? "border-red-500" : "border-border"}`}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-label="Mostrar u ocultar contraseña"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{t("form.confirm_password")} *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className={`w-full px-4 py-3 pr-11 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.confirmPassword ? "border-red-500" : "border-border"}`}
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-label="Mostrar u ocultar confirmación"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-base font-semibold text-foreground">{t("form.privacy_summary_title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>{t("form.privacy.responsable_label")}</strong> {t("form.privacy.responsable_text")}
                    <br />
                    <strong>{t("form.privacy.finalidad_label")}</strong> {t("form.privacy.finalidad_text")}
                    <br />
                    <strong>{t("form.privacy.legitimacion_label")}</strong> {t("form.privacy.legitimacion_text")}
                    <br />
                    <strong>{t("form.privacy.destinatarios_label")}</strong> {t("form.privacy.destinatarios_text")}
                    <br />
                    <strong>{t("form.privacy.derechos_label")}</strong> {t("form.privacy.derechos_text")}
                    <br />
                    <strong>{t("form.privacy.info_adicional_label")}</strong> {t("form.privacy.info_adicional_prefix")}{" "}
                    <Link href="/privacidad" className="text-primary underline">
                      {t("form.privacy.policy_link_text")}
                    </Link>
                    .
                  </p>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.acceptedPrivacy}
                      onChange={(e) => setForm({ ...form, acceptedPrivacy: e.target.checked })}
                    />
                    {t("form.privacy.accept_checkbox")}
                  </label>
                  {errors.acceptedPrivacy && <p className="text-xs text-red-600">{errors.acceptedPrivacy}</p>}
                  {!form.acceptedPrivacy && (
                    <p className="text-xs text-red-600">
                      {t("form.privacy.accept_required_notice")}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-xl text-lg py-6">
                  {loading ? t("common.loading") : t("form.send_registration_request")}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
