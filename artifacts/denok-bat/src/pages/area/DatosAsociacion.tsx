import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store/use-store";
import { Building2 } from "lucide-react";
import GruposCamposEditor from "./GruposCamposEditor";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type AsociacionDatosForm = {
  nombre: string;
  nombreEu: string;
  cif: string;
  direccion: string;
  codigoPostal: string;
  poblacion: string;
  provincia: string;
  pais: string;
  web: string;
  email: string;
  telefono: string;
  cuotaIngresoSocio: string;
  cuotaAnualSocio: string;
  numeroCuentaBanco: string;
  ibanCuotas: string;
  textoInstruccionesPago: string;
  metodosPagoSolicitudJson: string;
  gruposCamposJson: string;
};

function emptyForm(): AsociacionDatosForm {
  return {
    nombre: "",
    nombreEu: "",
    cif: "",
    direccion: "",
    codigoPostal: "",
    poblacion: "",
    provincia: "",
    pais: "",
    web: "",
    email: "",
    telefono: "",
    cuotaIngresoSocio: "",
    cuotaAnualSocio: "",
    numeroCuentaBanco: "",
    ibanCuotas: "",
    textoInstruccionesPago: "",
    metodosPagoSolicitudJson: "",
    gruposCamposJson: "",
  };
}

export default function DatosAsociacion() {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const setToken = useStore((s) => s.setToken);
  const setUser = useStore((s) => s.setUser);
  const [form, setForm] = useState<AsociacionDatosForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleUnauthorized = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("denok-bat-storage");
    localStorage.removeItem("denok-bat-token");
    alert("Tu sesión ha expirado. Vuelve a iniciar sesión.");
    window.location.href = "/login";
  };

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const r = await fetch(`${API_BASE}/api/asociacion/admin`, { headers });
      if (!r.ok) {
        if (r.status === 401) {
          handleUnauthorized();
          return;
        }
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      const data = await r.json();
      const datos = data.datos as Partial<AsociacionDatosForm> | undefined;
      setForm({ ...emptyForm(), ...datos });
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
      setForm(emptyForm());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof AsociacionDatosForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!token) {
      setMessage({ type: "err", text: t("asoc.need_login") });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch(`${API_BASE}/api/asociacion`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ datos: form }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error(data.error ?? `HTTP ${r.status}`);
      }
      if (data.datos) setForm({ ...emptyForm(), ...data.datos });
      setMessage({ type: "ok", text: t("asoc.saved") });
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof AsociacionDatosForm, type: "text" | "email" | "url" = "text") => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor={key}>
        {t(`asoc.field.${key}`)}
      </label>
      <Input
        id={key}
        type={type}
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        className="rounded-xl"
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Building2 className="w-8 h-8 text-primary shrink-0 mt-1" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("asoc.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t("asoc.intro")}</p>
          </div>
        </div>
        <Button onClick={() => void load()} variant="outline" disabled={loading || saving}>
          {t("asoc.reload")}
        </Button>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === "ok" ? "bg-green-50 text-green-900 border border-green-200" : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{t("asoc.section.identity")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("nombre")}
              {field("nombreEu")}
              {field("cif")}
              {field("web", "url")}
              {field("email", "email")}
              {field("telefono")}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{t("asoc.section.address")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">{field("direccion")}</div>
              {field("codigoPostal")}
              {field("poblacion")}
              {field("provincia")}
              {field("pais")}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{t("asoc.section.fees")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("cuotaIngresoSocio")}
              {field("cuotaAnualSocio")}
              {field("numeroCuentaBanco")}
              {field("ibanCuotas")}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="textoInstruccionesPago">
                {t("asoc.field.textoInstruccionesPago")}
              </label>
              <textarea
                id="textoInstruccionesPago"
                className="w-full min-h-[100px] px-3 py-2 rounded-xl border border-border bg-background text-sm"
                value={form.textoInstruccionesPago}
                onChange={(e) => setField("textoInstruccionesPago", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="metodosPagoSolicitudJson">
                {t("asoc.field.metodosPagoSolicitudJson")}
              </label>
              <p className="text-xs text-muted-foreground">{t("asoc.metodos_hint")}</p>
              <textarea
                id="metodosPagoSolicitudJson"
                className="w-full min-h-[120px] font-mono text-xs px-3 py-2 rounded-xl border border-border bg-background"
                value={form.metodosPagoSolicitudJson}
                onChange={(e) => setField("metodosPagoSolicitudJson", e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{t("asoc.section.grupos")}</h2>
            <p className="text-sm text-muted-foreground">{t("asoc.grupos_intro")}</p>
            <GruposCamposEditor
              value={form.gruposCamposJson}
              onChange={(json) => setField("gruposCamposJson", json)}
            />
          </div>

          <div className="flex justify-end">
            <Button size="lg" className="min-w-[160px]" onClick={() => void handleSave()} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
