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

function AdminFooterEditor({ token }: { token: string | null }) {
  const [form, setForm] = useState({
    footerLogoText: "",
    footerLogoTextEu: "",
    footerAddress: "",
    footerPhone: "",
    footerEmail: "",
    footerWhatsapp: "",
    footerHours: "",
    footerMapEmbed: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/config/public`);
        const d = await r.json();
        setForm({
          footerLogoText: String(d?.["footer.logo_text"] ?? ""),
          footerLogoTextEu: String(d?.["footer.logo_text_eu"] ?? ""),
          footerAddress: String(d?.["footer.contact.address"] ?? ""),
          footerPhone: String(d?.["footer.contact.phone"] ?? ""),
          footerEmail: String(d?.["footer.contact.email"] ?? ""),
          footerWhatsapp: String(d?.["footer.contact.whatsapp"] ?? ""),
          footerHours: String(d?.["footer.contact.hours"] ?? ""),
          footerMapEmbed: String(d?.["footer.contact.map_embed"] ?? ""),
        });
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveFooter = async () => {
    if (!token) return;
    setSaving(true);
    setNotice("");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const entries = [
        ["footer.logo_text", form.footerLogoText],
        ["footer.logo_text_eu", form.footerLogoTextEu],
        ["footer.contact.address", form.footerAddress],
        ["footer.contact.phone", form.footerPhone],
        ["footer.contact.email", form.footerEmail],
        ["footer.contact.whatsapp", form.footerWhatsapp],
        ["footer.contact.hours", form.footerHours],
        ["footer.contact.map_embed", form.footerMapEmbed],
      ] as const;
      for (const [clave, valor] of entries) {
        const r = await fetch(`${API_BASE}/api/config/${encodeURIComponent(clave)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ valor: String(valor ?? "") }),
        });
        if (!r.ok) throw new Error("save failed");
      }
      const verify = await fetch(`${API_BASE}/api/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!verify.ok) throw new Error("verify failed");
      const saved = await verify.json();
      const persistedLogoTextEu = normalizeConfigValue(saved?.["footer.logo_text_eu"] ?? "");
      const persistedHours = normalizeConfigValue(saved?.["footer.contact.hours"] ?? "");
      const persistedMapEmbed = normalizeConfigValue(saved?.["footer.contact.map_embed"] ?? "");
      const inputLogoTextEu = normalizeConfigValue(form.footerLogoTextEu ?? "");
      const inputHours = normalizeConfigValue(form.footerHours ?? "");
      const inputMapEmbed = normalizeConfigValue(form.footerMapEmbed ?? "");
      if (persistedLogoTextEu !== inputLogoTextEu) {
        setNotice("Guardado parcial: revisa el texto bajo logo (Euskera), no se ha persistido correctamente.");
        return;
      }
      if (persistedHours !== inputHours) {
        setNotice("Guardado parcial: revisa el campo Horario, no se ha persistido correctamente.");
        return;
      }
      if (persistedMapEmbed !== inputMapEmbed) {
        setNotice("Guardado parcial: revisa el campo Mapa, no se ha persistido correctamente.");
        return;
      }
      setNotice("Pie y contacto actualizados correctamente.");
    } catch {
      setNotice("Error guardando el pie de página.");
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
        <h1 className="text-3xl font-bold text-foreground">Editor de pie y contacto</h1>
      </div>
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Texto bajo logo</label>
          <input value={form.footerLogoText} onChange={(e) => setForm((p) => ({ ...p, footerLogoText: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Texto bajo logo (Euskera)</label>
          <input value={form.footerLogoTextEu} onChange={(e) => setForm((p) => ({ ...p, footerLogoTextEu: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Contacto · Dirección</label>
          <textarea value={form.footerAddress} onChange={(e) => setForm((p) => ({ ...p, footerAddress: e.target.value }))} rows={2} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" disabled={loading} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Contacto · Tfno</label>
            <input value={form.footerPhone} onChange={(e) => setForm((p) => ({ ...p, footerPhone: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Contacto · Email</label>
            <input value={form.footerEmail} onChange={(e) => setForm((p) => ({ ...p, footerEmail: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Contacto · Wp</label>
          <input value={form.footerWhatsapp} onChange={(e) => setForm((p) => ({ ...p, footerWhatsapp: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Contacto · Horario</label>
          <input value={form.footerHours} onChange={(e) => setForm((p) => ({ ...p, footerHours: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Contacto · Mapa (URL embed)</label>
          <textarea value={form.footerMapEmbed} onChange={(e) => setForm((p) => ({ ...p, footerMapEmbed: e.target.value }))} rows={3} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" disabled={loading} />
        </div>
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
        <div className="flex gap-3 pt-2">
          <Button onClick={saveFooter} disabled={saving || loading}>{saving ? "Guardando..." : "Guardar pie"}</Button>
          <Button variant="outline" onClick={() => setForm({ footerLogoText: "", footerLogoTextEu: "", footerAddress: "", footerPhone: "", footerEmail: "", footerWhatsapp: "", footerHours: "", footerMapEmbed: "" })} disabled={saving || loading}>Limpiar</Button>
        </div>
      </div>
    </div>
  );
}

function AdminPrivacyEditor({ token }: { token: string | null }) {
  const [form, setForm] = useState({
    titleEs: "",
    titleEu: "",
    bodyEs: "",
    bodyEu: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/config/public`);
        const d = await r.json();
        setForm({
          titleEs: String(d?.["privacy.policy_title_es"] ?? ""),
          titleEu: String(d?.["privacy.policy_title_eu"] ?? ""),
          bodyEs: String(d?.["privacy.policy_body_es"] ?? ""),
          bodyEu: String(d?.["privacy.policy_body_eu"] ?? ""),
        });
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const savePrivacy = async () => {
    if (!token) return;
    setSaving(true);
    setNotice("");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const entries = [
        ["privacy.policy_title_es", form.titleEs],
        ["privacy.policy_title_eu", form.titleEu],
        ["privacy.policy_body_es", form.bodyEs],
        ["privacy.policy_body_eu", form.bodyEu],
      ] as const;
      for (const [clave, valor] of entries) {
        const r = await fetch(`${API_BASE}/api/config/${encodeURIComponent(clave)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ valor: String(valor ?? "") }),
        });
        if (!r.ok) throw new Error("save failed");
      }
      setNotice("Política de privacidad actualizada.");
    } catch {
      setNotice("Error guardando la política de privacidad.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Editor política de privacidad</h1>
      </div>
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
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
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
        <div className="flex gap-3 pt-2">
          <Button onClick={savePrivacy} disabled={saving || loading}>{saving ? "Guardando..." : "Guardar política"}</Button>
        </div>
      </div>
    </div>
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

  if (location === "/admin/footer") return <AdminFooterEditor token={token} />;
  if (location === "/admin/privacidad") return <AdminPrivacyEditor token={token} />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-foreground">{t("menu.roles")}</h1>
    </div>
  );
}
