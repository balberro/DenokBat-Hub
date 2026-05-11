import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Lightbulb } from "lucide-react";

const CATEGORIAS = [
  { es: "Actividades", eu: "Jarduerak" },
  { es: "Instalaciones", eu: "Instalazioak" },
  { es: "Servicios", eu: "Zerbitzuak" },
  { es: "Comunicación", eu: "Komunikazioa" },
  { es: "Otros", eu: "Beste batzuk" },
];

export default function Sugerencias() {
  const { t, lang } = useTranslation();
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", categoria: "", mensaje: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/sugerencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setEnviado(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-20">
      <section className="py-16 bg-linear-to-b from-secondary/10 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lightbulb className="w-10 h-10 text-secondary" />
          </div>
          <h1 className="text-5xl font-extrabold mb-4 text-foreground">{t("nav.suggestions")}</h1>
          <p className="text-xl text-muted-foreground">Tu opinión nos ayuda a mejorar. ¡Haznos llegar tus ideas!</p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl border border-border p-8 shadow-sm">
          {enviado ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🙏</div>
              <h3 className="text-2xl font-bold text-primary">¡Gracias por tu sugerencia!</h3>
              <p className="text-muted-foreground mt-2">La estudiaremos con atención.</p>
              <Button className="mt-6" onClick={() => { setEnviado(false); setForm({ nombre: "", email: "", categoria: "", mensaje: "" }); }}>
                Enviar otra sugerencia
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-1">{t("form.name")} (opcional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t("form.email")} (opcional)</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t("form.category")} *</label>
                <select
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  <option value="">-- Seleccionar --</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c.es} value={c.es}>{lang === "eu" ? c.eu : c.es}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t("form.message")} *</label>
                <textarea
                  required rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Escribe aquí tu sugerencia..."
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
      </section>
    </div>
  );
}
