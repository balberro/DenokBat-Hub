import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n/translations";
import { useStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronRight, Plus, X, Send } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CATEGORIAS = [
  { es: "Actividades", key: "sugerencias.category.actividades" },
  { es: "Instalaciones", key: "sugerencias.category.instalaciones" },
  { es: "Servicios", key: "sugerencias.category.servicios" },
  { es: "Comunicación", key: "sugerencias.category.comunicacion" },
  { es: "Otros", key: "sugerencias.category.otros" },
];

type SugApi = {
  id: number;
  tema?: string | null;
  categoria?: string | null;
  texto?: string | null;
  estado?: string | null;
  fechaEntrada?: string | null;
  fecha_entrada?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  respuesta?: string | null;
};

export default function MisSugerencias() {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);

  const [sugerencias, setSugerencias] = useState<SugApi[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoria: "", texto: "" });
  const [sending, setSending] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      const r = await fetch(`${API_BASE}/api/sugerencias?socioId=${encodeURIComponent(String(user.id))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setSugerencias(d.items ?? []);
      else setLoadErr(String(d?.error ?? t("common.error")));
    } catch {
      setLoadErr(t("common.network_error"));
    }
  }, [token, user?.id, t]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.texto.trim() || !form.categoria || !token) return;

    const payload = {
      socioId: user?.id ?? null,
      categoria: form.categoria,
      texto: form.texto.trim(),
    };

    setSending(true);
    try {
      const r = await fetch(`${API_BASE}/api/sugerencias/socio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setForm({ categoria: "", texto: "" });
        setShowForm(false);
        await loadList();
      }
    } finally {
      setSending(false);
    }
  };

  const labelTema = (s: SugApi) => String(s.tema ?? s.categoria ?? "—");

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("menu.mis_sugerencias")}</h1>
        {!showForm && (
          <Button className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            {t("common.new")}
          </Button>
        )}
      </div>

      {loadErr ? <p className="text-sm text-amber-700 mb-4">{loadErr}</p> : null}

      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-primary/30 shadow-md p-6 mb-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              {t("sugerencias.new")}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm({ categoria: "", texto: "" });
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-foreground">
                {t("sugerencias.category_topic")} *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                <option value="">{t("sugerencias.select_placeholder")}</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.es} value={c.es}>
                    {t(c.key)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-foreground">
                {t("sugerencias.message")} *
              </label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                placeholder={t("sugerencias.message_placeholder")}
                value={form.texto}
                onChange={(e) => setForm({ ...form, texto: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={sending} className="gap-2 flex-1">
                <Send className="w-4 h-4" />
                {sending ? t("common.loading") : t("sugerencias.send")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setForm({ categoria: "", texto: "" });
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {sugerencias.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">{t("sugerencias.empty")}</p>
          </div>
        ) : (
          sugerencias.map((s) => {
            const fecha =
              s.fechaEntrada || s.fecha_entrada || s.createdAt || s.created_at
                ? new Date(String(s.fechaEntrada ?? s.fecha_entrada ?? s.createdAt ?? s.created_at)).toLocaleDateString()
                : "—";
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-border shadow-sm p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                        {labelTema(s)}
                      </span>
                      {s.estado ? (
                        <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                          {s.estado}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {t("sugerencias.sent_at")} {fecha}
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{s.texto ?? ""}</p>
                    {s.respuesta ? (
                      <div className="mt-3 pl-3 border-l-2 border-primary/30">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{t("sugerencias.response")}</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{s.respuesta}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-yellow-600 mt-3 font-medium">{t("sugerencias.no_response")}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
