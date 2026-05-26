import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Row = Record<string, unknown>;

export default function SugerenciaAportar() {
  const [, params] = useRoute("/sugerencias/aportar/:numero");
  const numero = params?.numero ? parseInt(params.numero, 10) : NaN;
  const { t } = useTranslation();

  const [raiz, setRaiz] = useState<Row | null>(null);
  const [aportaciones, setAportaciones] = useState<Row[]>([]);
  const [puedeAportar, setPuedeAportar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    alias_publicacion: "",
    mensaje: "",
    adjunto: "" as string,
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(numero) || numero < 1) {
      setLoading(false);
      return;
    }
    let ok = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/sugerencias/publico/${numero}`);
        const d = await r.json();
        if (!ok) return;
        if (!r.ok) {
          setErr(String(d?.error ?? t("sugerencias.aportar_not_found")));
          setRaiz(null);
        } else {
          setRaiz(d.raiz ?? null);
          setAportaciones(d.aportaciones ?? []);
          setPuedeAportar(Boolean(d.puede_aportar));
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
  }, [numero, t]);

  const temaFijo = Number.isFinite(numero) ? `Aportación a sugerencia n.º ${numero}` : "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(numero) || numero < 1) return;
    setSending(true);
    setErr(null);
    try {
      const r = await fetch(`${API_BASE}/api/sugerencias/publico/${numero}/aportacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim() || undefined,
          email: form.email.trim() || undefined,
          alias_publicacion: form.alias_publicacion.trim() || undefined,
          mensaje: form.mensaje.trim(),
          adjunto: form.adjunto || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(String(d?.error ?? t("common.error")));
        return;
      }
      setEnviado(true);
    } catch {
      setErr(t("common.network_error"));
    } finally {
      setSending(false);
    }
  }

  if (!Number.isFinite(numero) || numero < 1) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t("sugerencias.aportar_invalid_number")}</p>
        <Link href="/sugerencias/aportaciones" className="text-primary mt-4 inline-block">
          {t("sugerencias.aportar_back_to_list_btn")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">{t("common.loading")}</div>;
  }

  if (!raiz && err) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto">
        <p className="text-red-600">{err}</p>
        <Link href="/sugerencias/aportaciones" className="text-primary mt-4 inline-block">
          {t("sugerencias.aportar_back_to_list")}
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/sugerencias/aportaciones" className="text-sm text-primary font-medium hover:underline">
        ← {t("sugerencias.aportar_back_short")}
      </Link>

      <article className="mt-6 bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-bold text-foreground">
          {t("sugerencias.aportar_title")} n.º {String(raiz?.numero_sugerencia ?? numero)}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{t("sugerencias.aportar_topic")}: </span>
          {String(raiz?.tema ?? "—")}
        </p>
        <div className="rounded-xl bg-muted/30 p-4 text-sm whitespace-pre-wrap text-foreground border border-border/60">
          {String(raiz?.texto ?? "")}
        </div>
        {String(raiz?.adjunto_url ?? "").trim() ? (
          <p className="text-sm">
            <a className="text-primary underline" href={String(raiz?.adjunto_url)} target="_blank" rel="noreferrer">
              {t("sugerencias.aportar_attachment")}
            </a>
          </p>
        ) : null}
      </article>

      {aportaciones.length > 0 ? (
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-bold text-foreground">
            {t("sugerencias.aportar_received_title")}
          </h2>
          {aportaciones.map((ap) => (
            <div
              key={String(ap.id)}
              className="bg-white rounded-2xl border border-border p-5 shadow-sm text-sm whitespace-pre-wrap"
            >
              <p className="text-xs text-muted-foreground mb-2">
                {ap.fecha_entrada ? new Date(String(ap.fecha_entrada)).toLocaleString() : ""}
                {ap.alias_publicacion ? ` · ${String(ap.alias_publicacion)}` : ""}
              </p>
              {String(ap.texto ?? "")}
            </div>
          ))}
        </section>
      ) : null}

      {!puedeAportar ? (
        <p className="mt-8 text-muted-foreground text-center">{t("sugerencias.aportar_not_open")}</p>
      ) : enviado ? (
        <div className="mt-10 text-center py-8">
          <p className="text-lg font-semibold text-primary">{t("sugerencias.aportar_thanks")}</p>
          <Link href="/sugerencias/aportaciones">
            <Button className="mt-4" variant="outline">
              {t("sugerencias.aportar_back_to_list_btn")}
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-10 space-y-4 bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-lg font-bold">{t("sugerencias.aportar_my_contribution")}</h2>
          <div>
            <label className="block text-sm font-semibold mb-1">{t("sugerencias.aportar_topic")}</label>
            <input
              type="text"
              readOnly
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 text-foreground"
              value={temaFijo}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">{t("form.name")} (opcional)</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">{t("form.email")} (opcional)</label>
            <input
              type="email"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              {t("sugerencias.aportar_alias_label")}
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background"
              value={form.alias_publicacion}
              onChange={(e) => setForm({ ...form, alias_publicacion: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">{t("form.message")} *</label>
            <textarea
              required
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background resize-none"
              value={form.mensaje}
              onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              {t("sugerencias.aportar_attachment_label")}
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
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <Button type="submit" disabled={sending} className="w-full">
            {sending ? t("common.loading") : t("form.send")}
          </Button>
        </form>
      )}
    </div>
  );
}
