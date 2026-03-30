import { useState, useRef } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, Calendar, MapPin, ImageIcon, X, Upload } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Estado = "prevista" | "proxima" | "realizada";

type Subact = {
  nombre: string;
  fotoUrl: string;
  // realizada extras
  memoria: string;
  fotosUrls: string[];
};

const emptySubact = (): Subact => ({ nombre: "", fotoUrl: "", memoria: "", fotosUrls: [] });

type Excursion = {
  id: number;
  estado: Estado;
  nombre: string;
  fotoUrl: string;
  fecha: string; // YYYY-MM-DD
  subacts: Subact[];
  precioInscripcion: string;
  subactsInscripcion: string;
  precioSuplemento: string;
  subactsSuplemento: string;
  fechaFinInscripcion: string;
  menu: string;
  bus1: string;
  bus2: string;
  horaRegreso: string;
  observaciones: string;
  // realizada only
  memoriaParticipantes: string;
  resumenExcursion: string;
};

const emptyExcursion = (estado: Estado): Excursion => ({
  id: 0, estado,
  nombre: "", fotoUrl: "", fecha: "",
  subacts: [emptySubact(), emptySubact(), emptySubact(), emptySubact()],
  precioInscripcion: "", subactsInscripcion: "",
  precioSuplemento: "", subactsSuplemento: "",
  fechaFinInscripcion: "", menu: "",
  bus1: "", bus2: "", horaRegreso: "", observaciones: "",
  memoriaParticipantes: "", resumenExcursion: "",
});

// ─── Initial mock data ───────────────────────────────────────────────────────

let nextId = 10;
const initialExcursiones: Excursion[] = [
  { ...emptyExcursion("proxima"), id: 1, nombre: "Donostia y el Peine del Viento", fecha: "2026-05-10", precioInscripcion: "18", bus1: "Sede Central 08:00", bus2: "Calle Mayor 08:15", horaRegreso: "20:00", menu: "Menú degustación pintxos + vino" },
  { ...emptyExcursion("prevista"), id: 2, nombre: "Laguardia y Bodegas Ysios", fecha: "2026-06-14", precioInscripcion: "25", bus1: "Sede Central 08:30", bus2: "Calle Mayor 08:45", horaRegreso: "20:30" },
  { ...emptyExcursion("prevista"), id: 3, nombre: "Pamplona medieval", fecha: "2026-07-19", precioInscripcion: "22", bus1: "Sede Central 07:45", bus2: "" },
  { ...emptyExcursion("realizada"), id: 4, nombre: "Bilbao: Guggenheim y Casco Viejo", fecha: "2026-03-08", precioInscripcion: "12", memoriaParticipantes: "55 participantes. Jornada excelente.", resumenExcursion: "Visita guiada al Guggenheim y pintxos en el Casco Viejo." },
];

// ─── Small helpers ───────────────────────────────────────────────────────────

const ESTADO_STYLE: Record<Estado, string> = {
  prevista:  "bg-blue-100 text-blue-700",
  proxima:   "bg-green-100 text-green-700",
  realizada: "bg-gray-100 text-gray-600",
};
const ESTADO_LABEL: Record<Estado, { es: string; eu: string }> = {
  prevista:  { es: "Prevista",  eu: "Aurreikusita" },
  proxima:   { es: "Próxima",   eu: "Hurrengoa" },
  realizada: { es: "Realizada", eu: "Egindakoa" },
};

