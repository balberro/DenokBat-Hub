import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/use-store";

const API_ROOT = "/api";

type ActividadAdmin = {
  id: number;
  nombre: string;
  nombreEu: string | null;
  descripcion: string | null;
  descripcionEu: string | null;
  categoria: string | null;
  horario: string | null;
  plazasTotal: number | null;
  plazasDisponibles: number | null;
  precio: string | number | null;
  estado: string | null;
  imagen: string | null;
  cardTexto?: string | null;
  cardTextoEu?: string | null;
  calendario?: string | null;
  calendarioEu?: string | null;
  horarioEu?: string | null;
  calendarStartMonth?: string | null;
  calendarDaysJson?: string | null;
  monitorNombre?: string | null;
  monitorNif?: string | null;
  monitorDireccion?: string | null;
  monitorTelefono?: string | null;
  monitorEmail?: string | null;
  localNombre?: string | null;
  localUbicacion?: string | null;
  localConcesorNombre?: string | null;
  localConcesorTelefono?: string | null;
  localConcesorEmail?: string | null;
  localContratoPdfUrl?: string | null;
  facturasMonitorJson?: string | null;
};

type ActividadDraft = {
  nombre: string;
  nombreEu: string;
  descripcion: string;
  descripcionEu: string;
  categoria: string;
  horario: string;
  horarioEu: string;
  plazasTotal: string;
  plazasDisponibles: string;
  precio: string;
  estado: string;
  imagen: string;
  cardTexto: string;
  cardTextoEu: string;
  calendario: string;
  calendarioEu: string;
  calendarStartMonth: string;
  calendarDaysJson: string;
  monitorNombre: string;
  monitorNif: string;
  monitorDireccion: string;
  monitorTelefono: string;
  monitorEmail: string;
  localNombre: string;
  localUbicacion: string;
  localConcesorNombre: string;
  localConcesorTelefono: string;
  localConcesorEmail: string;
  localContratoPdfUrl: string;
  facturasMonitorJson: string;
};

type FacturaMonitorOdoo = {
  id: number;
  concepto: string;
  importe: number;
  pagada: boolean;
  observaciones: string;
  fecha: string;
};

type FacturasOdooStatus = "ok" | "no_data" | "no_monitor_partner" | "odoo_unavailable";

type InscritoRow = {
  id: number;
  socioId: number | null;
  nombre: string;
  email: string;
  telefono: string;
  precio: string | number;
  pagoRealizado: boolean;
  observaciones: string;
};

function monthToInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const CURRENT_MONTH = monthToInputValue(new Date());

function parseMonthInput(value: string) {
  const [y, m] = String(value || "").split("-");
  const year = Number(y);
  const month = Number(m);
  if (!year || !month) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return new Date(year, month - 1, 1);
}

function parseSelectedDays(raw: string): Set<string> {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.map((v) => String(v)));
  } catch {
    return new Set<string>();
  }
}

