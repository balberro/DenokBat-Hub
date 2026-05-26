import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { ExternalLink, Settings, Package, Shield, RefreshCw, Database, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useStore } from "@/store/use-store";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SyncResult = {
  modelo: string;
  procesados: number;
  errores: number;
  mensaje?: string;
};

type SyncState = "idle" | "running" | "done" | "error";

function OdooSyncPanel({ token }: { token: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<SyncState>("idle");
  const [results, setResults] = useState<SyncResult[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("all");

  const modelos = [
    { value: "all", label: "Todo (socios, eventos, actividades, pagos)" },
    { value: "socios", label: "Socios" },
    { value: "eventos", label: "Eventos" },
    { value: "actividades", label: "Actividades" },
    { value: "pagos", label: "Pagos / Facturas" },
  ];

  async function runSync() {
    setState("running");
    setResults([]);
    try {
      const body = selectedModel !== "all" ? JSON.stringify({ modelo: selectedModel }) : "{}";
      const res = await fetch(`${API_BASE}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.resultados ?? []);
        setState("done");
      } else {
        setResults([{ modelo: "error", procesados: 0, errores: 1, mensaje: data.error }]);
        setState("error");
      }
    } catch (err) {
      setResults([{ modelo: "error", procesados: 0, errores: 1, mensaje: String(err) }]);
      setState("error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          Sincronización Odoo → Base de datos local
        </h2>
        <p className="text-sm text-muted-foreground">
          Importa los datos de Odoo a la base de datos local de la app. Los datos locales tienen prioridad en la API — Odoo actúa como fuente de verdad.
        </p>

        <div>
          <label className="block text-sm font-semibold mb-2 text-muted-foreground">Modelo a sincronizar</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {modelos.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <Button
          onClick={runSync}
          disabled={state === "running"}
          className="gap-2 w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${state === "running" ? "animate-spin" : ""}`} />
          {state === "running" ? "Sincronizando..." : "Iniciar sincronización"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-3">
          <h3 className="text-base font-semibold text-foreground">Resultado</h3>
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
              {r.errores === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-semibold capitalize text-foreground">{r.modelo}</p>
                <p className="text-sm text-muted-foreground">
                  {r.procesados} registros procesados · {r.errores} errores
                </p>
                {r.mensaje && <p className="text-xs text-muted-foreground mt-1 italic">{r.mensaje}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DatabaseStatusPanel({ token }: { token: string }) {
  const tablas = [
    { nombre: "Socios", tabla: "db_socios", icono: "👤" },
    { nombre: "Usuarios", tabla: "db_users", icono: "🔐" },
    { nombre: "Eventos", tabla: "db_eventos", icono: "📅" },
    { nombre: "Actividades", tabla: "db_actividades", icono: "🏃" },
    { nombre: "Inscripciones", tabla: "db_inscripciones", icono: "📋" },
    { nombre: "Pagos", tabla: "db_pagos", icono: "💶" },
    { nombre: "Sugerencias", tabla: "db_sugerencias", icono: "💬" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-primary" />
        Tablas en base de datos local
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tablas.map((t) => (
          <div key={t.tabla} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <span className="text-xl">{t.icono}</span>
            <div>
              <p className="font-medium text-sm text-foreground">{t.nombre}</p>
              <p className="text-xs text-muted-foreground font-mono">{t.tabla}</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function normalizeConfigValue(value: string) {
  return String(value ?? "").trim();
}

function AdminHomeEditor({ token }: { token: string | null }) {
  const [form, setForm] = useState({
    heroTitle: "",
    heroSubtitle: "",
    heroSubtitleEu: "",
    heroImage: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/config/public`);
        const d = await r.json();
        setForm({
          heroTitle: String(d?.["home.hero_title"] ?? ""),
          heroSubtitle: String(d?.["home.hero_subtitle"] ?? ""),
          heroSubtitleEu: String(d?.["home.hero_subtitle_eu"] ?? ""),
          heroImage: String(d?.["home.hero_image"] ?? ""),
        });
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveHome = async () => {
    if (!token) return;
    setSaving(true);
    setNotice("");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const entries = [
        ["home.hero_title", form.heroTitle],
        ["home.hero_subtitle", form.heroSubtitle],
        ["home.hero_subtitle_eu", form.heroSubtitleEu],
        ["home.hero_image", form.heroImage],
      ] as const;
      for (const [clave, valor] of entries) {
        const r = await fetch(`${API_BASE}/api/config/${encodeURIComponent(clave)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ valor: String(valor ?? "") }),
        });
        if (!r.ok) throw new Error("save failed");
      }
      setNotice("Inicio actualizado correctamente.");
    } catch {
      setNotice("Error guardando la configuración de inicio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Editar inicio</h1>
      </div>
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Título H1</label>
          <input
            value={form.heroTitle}
            onChange={(e) => setForm((p) => ({ ...p, heroTitle: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Descripción H3</label>
          <input
            value={form.heroSubtitle}
            onChange={(e) => setForm((p) => ({ ...p, heroSubtitle: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Descripción H3 (Euskera)</label>
          <input
            value={form.heroSubtitleEu}
            onChange={(e) => setForm((p) => ({ ...p, heroSubtitleEu: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Subir foto portada</label>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) return;
              const image = await readFileAsDataUrl(file);
              setForm((p) => ({ ...p, heroImage: image }));
            }}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            disabled={loading}
          />
          {form.heroImage && (
            <img src={form.heroImage} alt="Vista previa portada" className="mt-3 h-40 w-full object-cover rounded-xl border border-border" />
          )}
        </div>
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
        <div className="flex gap-3 pt-2">
          <Button onClick={saveHome} disabled={saving || loading}>{saving ? "Guardando..." : "Guardar inicio"}</Button>
          <Button variant="outline" onClick={() => setForm({
            heroTitle: "",
            heroSubtitle: "",
            heroSubtitleEu: "",
            heroImage: "",
          })} disabled={saving || loading}>Limpiar</Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Editor consolidado de pie, contacto y avisos legales.
 *
 * Reúne en una sola pantalla, con pestañas, los campos que antes vivían en
 * "Editar pie y contacto" y en "Editor política de privacidad", añadiendo
 * además formularios equivalentes para "Aviso legal" y "Cookies". Cada
 * pestaña conserva su propio botón Guardar y carga las claves de
 * configuración correspondientes.
 */
type FooterLegalTab = "pie" | "contacto" | "legal" | "privacy" | "cookies";

const FOOTER_LEGAL_TABS: { key: FooterLegalTab; label: string }[] = [
  { key: "pie", label: "Pie" },
  { key: "contacto", label: "Contacto" },
  { key: "legal", label: "Aviso legal" },
  { key: "privacy", label: "Política de privacidad" },
  { key: "cookies", label: "Cookies" },
];

type LegalForm = { titleEs: string; titleEu: string; bodyEs: string; bodyEu: string };
const EMPTY_LEGAL_FORM: LegalForm = { titleEs: "", titleEu: "", bodyEs: "", bodyEu: "" };

function AdminFooterLegalEditor({
  token,
  initialTab = "pie",
}: {
  token: string | null;
  initialTab?: FooterLegalTab;
}) {
  const [activeTab, setActiveTab] = useState<FooterLegalTab>(initialTab);
  // Pie: solo el logo/marca textual del pie. El resto del pie (links, social) no es editable aún aquí.
  const [pieForm, setPieForm] = useState({ footerLogoText: "", footerLogoTextEu: "" });
  // Contacto: dirección, teléfono, email, whatsapp, horario, mapa.
  const [contactoForm, setContactoForm] = useState({
    footerAddress: "",
    footerPhone: "",
    footerEmail: "",
    footerWhatsapp: "",
    footerHours: "",
    footerMapEmbed: "",
  });
  const [legalForm, setLegalForm] = useState<LegalForm>(EMPTY_LEGAL_FORM);
  const [privacyForm, setPrivacyForm] = useState<LegalForm>(EMPTY_LEGAL_FORM);
  const [cookiesForm, setCookiesForm] = useState<LegalForm>(EMPTY_LEGAL_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<FooterLegalTab | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/config/public`);
        const d = await r.json();
        setPieForm({
          footerLogoText: String(d?.["footer.logo_text"] ?? ""),
          footerLogoTextEu: String(d?.["footer.logo_text_eu"] ?? ""),
        });
        setContactoForm({
          footerAddress: String(d?.["footer.contact.address"] ?? ""),
          footerPhone: String(d?.["footer.contact.phone"] ?? ""),
          footerEmail: String(d?.["footer.contact.email"] ?? ""),
          footerWhatsapp: String(d?.["footer.contact.whatsapp"] ?? ""),
          footerHours: String(d?.["footer.contact.hours"] ?? ""),
          footerMapEmbed: String(d?.["footer.contact.map_embed"] ?? ""),
        });
        setPrivacyForm({
          titleEs: String(d?.["privacy.policy_title_es"] ?? ""),
          titleEu: String(d?.["privacy.policy_title_eu"] ?? ""),
          bodyEs: String(d?.["privacy.policy_body_es"] ?? ""),
          bodyEu: String(d?.["privacy.policy_body_eu"] ?? ""),
        });
        setLegalForm({
          titleEs: String(d?.["legal.notice_title_es"] ?? ""),
          titleEu: String(d?.["legal.notice_title_eu"] ?? ""),
          bodyEs: String(d?.["legal.notice_body_es"] ?? ""),
          bodyEu: String(d?.["legal.notice_body_eu"] ?? ""),
        });
        setCookiesForm({
          titleEs: String(d?.["legal.cookies_title_es"] ?? ""),
          titleEu: String(d?.["legal.cookies_title_eu"] ?? ""),
          bodyEs: String(d?.["legal.cookies_body_es"] ?? ""),
          bodyEu: String(d?.["legal.cookies_body_eu"] ?? ""),
        });
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const buildHeaders = (): Record<string, string> => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  });

  const persistEntries = async (entries: ReadonlyArray<readonly [string, string]>) => {
    const headers = buildHeaders();
    for (const [clave, valor] of entries) {
      const r = await fetch(`${API_BASE}/api/config/${encodeURIComponent(clave)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ valor: String(valor ?? "") }),
      });
      if (!r.ok) throw new Error("save failed");
    }
  };

  const savePie = async () => {
    if (!token) return;
    setSaving("pie");
    setNotice("");
    try {
      await persistEntries([
        ["footer.logo_text", pieForm.footerLogoText],
        ["footer.logo_text_eu", pieForm.footerLogoTextEu],
      ] as const);
      const verify = await fetch(`${API_BASE}/api/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!verify.ok) throw new Error("verify failed");
      const saved = await verify.json();
      const persistedLogoTextEu = normalizeConfigValue(saved?.["footer.logo_text_eu"] ?? "");
      const inputLogoTextEu = normalizeConfigValue(pieForm.footerLogoTextEu ?? "");
      if (persistedLogoTextEu !== inputLogoTextEu) {
        setNotice("Guardado parcial: revisa el texto bajo logo (Euskera), no se ha persistido correctamente.");
        return;
      }
      setNotice("Pie actualizado correctamente.");
    } catch {
      setNotice("Error guardando el pie.");
    } finally {
      setSaving(null);
    }
  };

  const saveContacto = async () => {
    if (!token) return;
    setSaving("contacto");
    setNotice("");
    try {
      await persistEntries([
        ["footer.contact.address", contactoForm.footerAddress],
        ["footer.contact.phone", contactoForm.footerPhone],
        ["footer.contact.email", contactoForm.footerEmail],
        ["footer.contact.whatsapp", contactoForm.footerWhatsapp],
        ["footer.contact.hours", contactoForm.footerHours],
        ["footer.contact.map_embed", contactoForm.footerMapEmbed],
      ] as const);
      const verify = await fetch(`${API_BASE}/api/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!verify.ok) throw new Error("verify failed");
      const saved = await verify.json();
      const persistedHours = normalizeConfigValue(saved?.["footer.contact.hours"] ?? "");
      const persistedMapEmbed = normalizeConfigValue(saved?.["footer.contact.map_embed"] ?? "");
      const inputHours = normalizeConfigValue(contactoForm.footerHours ?? "");
      const inputMapEmbed = normalizeConfigValue(contactoForm.footerMapEmbed ?? "");
      if (persistedHours !== inputHours) {
        setNotice("Guardado parcial: revisa el campo Horario, no se ha persistido correctamente.");
        return;
      }
      if (persistedMapEmbed !== inputMapEmbed) {
        setNotice("Guardado parcial: revisa el campo Mapa, no se ha persistido correctamente.");
        return;
      }
      setNotice("Contacto actualizado correctamente.");
    } catch {
      setNotice("Error guardando el contacto.");
    } finally {
      setSaving(null);
    }
  };

  const saveLegalGeneric = async (
    tab: FooterLegalTab,
    form: LegalForm,
    keys: { title_es: string; title_eu: string; body_es: string; body_eu: string },
    okMessage: string,
    koMessage: string,
  ) => {
    if (!token) return;
    setSaving(tab);
    setNotice("");
    try {
      await persistEntries([
        [keys.title_es, form.titleEs],
        [keys.title_eu, form.titleEu],
        [keys.body_es, form.bodyEs],
        [keys.body_eu, form.bodyEu],
      ] as const);
      setNotice(okMessage);
    } catch {
      setNotice(koMessage);
    } finally {
      setSaving(null);
    }
  };

  const savePrivacy = () =>
    saveLegalGeneric(
      "privacy",
      privacyForm,
      {
        title_es: "privacy.policy_title_es",
        title_eu: "privacy.policy_title_eu",
        body_es: "privacy.policy_body_es",
        body_eu: "privacy.policy_body_eu",
      },
      "Política de privacidad actualizada.",
      "Error guardando la política de privacidad.",
    );
  const saveLegal = () =>
    saveLegalGeneric(
      "legal",
      legalForm,
      {
        title_es: "legal.notice_title_es",
        title_eu: "legal.notice_title_eu",
        body_es: "legal.notice_body_es",
        body_eu: "legal.notice_body_eu",
      },
      "Aviso legal actualizado.",
      "Error guardando el aviso legal.",
    );
  const saveCookies = () =>
    saveLegalGeneric(
      "cookies",
      cookiesForm,
      {
        title_es: "legal.cookies_title_es",
        title_eu: "legal.cookies_title_eu",
        body_es: "legal.cookies_body_es",
        body_eu: "legal.cookies_body_eu",
      },
      "Política de cookies actualizada.",
      "Error guardando la política de cookies.",
    );

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Editar pie, contacto, ...</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 border-b border-border">
        {FOOTER_LEGAL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setNotice("");
            }}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
        {activeTab === "pie" && (
          <>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Texto bajo logo</label>
              <input value={pieForm.footerLogoText} onChange={(e) => setPieForm((p) => ({ ...p, footerLogoText: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Texto bajo logo (Euskera)</label>
              <input value={pieForm.footerLogoTextEu} onChange={(e) => setPieForm((p) => ({ ...p, footerLogoTextEu: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={savePie} disabled={saving !== null || loading}>{saving === "pie" ? "Guardando..." : "Guardar pie"}</Button>
              <Button variant="outline" onClick={() => setPieForm({ footerLogoText: "", footerLogoTextEu: "" })} disabled={saving !== null || loading}>Limpiar</Button>
            </div>
          </>
        )}

        {activeTab === "contacto" && (
          <>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Dirección</label>
              <textarea value={contactoForm.footerAddress} onChange={(e) => setContactoForm((p) => ({ ...p, footerAddress: e.target.value }))} rows={2} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" disabled={loading} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Tfno</label>
                <input value={contactoForm.footerPhone} onChange={(e) => setContactoForm((p) => ({ ...p, footerPhone: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Email</label>
                <input value={contactoForm.footerEmail} onChange={(e) => setContactoForm((p) => ({ ...p, footerEmail: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Whatsapp</label>
              <input value={contactoForm.footerWhatsapp} onChange={(e) => setContactoForm((p) => ({ ...p, footerWhatsapp: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Horario</label>
              <input value={contactoForm.footerHours} onChange={(e) => setContactoForm((p) => ({ ...p, footerHours: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Mapa (URL embed)</label>
              <textarea value={contactoForm.footerMapEmbed} onChange={(e) => setContactoForm((p) => ({ ...p, footerMapEmbed: e.target.value }))} rows={3} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" disabled={loading} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={saveContacto} disabled={saving !== null || loading}>{saving === "contacto" ? "Guardando..." : "Guardar contacto"}</Button>
              <Button variant="outline" onClick={() => setContactoForm({ footerAddress: "", footerPhone: "", footerEmail: "", footerWhatsapp: "", footerHours: "", footerMapEmbed: "" })} disabled={saving !== null || loading}>Limpiar</Button>
            </div>
          </>
        )}

        {activeTab === "legal" && (
          <LegalFormFields
            form={legalForm}
            setForm={setLegalForm}
            loading={loading}
            saving={saving === "legal"}
            onSave={saveLegal}
            saveLabel="Guardar aviso legal"
          />
        )}

        {activeTab === "privacy" && (
          <LegalFormFields
            form={privacyForm}
            setForm={setPrivacyForm}
            loading={loading}
            saving={saving === "privacy"}
            onSave={savePrivacy}
            saveLabel="Guardar política"
          />
        )}

        {activeTab === "cookies" && (
          <LegalFormFields
            form={cookiesForm}
            setForm={setCookiesForm}
            loading={loading}
            saving={saving === "cookies"}
            onSave={saveCookies}
            saveLabel="Guardar cookies"
          />
        )}

        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
      </div>
    </div>
  );
}

/** Bloque de campos compartido por aviso legal, política de privacidad y cookies. */
function LegalFormFields({
  form,
  setForm,
  loading,
  saving,
  onSave,
  saveLabel,
}: {
  form: LegalForm;
  setForm: React.Dispatch<React.SetStateAction<LegalForm>>;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Título (ES)</label>
          <input value={form.titleEs} onChange={(e) => setForm((p) => ({ ...p, titleEs: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Título (EU)</label>
          <input value={form.titleEu} onChange={(e) => setForm((p) => ({ ...p, titleEu: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground" disabled={loading} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Texto completo (ES)</label>
        <textarea value={form.bodyEs} onChange={(e) => setForm((p) => ({ ...p, bodyEs: e.target.value }))} rows={10} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground resize-y" disabled={loading} />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Texto completo (EU)</label>
        <textarea value={form.bodyEu} onChange={(e) => setForm((p) => ({ ...p, bodyEu: e.target.value }))} rows={10} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground resize-y" disabled={loading} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={onSave} disabled={saving || loading}>{saving ? "Guardando..." : saveLabel}</Button>
      </div>
    </>
  );
}

export default function SeccionAdmin() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const token = useStore((s) => s.token);

  if (location === "/admin/odoo") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <ExternalLink className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Odoo</h1>
            <p className="text-sm text-muted-foreground">Sistema de gestión backend</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
          <p className="text-muted-foreground">Acceso al sistema de gestión Odoo 17</p>
          <p className="text-sm text-muted-foreground">
            URL: <span className="font-mono text-foreground">https://vls18755.dinaserver.com</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Base de datos: <span className="font-mono text-foreground">dinaserver</span>
          </p>
          <Button className="gap-2 mt-4" onClick={() => window.open("https://vls18755.dinaserver.com", "_blank")}>
            <ExternalLink className="w-4 h-4" /> Abrir Odoo
          </Button>
        </div>
        <OdooSyncPanel token={token ?? ""} />
        <DatabaseStatusPanel token={token ?? ""} />
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

  if (location === "/admin/app") return <AdminHomeEditor token={token} />;

  if (location === "/admin/footer") return <AdminFooterLegalEditor token={token} />;
  // Compatibilidad: la antigua opción "Política de privacidad" abre el editor
  // consolidado directamente en la pestaña correspondiente.
  if (location === "/admin/privacidad") return <AdminFooterLegalEditor token={token} initialTab="privacy" />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-foreground">{t("menu.roles")}</h1>
    </div>
  );
}
