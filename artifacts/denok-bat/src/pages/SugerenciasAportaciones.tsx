import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Item = {
  id: number;
  numero_sugerencia: number;
  tema: string;
  fecha_entrada: string | null;
  excerpt: string;
};

export default function SugerenciasAportaciones() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/sugerencias/aportaciones-lista`);
        const d = await r.json();
        if (!ok) return;
        if (!r.ok) {
          setErr(String(d?.error ?? t("common.error")));
          setItems([]);
        } else {
          setItems(d.items ?? []);
          setErr(null);
        }
      } catch {
        if (ok) setErr(t("common.network_error"));
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [t]);

  return (
    <div className="pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link href="/sugerencias" className="text-sm text-primary font-medium hover:underline">
          ← {t("sugerencias.aportaciones_back")}
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-4 flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-primary" />
          {t("sugerencias.aportaciones_title")}
        </h1>
        <p className="text-muted-foreground mt-2">{t("sugerencias.aportaciones_intro")}</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : err ? (
        <p className="text-red-600">{err}</p>
      ) : items.length === 0 ? (
        <div className="bg-muted/40 rounded-2xl p-8 text-center text-muted-foreground">
          {t("sugerencias.aportaciones_empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  n.º {it.numero_sugerencia}
                </span>
                {it.fecha_entrada ? (
                  <span className="text-xs text-muted-foreground">
                    {new Date(it.fecha_entrada).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
              <h2 className="font-semibold text-foreground mb-1">{it.tema || "—"}</h2>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{it.excerpt}</p>
              <Link href={`/sugerencias/aportar/${it.numero_sugerencia}`}>
                <Button size="sm" variant="default">
                  {t("sugerencias.aportar_action")}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