function toIsoDate(year: number, monthIdx: number, day: number) {
  const m = String(monthIdx + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function toDraft(a: ActividadAdmin): ActividadDraft {
  return {
    nombre: String(a.nombre ?? ""),
    nombreEu: String(a.nombreEu ?? ""),
    descripcion: String(a.descripcion ?? ""),
    descripcionEu: String(a.descripcionEu ?? ""),
    categoria: String(a.categoria ?? ""),
    horario: String(a.horario ?? ""),
    horarioEu: String(a.horarioEu ?? ""),
    plazasTotal: String(a.plazasTotal ?? 0),
    plazasDisponibles: String(a.plazasDisponibles ?? 0),
    precio: String(a.precio ?? "0"),
    estado: String(a.estado ?? "disponible"),
    imagen: String(a.imagen ?? ""),
    cardTexto: String(a.cardTexto ?? ""),
    cardTextoEu: String(a.cardTextoEu ?? ""),
    calendario: String(a.calendario ?? ""),
    calendarioEu: String(a.calendarioEu ?? ""),
    calendarStartMonth: String(a.calendarStartMonth ?? CURRENT_MONTH),
    calendarDaysJson: String(a.calendarDaysJson ?? "[]"),
    monitorNombre: String(a.monitorNombre ?? ""),
    monitorNif: String(a.monitorNif ?? ""),
    monitorDireccion: String(a.monitorDireccion ?? ""),
    monitorTelefono: String(a.monitorTelefono ?? ""),
    monitorEmail: String(a.monitorEmail ?? ""),
    localNombre: String(a.localNombre ?? ""),
    localUbicacion: String(a.localUbicacion ?? ""),
    localConcesorNombre: String(a.localConcesorNombre ?? ""),
    localConcesorTelefono: String(a.localConcesorTelefono ?? ""),
    localConcesorEmail: String(a.localConcesorEmail ?? ""),
    localContratoPdfUrl: String(a.localContratoPdfUrl ?? ""),
    facturasMonitorJson: String(a.facturasMonitorJson ?? "[]"),
  };
}

export default function AdminActividades() {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<ActividadAdmin[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ActividadDraft>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<"detalle" | "monitor" | "local" | "asistente" | "facturas">("detalle");
  const [creating, setCreating] = useState(false);
  const [sendingMonitorMail, setSendingMonitorMail] = useState(false);
  const [monitorMail, setMonitorMail] = useState({ subject: "", message: "" });
  const [sendingLocalMail, setSendingLocalMail] = useState(false);
  const [localMail, setLocalMail] = useState({ subject: "", message: "" });
  const [newActivity, setNewActivity] = useState({
    nombre: "",
    nombreEu: "",
    categoria: "",
    horario: "",
  });
  const [inscritos, setInscritos] = useState<InscritoRow[]>([]);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [facturasMonitorOdoo, setFacturasMonitorOdoo] = useState<FacturaMonitorOdoo[]>([]);
  const [loadingFacturasMonitor, setLoadingFacturasMonitor] = useState(false);
  const [facturasOdooStatus, setFacturasOdooStatus] = useState<FacturasOdooStatus>("ok");

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
    }),
    [token],
  );

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const load = async () => {
    setLoading(true);
    setNotice("");
    try {
      const r = await fetch(`${API_ROOT}/actividades?limit=100`);
      if (!r.ok) throw new Error("load actividades failed");
      const data = await r.json();
      const list = (Array.isArray(data?.items) ? data.items : []) as ActividadAdmin[];
      setItems(list);
      const byId: Record<number, ActividadDraft> = {};
      for (const a of list) byId[a.id] = toDraft(a);
      setDrafts(byId);
      if (list.length > 0 && !list.some((a) => a.id === activeId)) setActiveId(list[0].id);
    } catch {
      setNotice(t("admin.activities.load_error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const active = items.find((a) => a.id === activeId) ?? null;
  const draft = active ? drafts[active.id] : null;
  const selectedDays = draft ? parseSelectedDays(draft.calendarDaysJson) : new Set<string>();
  const startMonth = parseMonthInput(draft?.calendarStartMonth ?? CURRENT_MONTH);
  const [calendarMonthIndex, setCalendarMonthIndex] = useState(0);
  const visibleMonths = Array.from({ length: 3 }, (_, idx) =>
    new Date(startMonth.getFullYear(), startMonth.getMonth() + calendarMonthIndex + idx, 1),
  );

  const saveActive = async () => {
    if (!active || !draft || !token) return;
    setSaving(true);
    setNotice("");
    try {
      const body = {
        nombre: draft.nombre,
        nombreEu: draft.nombreEu,
        descripcion: draft.descripcion,
        descripcionEu: draft.descripcionEu,
        categoria: draft.categoria,
        horario: draft.horario,
        horarioEu: draft.horarioEu,
        plazasTotal: Number(draft.plazasTotal || 0),
        plazasDisponibles: Number(draft.plazasDisponibles || 0),
        precio: draft.precio || "0",
        estado: draft.estado || "disponible",
        fotoUrl: draft.imagen || null,
        cardTexto: draft.cardTexto,
        cardTextoEu: draft.cardTextoEu,
        calendario: draft.calendario,
        calendarioEu: draft.calendarioEu,
        calendarStartMonth: draft.calendarStartMonth,
        calendarDaysJson: draft.calendarDaysJson,
        monitorNombre: draft.monitorNombre,
        monitorNif: draft.monitorNif,
        monitorDireccion: draft.monitorDireccion,
        monitorTelefono: draft.monitorTelefono,
        monitorEmail: draft.monitorEmail,
        localNombre: draft.localNombre,
        localUbicacion: draft.localUbicacion,
        localConcesorNombre: draft.localConcesorNombre,
        localConcesorTelefono: draft.localConcesorTelefono,
        localConcesorEmail: draft.localConcesorEmail,
        localContratoPdfUrl: draft.localContratoPdfUrl,
        facturasMonitorJson: draft.facturasMonitorJson,
      };
      const r = await fetch(`${API_ROOT}/actividades/${active.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        let detalle = "";
        try {
          const payload = await r.json();
          detalle = String(payload?.detalle || payload?.error || "");
        } catch {
          try {
            const text = await r.text();
            detalle = text ? String(text).slice(0, 240) : "";
          } catch {
            detalle = "";
          }
        }
        const statusMsg = `HTTP ${r.status}`;
        throw new Error(detalle ? `${statusMsg} · ${detalle}` : statusMsg);
      }
      await load();
      setNotice(t("admin.activities.save_success"));
    } catch (err) {
      const reason = err instanceof Error ? err.message : "";
      setNotice(reason ? `${t("admin.activities.save_error")} ${reason}` : t("admin.activities.save_error"));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setCalendarMonthIndex(0);
  }, [activeId, draft?.calendarStartMonth]);

  useEffect(() => {
    setActiveSection("detalle");
  }, [activeId]);

  useEffect(() => {
    if (!activeId || activeSection !== "asistente" || !token) return;
    (async () => {
      setLoadingInscritos(true);
      try {
        const r = await fetch(`${API_ROOT}/actividades/${activeId}/inscritos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error("load inscritos failed");
        const d = await r.json();
        setInscritos(Array.isArray(d?.items) ? d.items : []);
      } catch {
        setNotice("Error cargando inscritos.");
      } finally {
        setLoadingInscritos(false);
      }
    })();
  }, [activeId, activeSection, token]);

  useEffect(() => {
    if (!activeId || activeSection !== "facturas" || !token) return;
    (async () => {
      setLoadingFacturasMonitor(true);
      try {
        const r = await fetch(`${API_ROOT}/actividades/${activeId}/facturas-monitor`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error("load facturas monitor failed");
        const d = await r.json();
        setFacturasMonitorOdoo(Array.isArray(d?.items) ? d.items : []);
        setFacturasOdooStatus((d?.odooStatus as FacturasOdooStatus) || "ok");
      } catch {
        setFacturasOdooStatus("odoo_unavailable");
        setFacturasMonitorOdoo([]);
      } finally {
        setLoadingFacturasMonitor(false);
      }
    })();
  }, [activeId, activeSection, token]);

  const toggleDay = (isoDate: string) => {
    if (!active || !draft) return;
    const next = new Set(selectedDays);
    if (next.has(isoDate)) next.delete(isoDate);
    else next.add(isoDate);
    const asSorted = Array.from(next).sort();
    setDrafts((p) => ({ ...p, [active.id]: { ...draft, calendarDaysJson: JSON.stringify(asSorted) } }));
  };

  const createActivity = async () => {
    if (!token) return;
    if (!newActivity.nombre.trim()) {
      setNotice(t("admin.activities.create_error_required_name"));
      return;
    }
    setCreating(true);
    setNotice("");
    try {
      const r = await fetch(`${API_ROOT}/actividades`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          nombre: newActivity.nombre.trim(),
          nombreEu: newActivity.nombreEu.trim(),
          categoria: newActivity.categoria.trim(),
          horario: newActivity.horario.trim(),
          descripcion: "",
          descripcionEu: "",
          plazasTotal: 0,
          precio: "0",
        }),
      });
      if (!r.ok) throw new Error("create actividad failed");
      const created = (await r.json()) as ActividadAdmin;
      setNewActivity({ nombre: "", nombreEu: "", categoria: "", horario: "" });
      await load();
      if (created?.id) setActiveId(created.id);
      setNotice(t("admin.activities.create_success"));
    } catch {
      setNotice(t("admin.activities.create_error"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">{t("menu.admin_actividades")}</h1>
        <Button onClick={createActivity} disabled={loading || saving || creating}>
          {creating ? t("admin.activities.creating_button") : t("admin.activities.create_button")}
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
        <p className="text-sm text-muted-foreground">{t("admin.activities.quick_create")}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <input
            value={newActivity.nombre}
            onChange={(e) => setNewActivity((p) => ({ ...p, nombre: e.target.value }))}
            placeholder="Nombre (ES) *"
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
            disabled={loading || saving || creating}
          />
          <input
            value={newActivity.nombreEu}
            onChange={(e) => setNewActivity((p) => ({ ...p, nombreEu: e.target.value }))}
            placeholder="Nombre (EU)"
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
            disabled={loading || saving || creating}
          />
          <input
            value={newActivity.categoria}
            onChange={(e) => setNewActivity((p) => ({ ...p, categoria: e.target.value }))}
            placeholder="Categoría"
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
            disabled={loading || saving || creating}
          />
          <input
            value={newActivity.horario}
            onChange={(e) => setNewActivity((p) => ({ ...p, horario: e.target.value }))}
            placeholder="Horario"
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
            disabled={loading || saving || creating}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
        <p className="text-sm text-muted-foreground mb-3">{t("admin.activities.editor_tabs")}</p>
        <div className="flex flex-wrap gap-2">
          {items.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={`px-3 py-2 rounded-lg text-sm border ${
                activeId === a.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border"
              }`}
              disabled={loading || saving}
            >
              {a.nombre}
            </button>
          ))}
        </div>
      </div>

      {active && draft && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground">{t("admin.activities.detail_title")}</h2>
          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            {[
              { key: "detalle", label: "Detalle" },
              { key: "monitor", label: "Monitor" },
              { key: "local", label: "Local" },
              { key: "asistente", label: "Inscritos" },
              { key: "facturas", label: "Facturas" },
            ].map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key as typeof activeSection)}
                className={`px-3 py-2 rounded-lg text-sm border ${
                  activeSection === section.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeSection === "detalle" && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.card_name_es")}</label>
                  <input value={draft.nombre} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, nombre: e.target.value } }))} placeholder="Título visible en la tarjeta" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.card_name_eu")}</label>
                  <input value={draft.nombreEu} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, nombreEu: e.target.value } }))} placeholder="Izenburua txartelan" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.schedule_es")}</label>
                  <input value={draft.horario} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, horario: e.target.value } }))} placeholder="Ej: Lunes y Miércoles · 10:00-11:00h" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.schedule_eu")}</label>
                  <input value={draft.horarioEu} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, horarioEu: e.target.value } }))} placeholder="Adib: Astelehena eta Asteazkena · 10:00-11:00" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.total_spots")}</label>
                  <input value={draft.plazasTotal} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, plazasTotal: e.target.value } }))} placeholder="Capacidad máxima de la actividad" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.available_spots")}</label>
                  <input value={draft.plazasDisponibles} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, plazasDisponibles: e.target.value } }))} placeholder="Plazas libres actualmente" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">Precio inscripción (EUR)</label>
                  <input value={draft.precio} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, precio: e.target.value } }))} placeholder="Ej: 0, 5, 12.50" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.status")}</label>
                  <select
                    value={draft.estado}
                    onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, estado: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    disabled={loading || saving}
                  >
                    <option value="prevista">{t("status.prevista")}</option>
                    <option value="abierta">{t("status.abierta")}</option>
                    <option value="en_curso">{t("status.en_curso")}</option>
                    <option value="terminada">{t("status.terminada")}</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.detail_es")}</label>
                  <textarea value={draft.descripcion} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, descripcion: e.target.value } }))} rows={4} placeholder="Texto largo que se ve dentro de la actividad" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-y" disabled={loading || saving} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.detail_eu")}</label>
                  <textarea value={draft.descripcionEu} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, descripcionEu: e.target.value } }))} rows={4} placeholder="Jarduera barruan ikusiko den testu luzea" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-y" disabled={loading || saving} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.card_text_es")}</label>
                  <textarea value={draft.cardTexto} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, cardTexto: e.target.value } }))} rows={2} placeholder="Resumen corto que enlaza a detalles" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-y" disabled={loading || saving} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">{t("admin.activities.field.card_text_eu")}</label>
                  <textarea value={draft.cardTextoEu} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, cardTextoEu: e.target.value } }))} rows={2} placeholder="Xehetasunetara eramaten duen laburpena" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-y" disabled={loading || saving} />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">{t("admin.activities.calendar.title")}</h3>
                <div className="grid sm:grid-cols-[auto_auto_1fr] gap-2 items-center">
                  <label className="text-sm text-muted-foreground">{t("admin.activities.calendar.start_month")}</label>
                  <input
                    type="month"
                    value={draft.calendarStartMonth}
                    onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, calendarStartMonth: e.target.value } }))}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    disabled={loading || saving}
                  />
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => setCalendarMonthIndex((v) => Math.max(0, v - 1))} disabled={calendarMonthIndex <= 0 || loading || saving}>{t("admin.activities.calendar.prev_month")}</Button>
                    <Button type="button" variant="outline" onClick={() => setCalendarMonthIndex((v) => Math.min(9, v + 1))} disabled={calendarMonthIndex >= 9 || loading || saving}>{t("admin.activities.calendar.next_month")}</Button>
                    <span className="text-sm text-muted-foreground">
                      {t("admin.activities.calendar.range")
                        .replace("{start}", String(calendarMonthIndex + 1))
                        .replace("{end}", String(calendarMonthIndex + 3))}
                    </span>
                  </div>
                </div>
                <div className="grid lg:grid-cols-3 gap-3">
                  {visibleMonths.map((visibleMonth, monthBlockIdx) => (
                    <div key={`${visibleMonth.getFullYear()}-${visibleMonth.getMonth()}-${monthBlockIdx}`} className="rounded-xl border border-border p-3">
                      <p className="text-sm font-semibold text-foreground mb-2">
                        {visibleMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                      </p>
                      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1">
                        {[
                          t("calendar.week.monday"),
                          t("calendar.week.tuesday"),
                          t("calendar.week.wednesday"),
                          t("calendar.week.thursday"),
                          t("calendar.week.friday"),
                          t("calendar.week.saturday"),
                          t("calendar.week.sunday"),
                        ].map((d) => <span key={d}>{d}</span>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const y = visibleMonth.getFullYear();
                          const m = visibleMonth.getMonth();
                          const firstDay = new Date(y, m, 1);
                          const daysInMonth = new Date(y, m + 1, 0).getDate();
                          const offset = (firstDay.getDay() + 6) % 7;
                          const cells: any[] = [];
                          for (let i = 0; i < offset; i += 1) cells.push(<div key={`empty-${i}`} className="h-8" />);
                          for (let day = 1; day <= daysInMonth; day += 1) {
                            const iso = toIsoDate(y, m, day);
                            const activeDay = selectedDays.has(iso);
                            cells.push(
                              <button
                                type="button"
                                key={iso}
                                onClick={() => toggleDay(iso)}
                                className={`h-8 rounded-md border text-xs ${activeDay ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border"}`}
                                disabled={loading || saving}
                              >
                                {day}
                              </button>,
                            );
                          }
                          return cells;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("admin.activities.calendar.selected_days_total")} <span className="font-semibold text-foreground">{selectedDays.size}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-muted-foreground">{t("admin.activities.photo.label")}</label>
                <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                  <input value={draft.imagen} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, imagen: e.target.value } }))} placeholder="URL o DataURL de imagen" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <label className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm cursor-pointer inline-flex items-center gap-2">
                    <Camera className="w-4 h-4" /> {t("admin.activities.photo.upload")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={loading || saving}
                      onChange={async (e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (!file) return;
                        const image = await readFileAsDataUrl(file);
                        setDrafts((p) => ({ ...p, [active.id]: { ...draft, imagen: image } }));
                      }}
                    />
                  </label>
                </div>
                {draft.imagen && <img src={draft.imagen} alt="Vista previa actividad" className="h-44 w-full object-cover rounded-xl border border-border" />}
              </div>
            </>
          )}

          {activeSection === "monitor" && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">Nombre / razón fiscal</label>
                  <input value={draft.monitorNombre} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, monitorNombre: e.target.value } }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" placeholder="Nombre completo o razón social" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">NIF / CIF</label>
                  <input value={draft.monitorNif} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, monitorNif: e.target.value } }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" placeholder="Documento fiscal" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground">Dirección fiscal</label>
                  <textarea value={draft.monitorDireccion} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, monitorDireccion: e.target.value } }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-y" placeholder="Dirección completa" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">Teléfono de contacto</label>
                  <input value={draft.monitorTelefono} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, monitorTelefono: e.target.value } }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" placeholder="Teléfono" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">Email de contacto</label>
                  <input value={draft.monitorEmail} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, monitorEmail: e.target.value } }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" placeholder="correo@dominio.com" />
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
                <h3 className="font-semibold text-foreground">Enviar correo al monitor</h3>
                <p className="text-sm text-muted-foreground">El remitente será el correo del usuario con sesión iniciada.</p>
                <input value={monitorMail.subject} onChange={(e) => setMonitorMail((p) => ({ ...p, subject: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" placeholder="Asunto" />
                <textarea value={monitorMail.message} onChange={(e) => setMonitorMail((p) => ({ ...p, message: e.target.value }))} rows={4} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-y" placeholder="Mensaje" />
                <Button
                  type="button"
                  variant="outline"
                  disabled={sendingMonitorMail || !token || !draft.monitorEmail || !monitorMail.subject || !monitorMail.message}
                  onClick={async () => {
                    if (!token || !draft.monitorEmail) return;
                    setSendingMonitorMail(true);
                    setNotice("");
                    try {
                      const r = await fetch(`${API_ROOT}/actividades/${active.id}/monitor-email`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                          to: draft.monitorEmail,
                          subject: monitorMail.subject,
                          message: monitorMail.message,
                        }),
                      });
                      if (!r.ok) throw new Error("send monitor email failed");
                      setMonitorMail({ subject: "", message: "" });
                      setNotice("Correo enviado al monitor.");
                    } catch {
                      setNotice("No se pudo enviar el correo al monitor.");
                    } finally {
                      setSendingMonitorMail(false);
                    }
                  }}
                >
                  {sendingMonitorMail ? "Enviando..." : "Enviar correo"}
                </Button>
              </div>

              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
                <h3 className="font-semibold text-foreground">Contrato</h3>
                <p className="text-sm text-muted-foreground">
                  Todas las fases forman parte del mismo expediente contractual. El documento se construye con los sucesivos mensajes enviados por correo entre las partes.
                </p>
                <div className="rounded-lg border border-border bg-background px-3 py-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">Expediente contractual</p>
                  <p className="text-xs text-muted-foreground">
                    Incluye propuesta, contrapropuesta, preacuerdo, contrato y resolución como partes de un mismo hilo documental.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cada correo enviado al monitor puede formar parte del historial del expediente.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-muted-foreground">Contrato firmado (PDF)</label>
                  <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                    <input
                      placeholder="URL o DataURL del contrato firmado"
                      className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                      disabled
                    />
                    <label className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm cursor-pointer inline-flex items-center gap-2">
                      Subir PDF firmado
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        disabled
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Preparado para adjuntar el PDF firmado como documento final del expediente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "local" && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">Nombre del local o lugar</label>
                  <input value={draft.localNombre} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, localNombre: e.target.value } }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" placeholder="Centro, sala o recinto" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground">Ubicación detallada de la sala o lugar</label>
                  <textarea value={draft.localUbicacion} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, localUbicacion: e.target.value } }))} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-y" placeholder="Edificio, planta, sala, accesos, referencias, etc." />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">Concesor · Nombre</label>
                  <input value={draft.localConcesorNombre} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, localConcesorNombre: e.target.value } }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" placeholder="Nombre del concesor" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">Concesor · Teléfono</label>
                  <input value={draft.localConcesorTelefono} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, localConcesorTelefono: e.target.value } }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" placeholder="Teléfono del concesor" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">Concesor · Email</label>
                  <input value={draft.localConcesorEmail} onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, localConcesorEmail: e.target.value } }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" placeholder="correo@dominio.com" />
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
                <h3 className="font-semibold text-foreground">Enviar correo al concesor</h3>
                <p className="text-sm text-muted-foreground">El remitente será el correo del usuario con sesión iniciada.</p>
                <input value={localMail.subject} onChange={(e) => setLocalMail((p) => ({ ...p, subject: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" placeholder="Asunto" />
                <textarea value={localMail.message} onChange={(e) => setLocalMail((p) => ({ ...p, message: e.target.value }))} rows={4} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-y" placeholder="Mensaje" />
                <Button
                  type="button"
                  variant="outline"
                  disabled={sendingLocalMail || !token || !draft.localConcesorEmail || !localMail.subject || !localMail.message}
                  onClick={async () => {
                    if (!token || !draft.localConcesorEmail) return;
                    setSendingLocalMail(true);
                    setNotice("");
                    try {
                      const r = await fetch(`${API_ROOT}/actividades/${active.id}/local-email`, {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({
                          to: draft.localConcesorEmail,
                          subject: localMail.subject,
                          message: localMail.message,
                        }),
                      });
                      if (!r.ok) throw new Error("send local email failed");
                      setLocalMail({ subject: "", message: "" });
                      setNotice("Correo enviado al concesor.");
                    } catch {
                      setNotice("No se pudo enviar el correo al concesor.");
                    } finally {
                      setSendingLocalMail(false);
                    }
                  }}
                >
                  {sendingLocalMail ? "Enviando..." : "Enviar correo"}
                </Button>
              </div>

              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
                <h3 className="font-semibold text-foreground">Contrato</h3>
                <p className="text-sm text-muted-foreground">
                  Expediente único del local/concesión con historial de mensajes entre las partes y contrato firmado en PDF.
                </p>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-muted-foreground">Contrato firmado (PDF)</label>
                  <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                    <input
                      value={draft.localContratoPdfUrl}
                      onChange={(e) => setDrafts((p) => ({ ...p, [active.id]: { ...draft, localContratoPdfUrl: e.target.value } }))}
                      placeholder="URL o DataURL del contrato firmado"
                      className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    />
                    <label className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm cursor-pointer inline-flex items-center gap-2">
                      Subir PDF firmado
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0] ?? null;
                          if (!file) return;
                          const pdf = await readFileAsDataUrl(file);
                          setDrafts((p) => ({ ...p, [active.id]: { ...draft, localContratoPdfUrl: pdf } }));
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "asistente" && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Listado de inscritos = {inscritos.length}</h3>
              {loadingInscritos && <p className="text-sm text-muted-foreground">Cargando inscritos...</p>}
              {!loadingInscritos && inscritos.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay inscritos en esta actividad.</p>
              )}
              {inscritos.map((inscrito) => (
                <div key={inscrito.id} className="rounded-xl border border-border p-2 space-y-1.5">
                  <div>
                    <p className="font-semibold text-foreground">{inscrito.nombre || `Inscrito #${inscrito.id}`}</p>
                    <p className="text-xs text-muted-foreground">{inscrito.email || "-"} · {inscrito.telefono || "-"}</p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-muted-foreground">Precio</label>
                      <input
                        value={String(inscrito.precio ?? "0")}
                        onChange={(e) => setInscritos((prev) => prev.map((row) => row.id === inscrito.id ? { ...row, precio: e.target.value } : row))}
                        className="w-full px-2 py-1 rounded-lg border border-border bg-background text-foreground text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-muted-foreground">Pago realizado</label>
                      <label className="flex items-center gap-2 h-8 px-2 py-1 rounded-lg border border-border bg-background text-foreground text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(inscrito.pagoRealizado)}
                          onChange={(e) => setInscritos((prev) => prev.map((row) => row.id === inscrito.id ? { ...row, pagoRealizado: e.target.checked } : row))}
                        />
                        <span>Sí</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-muted-foreground">Notas / observaciones</label>
                    <textarea
                      value={inscrito.observaciones ?? ""}
                      onChange={(e) => setInscritos((prev) => prev.map((row) => row.id === inscrito.id ? { ...row, observaciones: e.target.value } : row))}
                      rows={1}
                      className="w-full px-2 py-1 rounded-lg border border-border bg-background text-foreground resize-y text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (!token || !activeId) return;
                      setNotice("");
                      try {
                        const r = await fetch(`${API_ROOT}/actividades/${activeId}/inscritos/${inscrito.id}`, {
                          method: "PUT",
                          headers: authHeaders,
                          body: JSON.stringify({
                            precio: inscrito.precio,
                            pagoRealizado: inscrito.pagoRealizado,
                            observaciones: inscrito.observaciones,
                          }),
                        });
                        if (!r.ok) throw new Error("save inscrito failed");
                        setNotice("Inscrito actualizado.");
                      } catch {
                        setNotice("Error actualizando inscrito.");
                      }
                    }}
                  >
                    Guardar inscrito
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeSection === "facturas" && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Facturas del monitor (sincronizadas con Odoo)</h3>
              <p className="text-sm text-muted-foreground">Listado de solo lectura desde `membership_membership_line` para el partner del monitor.</p>
              {loadingFacturasMonitor && <p className="text-sm text-muted-foreground">Cargando facturas...</p>}
              {!loadingFacturasMonitor && facturasMonitorOdoo.length === 0 && facturasOdooStatus === "odoo_unavailable" && (
                <p className="text-sm text-muted-foreground">No se pudo conectar con Odoo para cargar facturas del monitor.</p>
              )}
              {!loadingFacturasMonitor && facturasMonitorOdoo.length === 0 && facturasOdooStatus === "no_data" && (
                <p className="text-sm text-muted-foreground">No hay facturas del monitor en Odoo.</p>
              )}
              {!loadingFacturasMonitor && facturasMonitorOdoo.length === 0 && facturasOdooStatus === "no_monitor_partner" && (
                <p className="text-sm text-muted-foreground">No hay monitor vinculado en Odoo para esta actividad.</p>
              )}
              {facturasMonitorOdoo.map((factura) => (
                <div key={factura.id} className="rounded-xl border border-border p-4 space-y-2 bg-muted/10">
                  <div className="grid sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Concepto</p>
                      <p className="text-foreground">{factura.concepto || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Importe</p>
                      <p className="text-foreground">{factura.importe}€</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Pagada</p>
                      <input type="checkbox" checked={Boolean(factura.pagada)} readOnly />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Fecha</p>
                      <p className="text-foreground">{factura.fecha || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Observaciones</p>
                    <p className="text-foreground text-sm whitespace-pre-wrap">{factura.observaciones || "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={saveActive} disabled={loading || saving}>{saving ? t("common.loading") : t("admin.activities.button.save")}</Button>
            <Button variant="outline" onClick={() => setActiveId(null)} disabled={loading || saving}>{t("admin.activities.button.back")}</Button>
          </div>
        </div>
      )}

      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
    </div>
  );
}