function PhotoPicker({ label, url, onChange }: { label: string; url: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onChange(URL.createObjectURL(f));
  };
  return (
    <div>
      <label className="block text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className="relative cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors bg-muted/20 flex items-center gap-3 px-4 py-3"
      >
        {url ? (
          <>
            <img src={url} className="w-14 h-14 rounded-lg object-cover shrink-0" alt="" />
            <span className="text-sm text-muted-foreground truncate">Foto seleccionada</span>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(""); }}
              className="ml-auto text-muted-foreground hover:text-red-500"><X className="w-4 h-4" /></button>
          </>
        ) : (
          <>
            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">Seleccionar foto</span>
            <Upload className="ml-auto w-4 h-4 text-muted-foreground" />
          </>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function MultiPhotoPicker({ label, urls, onChange }: { label: string; urls: string[]; onChange: (urls: string[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    onChange([...urls, ...files.map(f => URL.createObjectURL(f))]);
    e.target.value = "";
  };
  return (
    <div>
      <label className="block text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {urls.map((u, i) => (
          <div key={i} className="relative">
            <img src={u} className="w-16 h-16 rounded-lg object-cover" alt="" />
            <button type="button" onClick={() => onChange(urls.filter((_, j) => j !== i))}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
          </div>
        ))}
        <button type="button" onClick={() => ref.current?.click()}
          className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const textareaCls = `${inputCls} resize-none`;

// ─── Subactividad block (prevista / proxima) ─────────────────────────────────

function SubactBlock({ idx, subact, onChange }: { idx: number; subact: Subact; onChange: (s: Subact) => void }) {
  return (
    <div className="bg-muted/20 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-bold text-foreground">Subactividad {idx + 1}</p>
      <Field label="Nombre de la subactividad">
        <input className={inputCls} value={subact.nombre} onChange={e => onChange({ ...subact, nombre: e.target.value })} />
      </Field>
      <PhotoPicker label="Foto" url={subact.fotoUrl} onChange={url => onChange({ ...subact, fotoUrl: url })} />
    </div>
  );
}

// ─── Subactividad realizada ──────────────────────────────────────────────────

function SubactRealizadaBlock({ idx, subact, onChange }: { idx: number; subact: Subact; onChange: (s: Subact) => void }) {
  return (
    <div className="bg-muted/20 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-bold text-foreground">Subactividad {idx + 1}</p>
      <Field label="Nombre de la subactividad">
        <input className={inputCls} value={subact.nombre} onChange={e => onChange({ ...subact, nombre: e.target.value })} />
      </Field>
      <Field label="Memoria de lo realizado">
        <textarea className={textareaCls} rows={2} value={subact.memoria} onChange={e => onChange({ ...subact, memoria: e.target.value })} />
      </Field>
      <PhotoPicker label="Foto principal" url={subact.fotoUrl} onChange={url => onChange({ ...subact, fotoUrl: url })} />
      <MultiPhotoPicker label="Añadir más fotos" urls={subact.fotosUrls} onChange={urls => onChange({ ...subact, fotosUrls: urls })} />
    </div>
  );
}

// ─── Form prevista / proxima ─────────────────────────────────────────────────

function FormPrevistaProxima({
  estado, initial, previstas,
  onSave, onCancel,
}: {
  estado: Estado;
  initial: Excursion;
  previstas: Excursion[];
  onSave: (ex: Excursion) => void;
  onCancel: () => void;
}) {
  const [ex, setEx] = useState<Excursion>(initial);
  const [importId, setImportId] = useState<number | null>(null);
  const { lang } = useTranslation();

  const importFromPrevista = (id: number) => {
    const src = previstas.find(p => p.id === id);
    if (src) setEx({ ...src, id: ex.id, estado });
    setImportId(id);
  };

  const setSubact = (i: number, s: Subact) => setEx(e => ({ ...e, subacts: e.subacts.map((sa, j) => j === i ? s : sa) }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={onCancel} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm">
        <ChevronLeft className="w-4 h-4" /> Volver al índice
      </button>

      <div className="flex items-center gap-3 mb-8">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${ESTADO_STYLE[estado]}`}>{ESTADO_LABEL[estado][lang]}</span>
        <h1 className="text-2xl font-bold text-foreground">
          {ex.id === 0 ? "Nueva excursión" : "Editar excursión"} — {ESTADO_LABEL[estado][lang]}
        </h1>
      </div>

      {/* Import from prevista (only for proxima) */}
      {estado === "proxima" && previstas.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-800 mb-2">Importar datos de una excursión prevista</p>
          <div className="flex gap-2 flex-wrap">
            {previstas.map(p => (
              <button key={p.id} type="button"
                onClick={() => importFromPrevista(p.id)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${importId === p.id ? "bg-blue-600 text-white border-blue-600" : "bg-white border-blue-300 text-blue-700 hover:bg-blue-100"}`}>
                {p.nombre}
              </button>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">Al seleccionar se precargarán los datos. Puedes modificarlos libremente.</p>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); onSave(ex); }} className="space-y-6">
        {/* Datos básicos */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Datos básicos</h2>
          <Field label="Nombre *">
            <input required className={inputCls} value={ex.nombre} onChange={e => setEx({ ...ex, nombre: e.target.value })} />
          </Field>
          <PhotoPicker label="Foto del lugar" url={ex.fotoUrl} onChange={url => setEx({ ...ex, fotoUrl: url })} />
          <Field label="Fecha *">
            <input required type="date" className={inputCls} value={ex.fecha} onChange={e => setEx({ ...ex, fecha: e.target.value })} />
          </Field>
        </div>

        {/* Subactividades */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Subactividades</h2>
          {ex.subacts.map((sa, i) => <SubactBlock key={i} idx={i} subact={sa} onChange={s => setSubact(i, s)} />)}
        </div>

        {/* Precios e inscripción */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Precios e inscripción</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Precio inscripción (€)">
              <input type="number" min="0" step="0.01" className={inputCls} value={ex.precioInscripcion} onChange={e => setEx({ ...ex, precioInscripcion: e.target.value })} />
            </Field>
            <Field label="Subactividades incluidas en precio">
              <input className={inputCls} placeholder="Ej: 1, 2" value={ex.subactsInscripcion} onChange={e => setEx({ ...ex, subactsInscripcion: e.target.value })} />
            </Field>
            <Field label="Precio suplemento (€)">
              <input type="number" min="0" step="0.01" className={inputCls} value={ex.precioSuplemento} onChange={e => setEx({ ...ex, precioSuplemento: e.target.value })} />
            </Field>
            <Field label="Subactividades en suplemento">
              <input className={inputCls} placeholder="Ej: 3, 4" value={ex.subactsSuplemento} onChange={e => setEx({ ...ex, subactsSuplemento: e.target.value })} />
            </Field>
          </div>
          <Field label="Fecha fin de inscripción">
            <input type="date" className={inputCls} value={ex.fechaFinInscripcion} onChange={e => setEx({ ...ex, fechaFinInscripcion: e.target.value })} />
          </Field>
        </div>

        {/* Logística */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Logística</h2>
          <Field label="Menú">
            <textarea className={textareaCls} rows={2} value={ex.menu} onChange={e => setEx({ ...ex, menu: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Parada de autobús 1">
              <input className={inputCls} placeholder="Lugar · HH:MM" value={ex.bus1} onChange={e => setEx({ ...ex, bus1: e.target.value })} />
            </Field>
            <Field label="Parada de autobús 2">
              <input className={inputCls} placeholder="Lugar · HH:MM" value={ex.bus2} onChange={e => setEx({ ...ex, bus2: e.target.value })} />
            </Field>
          </div>
          <Field label="Hora de regreso">
            <input className={inputCls} placeholder="HH:MM" value={ex.horaRegreso} onChange={e => setEx({ ...ex, horaRegreso: e.target.value })} />
          </Field>
          <Field label="Observaciones">
            <textarea className={textareaCls} rows={3} value={ex.observaciones} onChange={e => setEx({ ...ex, observaciones: e.target.value })} />
          </Field>
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1 sm:flex-none">Guardar excursión</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}

// ─── Form realizada ──────────────────────────────────────────────────────────

function FormRealizada({
  initial, proximas,
  onSave, onCancel,
}: {
  initial: Excursion;
  proximas: Excursion[];
  onSave: (ex: Excursion) => void;
  onCancel: () => void;
}) {
  const [ex, setEx] = useState<Excursion>(initial);
  const [importId, setImportId] = useState<number | null>(null);
  const { lang } = useTranslation();

  const importFromProxima = (id: number) => {
    const src = proximas.find(p => p.id === id);
    if (src) setEx({ ...src, id: ex.id, estado: "realizada" });
    setImportId(id);
  };

  const setSubact = (i: number, s: Subact) => setEx(e => ({ ...e, subacts: e.subacts.map((sa, j) => j === i ? s : sa) }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={onCancel} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm">
        <ChevronLeft className="w-4 h-4" /> Volver al índice
      </button>

      <div className="flex items-center gap-3 mb-8">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${ESTADO_STYLE.realizada}`}>{ESTADO_LABEL.realizada[lang]}</span>
        <h1 className="text-2xl font-bold text-foreground">{ex.id === 0 ? "Nueva excursión realizada" : "Editar excursión realizada"}</h1>
      </div>

      {proximas.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-green-800 mb-2">Importar de una excursión próxima</p>
          <div className="flex gap-2 flex-wrap">
            {proximas.map(p => (
              <button key={p.id} type="button"
                onClick={() => importFromProxima(p.id)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${importId === p.id ? "bg-green-600 text-white border-green-600" : "bg-white border-green-300 text-green-700 hover:bg-green-100"}`}>
                {p.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); onSave(ex); }} className="space-y-6">
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Datos básicos</h2>
          <Field label="Nombre *">
            <input required className={inputCls} value={ex.nombre} onChange={e => setEx({ ...ex, nombre: e.target.value })} />
          </Field>
          <PhotoPicker label="Foto del lugar" url={ex.fotoUrl} onChange={url => setEx({ ...ex, fotoUrl: url })} />
          <Field label="Fecha *">
            <input required type="date" className={inputCls} value={ex.fecha} onChange={e => setEx({ ...ex, fecha: e.target.value })} />
          </Field>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Memoria de la excursión</h2>
          <Field label="Datos de participantes y resumen general">
            <textarea className={textareaCls} rows={4} placeholder="Número de participantes, incidencias, valoración general..." value={ex.memoriaParticipantes} onChange={e => setEx({ ...ex, memoriaParticipantes: e.target.value })} />
          </Field>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Subactividades</h2>
          {ex.subacts.map((sa, i) => <SubactRealizadaBlock key={i} idx={i} subact={sa} onChange={s => setSubact(i, s)} />)}
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Cierre</h2>
          <Field label="Resumen de la excursión">
            <textarea className={textareaCls} rows={4} placeholder="Descripción general del desarrollo de la excursión..." value={ex.resumenExcursion} onChange={e => setEx({ ...ex, resumenExcursion: e.target.value })} />
          </Field>
          <Field label="Observaciones">
            <textarea className={textareaCls} rows={3} value={ex.observaciones} onChange={e => setEx({ ...ex, observaciones: e.target.value })} />
          </Field>
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1 sm:flex-none">Guardar excursión</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

type View =
  | { type: "list" }
  | { type: "form-prevista"; excursion: Excursion }
  | { type: "form-proxima"; excursion: Excursion }
  | { type: "form-realizada"; excursion: Excursion };

export default function AdminEventos() {
  const { t, lang } = useTranslation();
  const [excursiones, setExcursiones] = useState<Excursion[]>(initialExcursiones);
  const [view, setView] = useState<View>({ type: "list" });

  const sorted = [...excursiones].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const previstas = excursiones.filter(e => e.estado === "prevista");
  const proximas = excursiones.filter(e => e.estado === "proxima");

  const handleSave = (ex: Excursion) => {
    if (ex.id === 0) {
      const newEx = { ...ex, id: nextId++ };
      setExcursiones(prev => [...prev, newEx]);
    } else {
      setExcursiones(prev => prev.map(e => e.id === ex.id ? ex : e));
    }
    setView({ type: "list" });
  };

  const openEdit = (ex: Excursion) => {
    if (ex.estado === "prevista") setView({ type: "form-prevista", excursion: ex });
    else if (ex.estado === "proxima") setView({ type: "form-proxima", excursion: ex });
    else setView({ type: "form-realizada", excursion: ex });
  };

  if (view.type === "form-prevista") {
    return <FormPrevistaProxima estado="prevista" initial={view.excursion} previstas={[]} onSave={handleSave} onCancel={() => setView({ type: "list" })} />;
  }
  if (view.type === "form-proxima") {
    return <FormPrevistaProxima estado="proxima" initial={view.excursion} previstas={previstas} onSave={handleSave} onCancel={() => setView({ type: "list" })} />;
  }
  if (view.type === "form-realizada") {
    return <FormRealizada initial={view.excursion} proximas={proximas} onSave={handleSave} onCancel={() => setView({ type: "list" })} />;
  }

  // ─── List view ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("menu.admin_eventos")} — Excursiones</h1>
        <div className="flex gap-2 flex-wrap">
          {(["prevista", "proxima", "realizada"] as const).map(est => (
            <Button key={est} size="sm" variant="outline" className="gap-1.5"
              onClick={() => setView({ type: `form-${est}` as any, excursion: emptyExcursion(est) })}>
              <Plus className="w-3.5 h-3.5" />
              {ESTADO_LABEL[est][lang]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map(ex => (
          <div key={ex.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-all cursor-pointer" onClick={() => openEdit(ex)}>
            {ex.fotoUrl ? (
              <img src={ex.fotoUrl} className="w-16 h-16 rounded-xl object-cover shrink-0" alt="" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ESTADO_STYLE[ex.estado]}`}>
                  {ESTADO_LABEL[ex.estado][lang]}
                </span>
                <p className="font-semibold text-foreground truncate">{ex.nombre || <span className="text-muted-foreground italic">Sin nombre</span>}</p>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {ex.fecha ? new Date(ex.fecha + "T00:00:00").toLocaleDateString(lang === "eu" ? "es-ES" : "es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "Fecha sin definir"}
                {ex.precioInscripcion && <span className="ml-2 font-semibold text-secondary">{ex.precioInscripcion}€</span>}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); openEdit(ex); }}>
              Editar
            </Button>
          </div>
        ))}

        {excursiones.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay excursiones registradas. Crea la primera.</p>
          </div>
        )}
      </div>
    </div>
  );
}
