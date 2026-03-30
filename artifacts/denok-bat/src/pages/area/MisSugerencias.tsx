import { useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { useStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronRight, Plus, X, Send } from "lucide-react";

type Sugerencia = {
  id: number;
  categoria: string;
  texto: string;
  fecha: string;
  respuesta: string | null;
};

const mockSugerencias: Sugerencia[] = [
  { id: 1, categoria: "Actividades", texto: "Sería interesante organizar clases de baile vasco.", fecha: "2026-02-14", respuesta: "Estamos valorando la propuesta." },
  { id: 2, categoria: "Servicios", texto: "El servicio de transporte al centro de salud es muy útil, ampliar horarios.", fecha: "2026-01-28", respuesta: null },
  { id: 3, categoria: "Instalaciones", texto: "La sala de reuniones necesita mejor iluminación.", fecha: "2025-12-10", respuesta: "Gracias, ya hemos solicitado presupuesto." },
];

const CATEGORIAS = [
  { es: "Actividades", eu: "Jarduerak" },
  { es: "Instalaciones", eu: "Instalazioak" },
  { es: "Servicios", eu: "Zerbitzuak" },
  { es: "Comunicación", eu: "Komunikazioa" },
  { es: "Otros", eu: "Beste batzuk" },
];

export default function MisSugerencias() {
  const { t, lang } = useTranslation();
  const token = useStore(s => s.token);
  const user = useStore(s => s.user);

  const [sugerencias, setSugerencias] = useState<Sugerencia[]>(mockSugerencias);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoria: "", texto: "" });
  const [sending, setSending] = useState(false);
  const [nextId, setNextId] = useState(100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.texto.trim() || !form.categoria) return;

    setSending(true);

    // Add optimistically to the list immediately
    const nueva: Sugerencia = {
      id: nextId,
      categoria: form.categoria,
      texto: form.texto.trim(),
      fecha: new Date().toISOString().slice(0, 10),
      respuesta: null,
    };
    setSugerencias(prev => [nueva, ...prev]);
    setNextId(n => n + 1);
    setForm({ categoria: "", texto: "" });
    setShowForm(false);
    setSending(false);

    // Try to persist via API in the background (non-blocking)
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "";
      await fetch(`${baseUrl}/sugerencias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          socioId: user?.id ?? null,
          categoria: form.categoria,
          texto: form.texto.trim(),
        }),
      });
    } catch {
      // Silent fail — the item is already shown in local state
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("menu.mis_sugerencias")}</h1>
        {!showForm && (
          <Button className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            {lang === "eu" ? "Berria" : "Nueva"}
          </Button>
        )}
      </div>

      {/* Inline new suggestion form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-primary/30 shadow-md p-6 mb-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              {lang === "eu" ? "Iradokizun berria" : "Nueva sugerencia"}
            </h2>
            <button
              onClick={() => { setShowForm(false); setForm({ categoria: "", texto: "" }); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-foreground">
                {lang === "eu" ? "Kategoria" : "Categoría"} *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={form.categoria}
                onChange={e => setForm({ ...form, categoria: e.target.value })}
              >
                <option value="">{lang === "eu" ? "-- Hautatu --" : "-- Seleccionar --"}</option>
                {CATEGORIAS.map(c => (
                  <option key={c.es} value={c.es}>{lang === "eu" ? c.eu : c.es}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-foreground">
                {lang === "eu" ? "Mezua" : "Mensaje"} *
              </label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                placeholder={lang === "eu" ? "Idatzi hemen zure iradokizuna..." : "Escribe aquí tu sugerencia..."}
                value={form.texto}
                onChange={e => setForm({ ...form, texto: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={sending} className="gap-2 flex-1">
                <Send className="w-4 h-4" />
                {sending ? t("common.loading") : (lang === "eu" ? "Bidali" : "Enviar")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); setForm({ categoria: "", texto: "" }); }}
              >
                {lang === "eu" ? "Utzi" : "Cancelar"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Suggestions list */}
      <div className="space-y-4">
        {sugerencias.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">{lang === "eu" ? "Oraindik ez dago iradokizunik." : "Aún no hay sugerencias."}</p>
          </div>
        ) : (
          sugerencias.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">{s.categoria}</span>
                    <span className="text-xs text-muted-foreground">{t("sugerencias.sent_at")} {s.fecha}</span>
                  </div>
                  <p className="text-foreground">{s.texto}</p>
                  {s.respuesta ? (
                    <div className="mt-3 pl-3 border-l-2 border-primary/30">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{t("sugerencias.response")}</p>
                      <p className="text-sm text-foreground">{s.respuesta}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-yellow-600 mt-3 font-medium">{t("sugerencias.no_response")}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
