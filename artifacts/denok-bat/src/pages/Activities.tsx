import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Clock, CalendarDays, ChevronLeft, ArrowRight } from "lucide-react";
import { useStore, userHasRole } from "@/store/use-store";
import { Link } from "wouter";

type EstadoActividad = "prevista" | "abierta" | "en_curso" | "terminada" | "disponible" | "lista_espera" | "cerrada";

interface ActividadDetalle {
  id: number;
  nombre: string;
  nombreEu: string | null;
  descripcion: string | null;
  descripcionEu: string | null;
  cardTexto?: string | null;
  cardTextoEu?: string | null;
  calendario?: string | null;
  calendarioEu?: string | null;
  horarioEu?: string | null;
  calendarStartMonth?: string | null;
  calendarDaysJson?: string | null;
  imagen: string | null;
  horario: string | null;
  estado: EstadoActividad;
  precio?: string | number | null;
  plazasDisponibles?: number | null;
}
const API_ROOT = "/api";

function parseMonthInput(value?: string | null) {
  const [y, m] = String(value || "").split("-");
  const year = Number(y);
  const month = Number(m);
  if (!year || !month) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return new Date(year, month - 1, 1);
}

function monthFromSelectedDays(days: Set<string>): Date | null {
  const list = Array.from(days).sort();
  if (list.length === 0) return null;
  const [y, m] = list[0].split("-");
  const year = Number(y);
  const month = Number(m);
  if (!year || !month) return null;
  return new Date(year, month - 1, 1);
}

function parseSelectedDays(raw?: string | null): Set<string> {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.map((v) => String(v)));
  } catch {
    return new Set<string>();
  }
}

