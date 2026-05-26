import { useEffect, useMemo, useRef, useState } from "react";
import { getUserRoles, useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Camera, CheckCircle } from "lucide-react";
import type { AsociacionGrupoCamposUi } from "@/lib/asociacionGruposCampos";
import { parseGruposCamposJsonUi } from "@/lib/asociacionGruposCampos";
import MembershipCamposExtra from "./MembershipCamposExtra";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Normaliza un código de género de BD al estándar M/F/N (acepta "H" antiguo como M). */
function normalizeGeneroCode(v: unknown): "M" | "F" | "N" | "" {
  const raw = String(v ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "m" || raw === "h" || raw === "masculino" || raw === "male" || raw === "hombre" || raw === "g" || raw === "gizonezkoa") return "M";
  if (raw === "f" || raw === "female" || raw === "femenino" || raw === "mujer" || raw === "e" || raw === "emakumezkoa") return "F";
  if (raw === "n" || raw === "x" || raw === "nb" || raw === "other" || raw === "otro") return "N";
  return "";
}

export default function MiPerfil() {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const setUser = useStore((s) => s.setUser);
  const { t, lang } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    username: "",
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: "",
    avatarUrl: user?.avatar ?? "",
  });
  const roles = user ? getUserRoles(user) : [];
  const canEditFullProfile = roles.includes("usuario") || roles.includes("socio");
  const hasSocioRole = roles.includes("socio");
  const showMembershipRequest = roles.includes("usuario") && !hasSocioRole;
  const userUsername = (user as { username?: string } | null)?.username ?? "";
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const avatarPreview = String(form.avatarUrl || user?.avatar || "").trim();

  const [socioEstado, setSocioEstado] = useState<{
    id: number;
    estado: string;
    revision_campos?: string[];
    revision_mensaje?: string | null;
  } | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipNotice, setMembershipNotice] = useState("");
  const [membershipMsg, setMembershipMsg] = useState("");
  const [solicitudSocio, setSolicitudSocio] = useState({
    direccion: "",
    poblacion: "",
    provincia: "",
    dni: "",
    fecha_nacimiento: "",
    genero: "",
  });
  /** Data URL o vacío; si está vacío puede usarse la foto del perfil (`form.avatarUrl`). */
  const [membershipFoto, setMembershipFoto] = useState("");
  const membershipFotoInputRef = useRef<HTMLInputElement>(null);
  type MembershipSolicitudOpts = {
    cuota_importe: string;
    currency: string;
    metodos_pago: Array<{ id: string; label_es: string; label_eu: string }>;
  };
  const [membershipOptions, setMembershipOptions] = useState<MembershipSolicitudOpts | null>(null);
  const [metodoPagoSolicitud, setMetodoPagoSolicitud] = useState("");
  const [dniAnversoData, setDniAnversoData] = useState("");
  const [dniReversoData, setDniReversoData] = useState("");
  const dniAnversoInputRef = useRef<HTMLInputElement>(null);
  const dniReversoInputRef = useRef<HTMLInputElement>(null);
  const [membershipFormOpen, setMembershipFormOpen] = useState(false);
  const [membershipGrupoDefs, setMembershipGrupoDefs] = useState<AsociacionGrupoCamposUi[]>([]);
  const [membershipDatosExtra, setMembershipDatosExtra] = useState<Record<string, string>>({});

  const membershipRevisionSet = useMemo(
    () => new Set((socioEstado?.revision_campos ?? []).map((k) => String(k).trim().toLowerCase())),
    [socioEstado?.revision_campos],
  );

  const revField = (fieldKey: string, baseClass = "h-12") =>
    membershipRevisionSet.has(fieldKey.toLowerCase())
      ? `${baseClass} border-red-600 ring-2 ring-red-200`
      : baseClass;

  const [socioForm, setSocioForm] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    direccion: "",
    poblacion: "",
    provincia: "",
    dni: "",
    fecha_nacimiento: "",
    genero: "",
  });
  const [socioMeta, setSocioMeta] = useState({ estado: "", numero_socio: "" });
  const [socioSaving, setSocioSaving] = useState(false);
  const [socioNotice, setSocioNotice] = useState("");
  const [socioSaved, setSocioSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fallbackUsername = userUsername || (user.email ? String(user.email).split("@")[0] : "");
    const userTelefono =
      String((user as { telefono?: string | null; phone?: string | null } | null)?.telefono ?? "").trim() ||
      String((user as { telefono?: string | null; phone?: string | null } | null)?.phone ?? "").trim();
    setForm((prev) => ({
      ...prev,
      username: prev.username || fallbackUsername,
      nombre: user.name ?? prev.nombre ?? "",
      email: user.email ?? prev.email ?? "",
      telefono: prev.telefono || userTelefono,
      avatarUrl: user.avatar ?? prev.avatarUrl ?? "",
    }));
    if (!token) return;
    (async () => {
      try {
        const r = await fetch("/api/perfil/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const d = await r.json();
        const se = d?.socio_estado;
        if (se && typeof se === "object" && se !== null && "id" in se) {
          const rev = (se as { revision_campos?: unknown }).revision_campos;
          const rc = Array.isArray(rev) ? rev.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
          const estadoStr = String((se as { estado?: string }).estado ?? "");
          setSocioEstado({
            id: Number(se.id),
            estado: estadoStr,
            revision_campos: rc,
            revision_mensaje:
              (se as { revision_mensaje?: string | null }).revision_mensaje != null
                ? String((se as { revision_mensaje?: string | null }).revision_mensaje)
                : null,
          });
          const pf = (se as { solicitud_prefill?: Record<string, string> }).solicitud_prefill;
          if (pf && estadoStr === "pendiente_datos") {
            setSolicitudSocio({
              direccion: String(pf.direccion ?? ""),
              poblacion: String(pf.poblacion ?? ""),
              provincia: String(pf.provincia ?? ""),
              dni: String(pf.dni ?? ""),
              fecha_nacimiento: String(pf.fecha_nacimiento ?? "").slice(0, 10),
              genero: normalizeGeneroCode(pf.genero),
            });
            const mp = String(pf.metodo_pago ?? "").trim();
            if (mp) setMetodoPagoSolicitud(mp);
          }
        } else {
          setSocioEstado(null);
        }
        const mso = d?.membership_solicitud_options;
        if (mso && typeof mso === "object" && mso !== null && "cuota_importe" in mso) {
          setMembershipOptions(mso as MembershipSolicitudOpts);
        } else {
          setMembershipOptions(null);
        }
        setForm((prev) => ({
          ...prev,
          username: String(d?.username ?? prev.username ?? ""),
          nombre: String(d?.nombre ?? prev.nombre ?? ""),
          apellidos: String(d?.apellidos ?? ""),
          email: String(d?.email ?? prev.email ?? ""),
          telefono: String(d?.telefono ?? d?.phone ?? prev.telefono ?? ""),
          avatarUrl: String(d?.avatar_url ?? prev.avatarUrl ?? ""),
        }));

        const snap = useStore.getState().user;
        if (snap) {
          const apiAvatar = String(d?.avatar_url ?? "").trim();
          const nextName = String(d?.nombre ?? snap.name ?? "");
          const nextEmail = d?.email != null ? String(d.email) : snap.email;
          const norm = (v: string | null | undefined) => String(v ?? "").trim();
          const sameAvatar = norm(snap.avatar) === apiAvatar;
          const sameName = nextName === snap.name;
          const sameEmail = String(nextEmail ?? "") === String(snap.email ?? "");
          if (!sameAvatar || !sameName || !sameEmail) {
            useStore.getState().setUser({
              ...snap,
              name: nextName,
              email: nextEmail,
              avatar: apiAvatar || null,
            });
          }
        }
      } catch {
        // no-op
      }
    })();
  }, [token, user?.id, userUsername, canEditFullProfile]);

  useEffect(() => {
    if (!token || !showMembershipRequest) return;
    void (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/asociacion`);
        if (!r.ok) return;
        const d = await r.json();
        const raw = String(d?.datos?.gruposCamposJson ?? "").trim();
        const defs = parseGruposCamposJsonUi(raw);
        setMembershipGrupoDefs(defs === null ? [] : defs);
      } catch {
        setMembershipGrupoDefs([]);
      }
    })();
  }, [token, showMembershipRequest]);

  useEffect(() => {
    setMembershipDatosExtra({});
  }, [membershipGrupoDefs]);

  useEffect(() => {
    if (socioEstado?.estado === "pendiente_datos") {
      setMembershipFormOpen(true);
    }
  }, [socioEstado?.estado]);

  useEffect(() => {
    if (!token || !hasSocioRole) return;
    void (async () => {
      try {
        const r = await fetch("/api/perfil/mi-socio", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const s = await r.json();
        const fn = s?.fecha_nacimiento;
        const fechaStr =
          fn === null || fn === undefined
            ? ""
            : typeof fn === "string"
              ? fn.slice(0, 10)
              : String(fn).slice(0, 10);
        setSocioForm({
          nombre: String(s?.nombre ?? ""),
          apellidos: String(s?.apellidos ?? ""),
          email: String(s?.email ?? ""),
          telefono: String(s?.telefono ?? ""),
          direccion: String(s?.direccion ?? ""),
          poblacion: String(s?.poblacion ?? ""),
          provincia: String(s?.provincia ?? ""),
          dni: String(s?.dni ?? ""),
          fecha_nacimiento: fechaStr,
          genero: normalizeGeneroCode(s?.genero),
        });
        setSocioMeta({
          estado: String(s?.estado ?? ""),
          numero_socio: s?.numero_socio != null ? String(s.numero_socio) : "",
        });
      } catch {
        // no-op
      }
    })();
  }, [token, hasSocioRole]);

  const MAX_SOLICITUD_FILE_BYTES = 8 * 1024 * 1024;

  const fileToDataUrl = async (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });

  async function fileToDataUrlLimited(file: File): Promise<string> {
    if (file.size > MAX_SOLICITUD_FILE_BYTES) {
      throw new Error("file_too_large");
    }
    return fileToDataUrl(file);
  }

  const formatMembershipCuota = (amount: string) => {
    const n = Number.parseFloat(String(amount).replace(",", "."));
    if (!Number.isFinite(n)) return `${amount} €`;
    return new Intl.NumberFormat(lang === "eu" ? "eu-ES" : "es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(n);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canEditFullProfile) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return;
    }
    if (!form.username.trim() || !form.nombre.trim() || !form.apellidos.trim() || !form.email.trim() || !form.telefono.trim()) {
      setNotice("Complete todos los campos obligatorios.");
      return;
    }
    if (!form.password || form.password.length < 8) {
      setNotice("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setNotice("La confirmación de contraseña no coincide.");
      return;
    }
    setSaving(true);
    setNotice("");
    void (async () => {
      try {
        const r = await fetch("/api/perfil/me", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => null);
          throw new Error(String(d?.error ?? "No se pudo guardar el perfil"));
        }
        const d = await r.json();
        if (user) {
          setUser({
            ...user,
            name: String(d?.nombre ?? user.name ?? ""),
            email: d?.email ? String(d.email) : null,
            avatar: d?.avatar_url ? String(d.avatar_url) : user.avatar,
          });
        }
        setSaved(true);
        setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Error guardando perfil");
      } finally {
        setSaving(false);
      }
    })();
  };

  const membershipFotoEffective = membershipFoto.trim() || String(form.avatarUrl ?? "").trim();

  const handleSolicitarSocio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !showMembershipRequest) return;
    const nombre = form.nombre.trim();
    const apellidos = form.apellidos.trim();
    const email = form.email.trim();
    const telefono = form.telefono.trim();
    const { direccion, poblacion, provincia, dni, fecha_nacimiento, genero } = solicitudSocio;
    const gen = genero.trim().toUpperCase();

    if (
      !nombre ||
      !apellidos ||
      !email ||
      !telefono ||
      !direccion.trim() ||
      !poblacion.trim() ||
      !provincia.trim() ||
      !dni.trim() ||
      !fecha_nacimiento.trim() ||
      !gen
    ) {
      setMembershipNotice(t("perfil.membership_fields_required"));
      return;
    }
    if (gen !== "H" && gen !== "F" && gen !== "N") {
      setMembershipNotice(t("perfil.membership_fields_required"));
      return;
    }
    if (!membershipFotoEffective) {
      setMembershipNotice(t("perfil.membership_photo_required"));
      return;
    }
    if (!membershipOptions?.cuota_importe || !membershipOptions.metodos_pago?.length) {
      setMembershipNotice(t("perfil.membership_options_unavailable"));
      return;
    }
    if (!metodoPagoSolicitud.trim()) {
      setMembershipNotice(t("perfil.membership_payment_required"));
      return;
    }
    if (!dniAnversoData.trim() || !dniReversoData.trim()) {
      setMembershipNotice(t("perfil.membership_dni_docs_required"));
      return;
    }

    setMembershipLoading(true);
    setMembershipNotice("");
    void (async () => {
      try {
        const r = await fetch("/api/perfil/solicitar-socio", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nombre,
            apellidos,
            email,
            telefono,
            direccion: direccion.trim(),
            poblacion: poblacion.trim(),
            provincia: provincia.trim(),
            dni: dni.trim(),
            fecha_nacimiento: fecha_nacimiento.trim(),
            genero: gen,
            foto: membershipFotoEffective,
            mensaje: membershipMsg.trim() || undefined,
            metodo_pago: metodoPagoSolicitud.trim(),
            cuota_importe: String(membershipOptions.cuota_importe ?? "").trim(),
            dni_anverso: dniAnversoData.trim(),
            dni_reverso: dniReversoData.trim(),
            datos_extra: membershipDatosExtra,
          }),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) {
          const parts = [d?.error, d?.detalle].filter(Boolean).map(String);
          throw new Error(parts.join(" — ") || "No se pudo registrar la solicitud");
        }
        setSocioEstado({
          id: Number(d?.socio_id ?? socioEstado?.id ?? 0),
          estado: String(d?.estado ?? "solicitante"),
          revision_campos: [],
          revision_mensaje: null,
        });
        const snap = useStore.getState().user;
        if (snap && d?.ok) {
          const avatarFromApi = d?.avatar_url != null ? String(d.avatar_url).trim() : "";
          useStore.getState().setUser({
            ...snap,
            name: `${nombre} ${apellidos}`.trim() || snap.name,
            email,
            avatar: avatarFromApi || (membershipFotoEffective.startsWith("data:") ? snap.avatar : membershipFotoEffective) || snap.avatar,
          });
          if (avatarFromApi) {
            setForm((prev) => ({ ...prev, avatarUrl: avatarFromApi }));
          }
        }
        setMembershipNotice(t("perfil.membership_sent_ok"));
        setMembershipFormOpen(false);
      } catch (err) {
        setMembershipNotice(err instanceof Error ? err.message : "Error");
      } finally {
        setMembershipLoading(false);
      }
    })();
  };

  const handleSaveSocio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !hasSocioRole) return;
    setSocioSaving(true);
    setSocioNotice("");
    void (async () => {
      try {
        const r = await fetch("/api/perfil/mi-socio", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(socioForm),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(String(d?.error ?? "No se pudieron guardar los datos de socio"));
        }
        const fn = d?.fecha_nacimiento;
        const fechaStr =
          fn === null || fn === undefined
            ? ""
            : typeof fn === "string"
              ? fn.slice(0, 10)
              : String(fn).slice(0, 10);
        setSocioForm((prev) => ({
          ...prev,
          nombre: String(d?.nombre ?? prev.nombre),
          apellidos: String(d?.apellidos ?? prev.apellidos),
          email: String(d?.email ?? prev.email),
          telefono: String(d?.telefono ?? prev.telefono),
          direccion: String(d?.direccion ?? prev.direccion),
          poblacion: String(d?.poblacion ?? prev.poblacion),
          provincia: String(d?.provincia ?? prev.provincia),
          dni: String(d?.dni ?? prev.dni),
          fecha_nacimiento: fechaStr || prev.fecha_nacimiento,
          genero: normalizeGeneroCode(d?.genero) || prev.genero,
        }));
        setSocioMeta({
          estado: String(d?.estado ?? ""),
          numero_socio: d?.numero_socio != null ? String(d.numero_socio) : "",
        });
        const snap = useStore.getState().user;
        if (snap) {
          useStore.getState().setUser({
            ...snap,
            name: `${String(d?.nombre ?? "").trim()} ${String(d?.apellidos ?? "").trim()}`.trim() || snap.name,
            email: d?.email != null ? String(d.email) : snap.email,
          });
        }
        setSocioSaved(true);
        setTimeout(() => setSocioSaved(false), 3000);
      } catch (err) {
        setSocioNotice(err instanceof Error ? err.message : "Error");
      } finally {
        setSocioSaving(false);
      }
    })();
  };

  const membershipEst = socioEstado?.estado ?? "";
  const mostrarFormularioAltaSocio =
    showMembershipRequest && (socioEstado == null || membershipEst === "pendiente_datos");
  const solicitudEnCola = showMembershipRequest && membershipEst === "solicitante";
  const solicitudRechazadaMs = showMembershipRequest && membershipEst === "rechazado";
  const showSocioMembershipForm =
    mostrarFormularioAltaSocio && (membershipFormOpen || membershipEst === "pendiente_datos");
  const showSocioMembershipOpenCta = mostrarFormularioAltaSocio && !showSocioMembershipForm;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t("perfil.title")}</h1>

      {/* Avatar */}
      <div className="flex items-center gap-6 mb-10 p-6 bg-white rounded-2xl border border-border shadow-sm">
        <div className="relative">
          <button
            type="button"
            className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => avatarFileInputRef.current?.click()}
            aria-label={t("perfil.change_photo")}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
          </button>
          <button
            type="button"
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow pointer-events-none"
            tabIndex={-1}
            aria-hidden
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>
        <div>
          <p className="font-semibold text-lg text-foreground">{canEditFullProfile ? (form.username || "-") : user?.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{roles.length ? roles.join(", ") : user?.role}</p>
          <label className="text-sm text-primary hover:underline mt-1 cursor-pointer inline-block">
            {t("perfil.change_photo")}
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const dataUrl = await fileToDataUrl(file);
                  setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
                } catch {
                  setNotice("No se pudo leer la imagen seleccionada.");
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-6">
        <h2 className="text-xl font-semibold text-foreground">{t("perfil.personal_data")}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {canEditFullProfile ? (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.username")}</label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-12" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("common.name")}</label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={showMembershipRequest ? revField("nombre") : "h-12"}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("perfil.surname")}</label>
                <Input
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                  className={showMembershipRequest ? revField("apellidos") : "h-12"}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.email")}</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={showMembershipRequest ? revField("email") : "h-12"}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("common.phone")}</label>
                <Input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className={showMembershipRequest ? revField("telefono") : "h-12"}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.password")}</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="h-12"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.confirm_password")}</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="h-12"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("common.name")}</label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="h-12" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.email")}</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("common.phone")}</label>
                <Input type="tel" value={form.telefono} readOnly className="h-12 bg-muted/20" />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <Button type="submit" className="px-8 h-12 text-base" disabled={saving}>
            {t("perfil.save_changes")}
          </Button>
          {notice && <span className="text-sm text-red-600">{notice}</span>}
          {saved && (
            <span className="flex items-center gap-2 text-green-600 font-medium text-sm">
              <CheckCircle className="w-4 h-4" />
              {t("perfil.saved_ok")}
            </span>
          )}
        </div>
      </form>

      {showMembershipRequest && (
        <div className="mt-10 p-6 bg-white rounded-2xl border border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-foreground">{t("perfil.membership_title")}</h2>
          {solicitudRechazadaMs && (
            <p className="text-sm text-red-600 font-medium">{t("perfil.membership_rejected")}</p>
          )}
          {solicitudEnCola && (
            <p className="text-sm text-muted-foreground">{t("perfil.membership_pending")}</p>
          )}
          {showSocioMembershipOpenCta && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("perfil.membership_intro_collapsed")}</p>
              <Button type="button" className="h-11" onClick={() => setMembershipFormOpen(true)}>
                {t("perfil.membership_open_form")}
              </Button>
            </div>
          )}
          {showSocioMembershipForm && (
            <form onSubmit={handleSolicitarSocio} className="space-y-6 pt-2 border-t border-border">
              {membershipEst === "pendiente_datos" && socioEstado?.revision_mensaje ? (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 space-y-1">
                  <p className="font-semibold">{t("perfil.membership_revision_title")}</p>
                  <p>{socioEstado.revision_mensaje}</p>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground border-l-4 border-primary/30 pl-3">
                {t("perfil.membership_uses_personal_data")}
              </p>
              <p className="text-sm text-muted-foreground">{t("perfil.membership_form_intro_socio_only")}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold mb-1.5">{t("common.address")}</label>
                  <Input
                    required
                    value={solicitudSocio.direccion}
                    onChange={(e) => setSolicitudSocio({ ...solicitudSocio, direccion: e.target.value })}
                    className={revField("direccion")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("common.city")}</label>
                  <Input
                    required
                    value={solicitudSocio.poblacion}
                    onChange={(e) => setSolicitudSocio({ ...solicitudSocio, poblacion: e.target.value })}
                    className={revField("poblacion")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("common.province")}</label>
                  <Input
                    required
                    value={solicitudSocio.provincia}
                    onChange={(e) => setSolicitudSocio({ ...solicitudSocio, provincia: e.target.value })}
                    className={revField("provincia")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("perfil.dni")}</label>
                  <Input
                    required
                    value={solicitudSocio.dni}
                    onChange={(e) => setSolicitudSocio({ ...solicitudSocio, dni: e.target.value })}
                    className={revField("dni")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("perfil.birth_date")}</label>
                  <Input
                    required
                    type="date"
                    value={solicitudSocio.fecha_nacimiento}
                    onChange={(e) => setSolicitudSocio({ ...solicitudSocio, fecha_nacimiento: e.target.value })}
                    className={revField("fecha_nacimiento")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">{t("common.gender")}</label>
                  <select
                    required
                    value={solicitudSocio.genero}
                    onChange={(e) => setSolicitudSocio({ ...solicitudSocio, genero: e.target.value })}
                    className={
                      membershipRevisionSet.has("genero")
                        ? "flex h-12 w-full rounded-md border border-red-600 bg-background px-3 py-2 text-sm ring-2 ring-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        : "flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    }
                  >
                    <option value="">{t("perfil.membership_select_gender")}</option>
                    <option value="M">{t("socios.form.gender.male")}</option>
                    <option value="F">{t("socios.form.gender.female")}</option>
                    <option value="N">{t("socios.form.gender.nonbinary")}</option>
                  </select>
                </div>
              </div>

              {membershipOptions ? (
                <div
                  className={`rounded-xl border p-4 space-y-2 ${
                    membershipRevisionSet.has("cuota_importe")
                      ? "border-red-600 ring-2 ring-red-200 bg-red-50/40"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <p className="font-semibold text-foreground">{t("perfil.membership_fee_title")}</p>
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {formatMembershipCuota(membershipOptions.cuota_importe)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("perfil.membership_fee_note")}</p>
                </div>
              ) : (
                <p className="text-sm text-amber-700">{t("perfil.membership_options_unavailable")}</p>
              )}

              <div
                className={`space-y-3 rounded-xl p-3 ${
                  membershipRevisionSet.has("metodo_pago") ? "border border-red-600 ring-2 ring-red-200" : ""
                }`}
              >
                <p className="text-sm font-semibold text-foreground">{t("perfil.membership_payment_method")}</p>
                <div className="flex flex-col gap-2">
                  {(membershipOptions?.metodos_pago ?? []).map((m) => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="metodo_pago_socio"
                        value={m.id}
                        checked={metodoPagoSolicitud === m.id}
                        onChange={() => setMetodoPagoSolicitud(m.id)}
                      />
                      <span>{lang === "eu" ? m.label_eu : m.label_es}</span>
                    </label>
                  ))}
                </div>
              </div>

              <MembershipCamposExtra
                grupos={membershipGrupoDefs}
                values={membershipDatosExtra}
                onChange={(key, val) => setMembershipDatosExtra((p) => ({ ...p, [key]: val }))}
              />

              <div
                className={`space-y-4 rounded-xl border p-4 ${
                  membershipRevisionSet.has("dni_anverso") || membershipRevisionSet.has("dni_reverso")
                    ? "border-red-600 ring-2 ring-red-200"
                    : "border-border"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("perfil.membership_dni_docs_title")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("perfil.membership_dni_docs_hint")}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("perfil.membership_dni_front")}</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" className="h-10" onClick={() => dniAnversoInputRef.current?.click()}>
                        {t("socios.form.photo.upload")}
                      </Button>
                      <input
                        ref={dniAnversoInputRef}
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const dataUrl = await fileToDataUrlLimited(file);
                            setDniAnversoData(dataUrl);
                          } catch (err) {
                            setMembershipNotice(
                              err instanceof Error && err.message === "file_too_large"
                                ? t("perfil.membership_dni_file_too_large")
                                : t("socios.form.photo.read_error"),
                            );
                          }
                          e.target.value = "";
                        }}
                      />
                      {dniAnversoData ? (
                        <span className="text-sm text-green-700">{t("perfil.membership_doc_attached")}</span>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("perfil.membership_dni_back")}</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" className="h-10" onClick={() => dniReversoInputRef.current?.click()}>
                        {t("socios.form.photo.upload")}
                      </Button>
                      <input
                        ref={dniReversoInputRef}
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const dataUrl = await fileToDataUrlLimited(file);
                            setDniReversoData(dataUrl);
                          } catch (err) {
                            setMembershipNotice(
                              err instanceof Error && err.message === "file_too_large"
                                ? t("perfil.membership_dni_file_too_large")
                                : t("socios.form.photo.read_error"),
                            );
                          }
                          e.target.value = "";
                        }}
                      />
                      {dniReversoData ? (
                        <span className="text-sm text-green-700">{t("perfil.membership_doc_attached")}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`flex flex-col sm:flex-row gap-6 items-start rounded-xl p-2 ${
                  membershipRevisionSet.has("foto") ? "ring-2 ring-red-600 ring-offset-2" : ""
                }`}
              >
                <div className="relative shrink-0">
                  <button
                    type="button"
                    className={`w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      membershipRevisionSet.has("foto") ? "ring-4 ring-red-500" : ""
                    }`}
                    onClick={() => membershipFotoInputRef.current?.click()}
                    aria-label={t("perfil.membership_photo_label")}
                  >
                    {membershipFotoEffective ? (
                      <img src={membershipFotoEffective} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-primary" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow pointer-events-none"
                    tabIndex={-1}
                    aria-hidden
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <label className="block text-sm font-semibold">{t("perfil.membership_photo_label")}</label>
                  <p className="text-xs text-muted-foreground">{t("perfil.membership_photo_hint")}</p>
                  <label className="text-sm text-primary hover:underline cursor-pointer inline-block">
                    {t("socios.form.photo.upload")}
                    <input
                      ref={membershipFotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await fileToDataUrl(file);
                          setMembershipFoto(dataUrl);
                        } catch {
                          setMembershipNotice(t("socios.form.photo.read_error"));
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">{t("form.optional_message")}</label>
                <Textarea
                  value={membershipMsg}
                  onChange={(e) => setMembershipMsg(e.target.value)}
                  rows={3}
                  className="resize-y min-h-[80px]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="submit" className="h-11" disabled={membershipLoading || !membershipOptions}>
                  {membershipLoading
                    ? t("common.loading")
                    : membershipEst === "pendiente_datos"
                      ? t("perfil.membership_resubmit")
                      : t("perfil.membership_submit")}
                </Button>
                {membershipEst !== "pendiente_datos" ? (
                  <Button type="button" variant="outline" className="h-11" onClick={() => setMembershipFormOpen(false)}>
                    {t("perfil.membership_close_form")}
                  </Button>
                ) : null}
              </div>
              {membershipNotice && (
                <p className={`text-sm ${membershipNotice.includes("—") || membershipNotice.length > 120 ? "text-red-600" : "text-muted-foreground"}`}>
                  {membershipNotice}
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {hasSocioRole && (
        <form onSubmit={handleSaveSocio} className="mt-10 bg-white rounded-2xl border border-border shadow-sm p-8 space-y-6">
          <h2 className="text-xl font-semibold text-foreground">{t("perfil.socio_section_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("perfil.socio_section_hint")}</p>

          {(socioMeta.estado || socioMeta.numero_socio) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {socioMeta.estado && (
                <div>
                  <span className="font-semibold text-muted-foreground">{t("common.status")}: </span>
                  <span className="capitalize">{socioMeta.estado}</span>
                </div>
              )}
              {socioMeta.numero_socio && (
                <div>
                  <span className="font-semibold text-muted-foreground">{t("perfil.socio_number")}: </span>
                  <span>{socioMeta.numero_socio}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">{t("common.name")}</label>
              <Input value={socioForm.nombre} onChange={(e) => setSocioForm({ ...socioForm, nombre: e.target.value })} className="h-12" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">{t("common.surname")}</label>
              <Input value={socioForm.apellidos} onChange={(e) => setSocioForm({ ...socioForm, apellidos: e.target.value })} className="h-12" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">{t("form.email")}</label>
              <Input type="email" value={socioForm.email} onChange={(e) => setSocioForm({ ...socioForm, email: e.target.value })} className="h-12" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">{t("common.phone")}</label>
              <Input type="tel" value={socioForm.telefono} onChange={(e) => setSocioForm({ ...socioForm, telefono: e.target.value })} className="h-12" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1.5">{t("common.address")}</label>
              <Input value={socioForm.direccion} onChange={(e) => setSocioForm({ ...socioForm, direccion: e.target.value })} className="h-12" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">{t("common.city")}</label>
              <Input value={socioForm.poblacion} onChange={(e) => setSocioForm({ ...socioForm, poblacion: e.target.value })} className="h-12" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">{t("common.province")}</label>
              <Input value={socioForm.provincia} onChange={(e) => setSocioForm({ ...socioForm, provincia: e.target.value })} className="h-12" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">{t("perfil.dni")}</label>
              <Input value={socioForm.dni} onChange={(e) => setSocioForm({ ...socioForm, dni: e.target.value })} className="h-12" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">{t("perfil.birth_date")}</label>
              <Input
                type="date"
                value={socioForm.fecha_nacimiento}
                onChange={(e) => setSocioForm({ ...socioForm, fecha_nacimiento: e.target.value })}
                className="h-12"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">{t("common.gender")}</label>
              <select
                value={socioForm.genero || ""}
                onChange={(e) => setSocioForm({ ...socioForm, genero: e.target.value })}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">—</option>
                <option value="M">{t("socios.form.gender.male")}</option>
                <option value="F">{t("socios.form.gender.female")}</option>
                <option value="N">{t("socios.form.gender.nonbinary")}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Button type="submit" className="px-8 h-12 text-base" disabled={socioSaving}>
              {t("perfil.socio_save")}
            </Button>
            {socioNotice && <span className="text-sm text-red-600">{socioNotice}</span>}
            {socioSaved && (
              <span className="flex items-center gap-2 text-green-600 font-medium text-sm">
                <CheckCircle className="w-4 h-4" />
                {t("perfil.socio_saved_ok")}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
