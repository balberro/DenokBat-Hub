import { useTranslation } from "@/i18n/translations";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Contacto() {
  const { t } = useTranslation();
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", mensaje: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setEnviado(true);
    } catch {
      // mostrar error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-20">
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold mb-4 text-foreground">{t("nav.contact")}</h1>
          <p className="text-xl text-muted-foreground">Estamos aquí para ayudarte</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-6">Información de contacto</h2>
            <div className="space-y-4">
              {[
                { icon: MapPin, label: "Dirección", value: "Calle Mayor, 12 — Bilbao, Bizkaia" },
                { icon: Phone, label: "Teléfono", value: "+34 944 000 000" },
                { icon: Mail, label: "Email", value: "info@denokbat.eus" },
                { icon: Clock, label: "Horario", value: "Lun–Vie: 9:00–14:00 | 16:00–19:00" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-border">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{item.label}</p>
                    <p className="text-foreground font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl overflow-hidden border border-border h-64">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d11636.897099305!2d-2.9349999!3d43.2630000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd4e4f8870c34a3f%3A0x5c0dac7d7e8c3f0!2sBilbao!5e0!3m2!1ses!2ses!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Mapa ubicación Denok Bat"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-border p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-6">{t("form.send")}</h2>
            {enviado ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-primary">¡Mensaje enviado!</h3>
                <p className="text-muted-foreground mt-2">Nos pondremos en contacto contigo pronto.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">{t("form.name")} *</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{t("form.email")} *</label>
                  <input
                    type="email" required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Teléfono</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{t("form.message")} *</label>
                  <textarea
                    required rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    value={form.mensaje}
                    onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-xl text-lg py-6">
                  {loading ? t("common.loading") : t("form.send")}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