function toIsoDate(year: number, monthIdx: number, day: number) {
  const mm = String(monthIdx + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const ESTADO_CONFIG: Record<EstadoActividad, { label: string; labelEu: string; color: string }> = {
  prevista: { label: "Prevista", labelEu: "Aurreikusia", color: "bg-blue-100 text-blue-700" },
  abierta: { label: "Abierta", labelEu: "Irekita", color: "bg-green-100 text-green-700" },
  en_curso: { label: "En curso", labelEu: "Martxan", color: "bg-primary/10 text-primary" },
  terminada: { label: "Terminada", labelEu: "Amaituta", color: "bg-muted text-muted-foreground" },
  disponible: { label: "Abierta", labelEu: "Irekia", color: "bg-green-100 text-green-700" },
  lista_espera: { label: "Lista de espera", labelEu: "Itxaron-zerrenda", color: "bg-amber-100 text-amber-700" },
  cerrada: { label: "Cerrada", labelEu: "Itxita", color: "bg-muted text-muted-foreground" },
};

function EstadoBadge({ estado, lang }: { estado: EstadoActividad; lang: string }) {
  const cfg = ESTADO_CONFIG[estado];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${cfg.color}`}>
      {lang === "eu" ? cfg.labelEu : cfg.label}
    </span>
  );
}

function ActividadPage({
  act,
  lang,
  user,
  canManageStatus,
  onStatusChange,
  onBack,
}: {
  act: ActividadDetalle;
  lang: string;
  user: any;
  canManageStatus: boolean;
  onStatusChange: (id: number, estado: EstadoActividad) => Promise<void>;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState<EstadoActividad>(act.estado);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollNotice, setEnrollNotice] = useState("");
  const [enrollForm, setEnrollForm] = useState({
    nombre: "",
    apellidos: "",
    dni: "",
    email: "",
    metodoPago: "transferencia",
    cuotaPagada: false,
  });
  const calendarText = lang === "eu" ? act.calendarioEu || act.calendario || "" : act.calendario || "";
  const scheduleText = lang === "eu" ? act.horarioEu || act.horario || "" : act.horario || "";
  const selectedDays = parseSelectedDays(act.calendarDaysJson);
  const startMonth = act.calendarStartMonth
    ? parseMonthInput(act.calendarStartMonth)
    : (monthFromSelectedDays(selectedDays) ?? parseMonthInput(act.calendarStartMonth));
  const monthOptions = Array.from({ length: 12 }, (_, idx) => new Date(startMonth.getFullYear(), startMonth.getMonth() + idx, 1));
  const weekDays = [
    t("calendar.week.monday"),
    t("calendar.week.tuesday"),
    t("calendar.week.wednesday"),
    t("calendar.week.thursday"),
    t("calendar.week.friday"),
    t("calendar.week.saturday"),
    t("calendar.week.sunday"),
  ];
  const selectedMonthKeys = new Set(Array.from(selectedDays).map((iso) => String(iso).slice(0, 7)));
  const monthsWithSelectedDays = monthOptions.filter((m) => selectedMonthKeys.has(monthKeyFromDate(m)));
  const hasCalendarData = Boolean(calendarText.trim()) || selectedDays.size > 0;

  useEffect(() => {
    setStatusDraft(act.estado);
  }, [act.id, act.estado]);

  const saveStatus = async () => {
    setSavingStatus(true);
    try {
      await onStatusChange(act.id, statusDraft);
    } finally {
      setSavingStatus(false);
    }
  };
  const submitEnroll = async () => {
    if (!user) return;
    setEnrolling(true);
    setEnrollNotice("");
    try {
      const token = useStore.getState().token;
      const r = await fetch(`${API_ROOT}/actividades/${act.id}/inscripcion-form`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify(enrollForm),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(String(d?.error ?? "No se pudo inscribir"));
      setEnrollNotice(
        enrollForm.cuotaPagada
          ? "Inscripción realizada correctamente."
          : "Inscripción realizada pendiente de pago.",
      );
      setShowEnrollForm(false);
    } catch (err) {
      setEnrollNotice(String(err instanceof Error ? err.message : err));
    } finally {
      setEnrolling(false);
    }
  };
  const paymentFormUrl = enrollForm.metodoPago === "tarjeta"
    ? "/mis-pagos?metodo=tarjeta"
    : "/mis-pagos?metodo=transferencia";
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" /> {t("common.back")}
        </button>
        {canManageStatus && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value as EstadoActividad)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              disabled={savingStatus}
            >
              <option value="prevista">{t("status.prevista")}</option>
              <option value="abierta">{t("status.abierta")}</option>
              <option value="en_curso">{t("status.en_curso")}</option>
              <option value="terminada">{t("status.terminada")}</option>
            </select>
            <Button size="sm" onClick={saveStatus} disabled={savingStatus || statusDraft === act.estado}>
              {savingStatus ? t("activities.status.saving") : t("activities.status.save")}
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="bg-linear-to-br from-primary/10 to-primary/5 p-10 flex items-center gap-6">
          {act.imagen ? (
            <img src={act.imagen} alt={lang === "eu" ? act.nombreEu ?? act.nombre : act.nombre} className="h-28 w-28 rounded-2xl object-cover border border-border" />
          ) : (
            <span className="text-6xl">🏃</span>
          )}
          <div>
            <h1 className="text-4xl font-extrabold text-foreground">{lang === "eu" ? act.nombreEu ?? act.nombre : act.nombre}</h1>
            <div className="mt-2"><EstadoBadge estado={act.estado} lang={lang} /></div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Description */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-3">{lang === "eu" ? "Zer da?" : "En qué consiste"}</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{lang === "eu" ? act.descripcionEu || act.descripcion || "" : act.descripcion || ""}</p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-2xl p-5">
              <Clock className="w-5 h-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">{lang === "eu" ? "Ordutegia" : "Horario"}</p>
              <p className="font-bold text-foreground">{scheduleText || "-"}</p>
            </div>
            <button
              type="button"
              onClick={() => setCalendarOpen((v) => !v)}
              className="bg-muted/30 rounded-2xl p-5 text-left"
            >
              <CalendarDays className="w-5 h-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">{lang === "eu" ? "Egutegia" : "Calendario"}</p>
              <p className="font-bold text-foreground">{calendarOpen ? t("activities.calendar.toggle_hide") : t("activities.calendar.toggle_show")}</p>
            </button>
          </div>
          {calendarOpen && (
            <div className="rounded-2xl border border-border bg-muted/20 p-5">
              <h3 className="font-semibold text-foreground mb-2">{t("activities.calendar.details_title")}</h3>
              {calendarText && (
                <p className="text-muted-foreground whitespace-pre-wrap">{calendarText}</p>
              )}
              {!hasCalendarData && (
                <p className="text-muted-foreground whitespace-pre-wrap">{t("activities.calendar.empty")}</p>
              )}
              {monthsWithSelectedDays.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="grid lg:grid-cols-3 gap-3">
                    {monthsWithSelectedDays.map((visibleMonth, idx) => (
                      <div key={idx} className="rounded-xl border border-border p-3">
                        <p className="text-sm font-semibold text-foreground mb-2">
                          {visibleMonth.toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", { month: "long", year: "numeric" })}
                        </p>
                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1">
                          {weekDays.map((d) => <span key={d}>{d}</span>)}
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
                                <div key={iso} className={`h-8 rounded-md border text-xs flex items-center justify-center ${activeDay ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border"}`}>
                                  {day}
                                </div>,
                              );
                            }
                            return cells;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado: ABIERTA */}
          {act.estado === "abierta" && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-green-800 mb-3">{lang === "eu" ? "Izena emateko aukera" : "Inscripción abierta"}</h2>
              {act.precio !== undefined && Number(act.precio ?? 0) > 0 && (
                <p className="text-green-700 mb-2">
                  {lang === "eu" ? "Prezioa" : "Precio"}: <strong>{act.precio}€</strong>
                </p>
              )}
              {act.plazasDisponibles !== undefined && (
                <p className="text-green-700 mb-4">
                  {lang === "eu" ? "Libre daude" : "Plazas disponibles"}: <strong>{act.plazasDisponibles}</strong>
                </p>
              )}
              {user ? (
                <div className="space-y-3">
                  <Button className="gap-2" onClick={() => setShowEnrollForm((v) => !v)}>
                    {showEnrollForm ? (lang === "eu" ? "Formularioa ezkutatu" : "Ocultar formulario") : (lang === "eu" ? "Izena emateko formularioa" : "Formulario de inscripción")}
                  </Button>
                  {showEnrollForm && (
                    <div className="bg-white rounded-xl border border-green-200 p-4 space-y-2">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input value={enrollForm.nombre} onChange={(e) => setEnrollForm((p) => ({ ...p, nombre: e.target.value }))} placeholder={lang === "eu" ? "Izena" : "Nombre"} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                        <input value={enrollForm.apellidos} onChange={(e) => setEnrollForm((p) => ({ ...p, apellidos: e.target.value }))} placeholder={lang === "eu" ? "Abizenak" : "Apellidos"} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                        <input value={enrollForm.dni} onChange={(e) => setEnrollForm((p) => ({ ...p, dni: e.target.value }))} placeholder="DNI/NIE" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                        <input value={enrollForm.email} onChange={(e) => setEnrollForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                        <select value={enrollForm.metodoPago} onChange={(e) => setEnrollForm((p) => ({ ...p, metodoPago: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground">
                          <option value="transferencia">{lang === "eu" ? "Transferentzia" : "Transferencia"}</option>
                          <option value="tarjeta">{lang === "eu" ? "Txartela" : "Tarjeta"}</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <input type="checkbox" checked={enrollForm.cuotaPagada} onChange={(e) => setEnrollForm((p) => ({ ...p, cuotaPagada: e.target.checked }))} />
                          {lang === "eu" ? "Kuota ordainduta" : "Cuota pagada"}
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={submitEnroll} disabled={enrolling}>{enrolling ? (lang === "eu" ? "Bidaltzen..." : "Enviando...") : (lang === "eu" ? "Izena eman" : "Inscribirme")}</Button>
                        <Button type="button" variant="outline" onClick={() => { window.location.href = paymentFormUrl; }}>
                          {lang === "eu" ? "Ordaindu" : "Pagar"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login"><Button>{lang === "eu" ? "Sartu izena emateko" : "Accede para inscribirte"}</Button></Link>
              )}
              {enrollNotice && <p className="text-sm text-green-800 mt-3">{enrollNotice}</p>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function Activities() {
  const { t, lang } = useTranslation();
  const user = useStore(s => s.user);
  const token = useStore((s) => s.token);
  const [selected, setSelected] = useState<ActividadDetalle | null>(null);
  const [items, setItems] = useState<ActividadDetalle[]>([]);
  const canManageStatus = Boolean(user && userHasRole(user, ["directivo", "administrador"]));

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_ROOT}/actividades?limit=100`);
        const d = await r.json();
        const list = (Array.isArray(d?.items) ? d.items : []) as ActividadDetalle[];
        setItems(list);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  const updateStatus = async (id: number, estado: EstadoActividad) => {
    if (!token) return;
    const r = await fetch(`${API_ROOT}/actividades/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ estado }),
    });
    if (!r.ok) throw new Error("status update failed");
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, estado } : it)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, estado } : prev));
  };

  if (selected) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <ActividadPage
          act={selected}
          lang={lang}
          user={user}
          canManageStatus={canManageStatus}
          onStatusChange={updateStatus}
          onBack={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-linear-to-b from-primary/8 to-background py-16 border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-foreground mb-4">
            {lang === "eu" ? "Zahartze Aktiboa" : "Envejecimiento Activo"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {lang === "eu"
              ? "Aktibo egon, gauza berriak ikasi eta sozializatu elkartearekin."
              : "Mantente activo, aprende cosas nuevas y socializa con la asociación."}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((act) => (
            <button
              key={act.id}
              onClick={() => setSelected(act)}
              className="bg-white rounded-3xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all text-left group"
            >
              <div className="h-36 bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                {act.imagen ? (
                  <img src={act.imagen} alt={lang === "eu" ? act.nombreEu ?? act.nombre : act.nombre} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <span className="text-6xl group-hover:scale-110 transition-transform duration-300">🏃</span>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-2xl font-bold text-foreground">{lang === "eu" ? act.nombreEu ?? act.nombre : act.nombre}</h3>
                  <EstadoBadge estado={act.estado} lang={lang} />
                </div>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                  {lang === "eu"
                    ? act.cardTextoEu || act.cardTexto || act.descripcionEu || act.descripcion || ""
                    : act.cardTexto || act.descripcion || ""}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{act.horario || "-"}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                  {lang === "eu" ? "Xehetasunak ikusi" : "Ver detalles"} <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay actividades disponibles.</p>
        )}
      </div>
    </div>
  );
}
