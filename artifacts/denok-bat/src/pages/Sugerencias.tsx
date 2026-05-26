import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Lightbulb, Link2 } from "lucide-react";
import { Link } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Sugerencias() {
  const { t, lang } = useTranslation();
  const [enviado, setEnviado] = useState(false);
  const [numeroAsignado, setNumeroAsignado] = useState<number | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    tema: "",
    alias_publicacion: "",
    mensaje: "",
    adjunto: "" as string,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sugerencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim() || undefined,
          email: form.email.trim() || undefined,
          tema: form.tema.trim(),
          alias_publicacion: form.alias_publicacion.trim() || undefined,
          mensaje: form.mensaje.trim(),
          adjunto: form.adjunto || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data?.error ?? data?.detalle ?? "Error al enviar"));
        return;
      }
      setNumeroAsignado(typeof data.numero_sugerencia === "number" ? data.numero_sugerencia : null);
      setEnviado(true);
    } catch {
      setError(lang === "eu" ? "Sareko errorea" : "Error de red");
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
          <p className="text-xl text-muted-foreground">
            {lang === "eu"
              ? "Zure iritzia garrantzitsua da. Partekatu ideiak eta hobekuntzak!"
              : "Tu opinión nos ayuda a mejorar. ¡Comparte ideas y mejoras!"}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/sugerencias/aportaciones">
              <Button type="button" variant="secondary" className="gap-2 rounded-xl">
                <Link2 className="w-4 h-4" />
                {lang === "eu" ? "Aportazioetarako iradokizunak" : "Sugerencias en aportaciones"}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl border border-border p-8 shadow-sm">
          {enviado ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🙏</div>
              <h3 className="text-2xl font-bold text-primary">
                {lang === "eu" ? "Eskerrik asko!" : "¡Gracias por tu sugerencia!"}
              </h3>
              {numeroAsignado != null ? (
                <p className="text-muted-foreground mt-2">
                  {lang === "eu" ? "Zenbakia" : "Número de registro"}: <strong>n.º {numeroAsignado}</strong>
                </p>
              ) : null}
              <p className="text-muted-foreground mt-2 text-sm">
                {lang === "eu"
                  ? "Denok Bat-era bidali dugu jakinarazpen bat."
                  : "Hemos enviado un aviso a info@denokbat.com con los datos."}
              </p>
              <Button
                className="mt-6"
                onClick={() => {
                  setEnviado(false);
                  setNumeroAsignado(null);
                  setForm({ nombre: "", email: "", tema: "", alias_publicacion: "", mensaje: "", adjunto: "" });
                }}
              >
                {lang === "eu" ? "Beste bat bidali" : "Enviar otra sugerencia"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : null}
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
                <label className="block text-sm font-semibold mb-1">
                  {lang === "eu" ? "Gaia" : "Tema"} *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={lang === "eu" ? "Adib.: jarduerak, instalazioak…" : "Ej.: actividades, instalaciones…"}
                  value={form.tema}
                  onChange={(e) => setForm({ ...form, tema: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  {lang === "eu" ? "Argitaratzeko izenorde (aukerakoa)" : "Alias a publicar (opcional)"}
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.alias_publicacion}
                  onChange={(e) => setForm({ ...form, alias_publicacion: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t("form.message")} *</label>
                <textarea
                  required
                  rows={6}
                  minLength={4}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder={lang === "eu" ? "Idatzi zure iradokizuna…" : "Escribe aquí tu sugerencia…"}
                  value={form.mensaje}
                  onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  {lang === "eu" ? "PDF edo irudia (aukerakoa)" : "PDF o imagen (opcional)"}
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="w-full text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) {
                      setForm((p) => ({ ...p, adjunto: "" }));
                      return;
                    }
                    const r = new FileReader();
                    r.onload = () => setForm((p) => ({ ...p, adjunto: String(r.result ?? "") }));
                    r.readAsDataURL(f);
                  }}
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
