import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, MapPin, ImageIcon, X, Upload, Loader2, Calendar, Plane } from "lucide-react";
import { useStore } from "@/store/use-store";

// ─── API base ─────────────────────────────────────────────────────────────────

const API = "/api";

function authHeaders(token: string | null): Record<string, string> {
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoExc = "prevista" | "proxima" | "realizada";
type EstadoFiesta = "prevista" | "proxima" | "realizada";
type EstadoViaje = "previsto" | "proximo" | "realizado";

interface Subact {
  id?: number;
  orden: number;
  nombre: string;
  fotoUrl: string;
  memoria: string;
  fotosUrls: string[]; // local only (no DB column)
}

interface ExcursionRow {
  id: number;
  nombre: string;
  nombreEu?: string | null;
  descripcion?: string | null;
  descripcionEu?: string | null;
  fecha?: string | null;
  fotoUrl?: string | null;
  precioInscripcion?: string | null;
  precioSuplemento?: string | null;
  subactsInscripcion?: string | null;
  subactsSuplemento?: string | null;
  fechaFinInscripcion?: string | null;
  menu?: string | null;
  bus1?: string | null;
  bus2?: string | null;
  horaRegreso?: string | null;
  observaciones?: string | null;
  memoriaParticipantes?: string | null;
  resumen?: string | null;
  estado?: string | null;
  publicado?: boolean;
  subactividades?: Subact[];
}

interface FiestaRow {
  id: number;
  nombre: string;
  nombreEu?: string | null;
  descripcion?: string | null;
  descripcionEu?: string | null;
  fecha?: string | null;
  lugar?: string | null;
  fotoUrl?: string | null;
  programa?: string | null;
  memoria?: string | null;
  menu?: string | null;
  bus1?: string | null;
  bus2?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  precio?: string | null;
  plazasTotal?: number | null;
  plazasDisponibles?: number | null;
  estado?: string | null;
  publicado?: boolean;
}

interface ViajeRow {
  id: number;
  nombre: string;
  nombreEu?: string | null;
  descripcion?: string | null;
  destinos?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  fotoUrl?: string | null;
  alojamiento?: string | null;
  itinerario?: string | null;
  precioInscripcion?: string | null;
  bus1?: string | null;
  bus2?: string | null;
  estado?: string | null;
  publicado?: boolean;
}

// ─── Shared UI components ─────────────────────────────────────────────────────

const inputCls  = "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const textareaCls = `${inputCls} resize-none`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function PhotoPicker({ label, url, onChange }: { label: string; url: string; onChange: (u: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">{label}</label>
      <div onClick={() => ref.current?.click()}
        className="relative cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors bg-muted/20 flex items-center gap-3 px-4 py-3">
        {url ? (
          <>
            <img src={url} className="w-14 h-14 rounded-lg object-cover shrink-0" alt="" />
            <span className="text-sm text-muted-foreground truncate">Foto seleccionada</span>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(""); }} className="ml-auto text-muted-foreground hover:text-red-500"><X className="w-4 h-4" /></button>
          </>
        ) : (
          <>
            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">Seleccionar foto</span>
            <Upload className="ml-auto w-4 h-4 text-muted-foreground" />
          </>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onChange(URL.createObjectURL(f)); }} />
    </div>
  );
}

function MultiPhotoPicker({ label, urls, onChange }: { label: string; urls: string[]; onChange: (u: string[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
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
      <input ref={ref} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { const fs = Array.from(e.target.files ?? []); onChange([...urls, ...fs.map(f => URL.createObjectURL(f))]); e.target.value = ""; }} />
    </div>
  );
}

// ─── Estado badges ────────────────────────────────────────────────────────────

const BADGE: Record<string, string> = {
  prevista:  "bg-blue-100 text-blue-700",
  proxima:   "bg-green-100 text-green-700",
  realizada: "bg-gray-100 text-gray-600",
  previsto:  "bg-blue-100 text-blue-700",
  proximo:   "bg-green-100 text-green-700",
  realizado: "bg-gray-100 text-gray-600",
};
const LABEL_ES: Record<string, string> = {
  prevista: "Prevista", proxima: "Próxima", realizada: "Realizada",
  previsto: "Previsto", proximo: "Próximo", realizado: "Realizado",
};
const LABEL_EU: Record<string, string> = {
  prevista: "Aurreikusita", proxima: "Hurrengoa", realizada: "Egindakoa",
  previsto: "Aurreikusita", proximo: "Hurrengoa",  realizado: "Egindakoa",
};

function StateBadge({ estado, lang }: { estado: string; lang: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${BADGE[estado] ?? "bg-muted text-muted-foreground"}`}>
      {lang === "eu" ? (LABEL_EU[estado] ?? estado) : (LABEL_ES[estado] ?? estado)}
    </span>
  );
}

// ─── Empty row factories ──────────────────────────────────────────────────────

const emptySubact = (orden: number): Subact => ({ orden, nombre: "", fotoUrl: "", memoria: "", fotosUrls: [] });

const emptyExcursion = (estado: EstadoExc): ExcursionRow => ({
  id: 0, nombre: "", fecha: "", fotoUrl: "", estado,
  subactividades: [1,2,3,4].map(emptySubact),
  precioInscripcion: "", subactsInscripcion: "",
  precioSuplemento: "", subactsSuplemento: "",
  fechaFinInscripcion: "", menu: "", bus1: "", bus2: "",
  horaRegreso: "", observaciones: "",
  memoriaParticipantes: "", resumen: "",
});

const emptyFiesta = (): FiestaRow => ({
  id: 0, nombre: "", nombreEu: "", fecha: "", lugar: "", fotoUrl: "",
  descripcion: "", descripcionEu: "", programa: "", memoria: "",
  menu: "", bus1: "", bus2: "", horaInicio: "", horaFin: "",
  precio: "0", plazasTotal: 0, plazasDisponibles: 0,
  estado: "proxima", publicado: false,
});

const emptyViaje = (estado: EstadoViaje): ViajeRow => ({
  id: 0, nombre: "", destinos: "", fechaInicio: "", fechaFin: "",
  fotoUrl: "", alojamiento: "", itinerario: "",
  precioInscripcion: "", bus1: "", bus2: "", estado,
});

// ─── Loading / Empty helpers ──────────────────────────────────────────────────

function Spinner() {
  return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// FIESTAS
// ══════════════════════════════════════════════════════════════════════════════

function FiestaForm({ initial, onSave, onCancel, saving }: {
  initial: FiestaRow;
  onSave: (f: FiestaRow) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState<FiestaRow>(initial);
  const isNew = f.id === 0;
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={onCancel} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>
      <h1 className="text-2xl font-bold text-foreground mb-8">{isNew ? "Nueva fiesta" : "Editar fiesta"}</h1>

      <form onSubmit={e => { e.preventDefault(); onSave(f); }} className="space-y-6">
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Datos básicos</h2>
          <Field label="Nombre *"><input required className={inputCls} value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></Field>
          <Field label="Nombre en Euskara"><input className={inputCls} value={f.nombreEu ?? ""} onChange={e => setF({ ...f, nombreEu: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha"><input type="date" className={inputCls} value={f.fecha ?? ""} onChange={e => setF({ ...f, fecha: e.target.value })} /></Field>
            <Field label="Precio (€)"><input type="number" min="0" step="0.5" className={inputCls} value={f.precio ?? "0"} onChange={e => setF({ ...f, precio: e.target.value })} /></Field>
          </div>
          <Field label="Lugar"><input className={inputCls} value={f.lugar ?? ""} onChange={e => setF({ ...f, lugar: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora inicio"><input type="time" className={inputCls} value={f.horaInicio ?? ""} onChange={e => setF({ ...f, horaInicio: e.target.value })} /></Field>
            <Field label="Hora fin"><input type="time" className={inputCls} value={f.horaFin ?? ""} onChange={e => setF({ ...f, horaFin: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plazas total"><input type="number" min="0" className={inputCls} value={f.plazasTotal ?? 0} onChange={e => setF({ ...f, plazasTotal: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Plazas disponibles"><input type="number" min="0" className={inputCls} value={f.plazasDisponibles ?? 0} onChange={e => setF({ ...f, plazasDisponibles: parseInt(e.target.value) || 0 })} /></Field>
          </div>
          <PhotoPicker label="Foto" url={f.fotoUrl ?? ""} onChange={url => setF({ ...f, fotoUrl: url })} />
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Descripción y programa</h2>
          <Field label="Descripción"><textarea className={textareaCls} rows={3} value={f.descripcion ?? ""} onChange={e => setF({ ...f, descripcion: e.target.value })} /></Field>
          <Field label="Descripción en Euskara"><textarea className={textareaCls} rows={3} value={f.descripcionEu ?? ""} onChange={e => setF({ ...f, descripcionEu: e.target.value })} /></Field>
          <Field label="Programa detallado"><textarea className={textareaCls} rows={6} placeholder="Horario, actividades, actos..." value={f.programa ?? ""} onChange={e => setF({ ...f, programa: e.target.value })} /></Field>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Logística</h2>
          <Field label="Menú de comida"><input className={inputCls} placeholder="Ej: Pintxos + Bebida + Postre" value={f.menu ?? ""} onChange={e => setF({ ...f, menu: e.target.value })} /></Field>
          <Field label="Parada de autobús 1"><input className={inputCls} placeholder="Ej: Sede Central 09:30" value={f.bus1 ?? ""} onChange={e => setF({ ...f, bus1: e.target.value })} /></Field>
          <Field label="Parada de autobús 2"><input className={inputCls} placeholder="Ej: Plaza Mayor 09:45" value={f.bus2 ?? ""} onChange={e => setF({ ...f, bus2: e.target.value })} /></Field>
        </div>

        {(f.estado === "realizada") && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h2 className="font-bold text-foreground">Memoria del evento</h2>
            <Field label="Memoria y valoración"><textarea className={textareaCls} rows={5} value={f.memoria ?? ""} onChange={e => setF({ ...f, memoria: e.target.value })} /></Field>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Publicación</h2>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="pub-fiesta" checked={!!f.publicado} onChange={e => setF({ ...f, publicado: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
            <label htmlFor="pub-fiesta" className="text-sm">Publicado (visible en la web)</label>
          </div>
          <Field label="Estado">
            <select className={inputCls} value={f.estado ?? "proxima"} onChange={e => setF({ ...f, estado: e.target.value as EstadoFiesta })}>
              <option value="prevista">Prevista</option>
              <option value="proxima">Próxima</option>
              <option value="realizada">Realizada</option>
            </select>
          </Field>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1 sm:flex-none gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar fiesta
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXCURSIONES — Subactividad blocks
// ══════════════════════════════════════════════════════════════════════════════

function SubactBlock({ idx, subact, onChange, realizada }: {
  idx: number; subact: Subact; onChange: (s: Subact) => void; realizada?: boolean;
}) {
  return (
    <div className="bg-muted/20 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-bold text-foreground">Subactividad {idx + 1}</p>
      <Field label="Nombre">
        <input className={inputCls} value={subact.nombre} onChange={e => onChange({ ...subact, nombre: e.target.value })} />
      </Field>
      {realizada ? (
        <>
          <Field label="Memoria"><textarea className={textareaCls} rows={2} value={subact.memoria} onChange={e => onChange({ ...subact, memoria: e.target.value })} /></Field>
          <PhotoPicker label="Foto principal" url={subact.fotoUrl} onChange={url => onChange({ ...subact, fotoUrl: url })} />
          <MultiPhotoPicker label="Más fotos" urls={subact.fotosUrls} onChange={urls => onChange({ ...subact, fotosUrls: urls })} />
        </>
      ) : (
        <PhotoPicker label="Foto" url={subact.fotoUrl} onChange={url => onChange({ ...subact, fotoUrl: url })} />
      )}
    </div>
  );
}

// ─── Excursion form (prevista / proxima / realizada) ─────────────────────────

function ExcursionForm({ initial, previstas, proximas, onSave, onCancel, saving }: {
  initial: ExcursionRow;
  previstas: ExcursionRow[];
  proximas: ExcursionRow[];
  onSave: (ex: ExcursionRow) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [ex, setEx] = useState<ExcursionRow>(() => ({
    ...initial,
    subactividades: initial.subactividades?.length
      ? initial.subactividades.map(s => ({ ...s, fotosUrls: (s as Subact).fotosUrls ?? [] }))
      : [1,2,3,4].map(emptySubact),
  }));
  const [importId, setImportId] = useState<number | null>(null);
  const { lang } = useTranslation();

  const estado = ex.estado as EstadoExc;
  const isRealizada = estado === "realizada";
  const isProxima   = estado === "proxima";

  const setSubact = (i: number, s: Subact) =>
    setEx(e => ({ ...e, subactividades: e.subactividades!.map((sa, j) => j === i ? s : sa) }));

  const doImport = (src: ExcursionRow) => {
    setEx({ ...src, id: ex.id, estado: ex.estado });
    setImportId(src.id);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={onCancel} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ChevronLeft className="w-4 h-4" /> Volver al índice
      </button>

      <div className="flex items-center gap-3 mb-8">
        <StateBadge estado={estado} lang={lang} />
        <h1 className="text-2xl font-bold text-foreground">
          {ex.id === 0 ? "Nueva excursión" : "Editar excursión"} — {lang === "eu" ? LABEL_EU[estado] : LABEL_ES[estado]}
        </h1>
      </div>

      {/* Import helper */}
      {isProxima && previstas.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-800 mb-2">Importar datos de una excursión prevista</p>
          <div className="flex gap-2 flex-wrap">
            {previstas.map(p => (
              <button key={p.id} type="button" onClick={() => doImport(p)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${importId === p.id ? "bg-blue-600 text-white border-blue-600" : "bg-white border-blue-300 text-blue-700 hover:bg-blue-100"}`}>
                {p.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
      {isRealizada && proximas.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-green-800 mb-2">Importar de una excursión próxima</p>
          <div className="flex gap-2 flex-wrap">
            {proximas.map(p => (
              <button key={p.id} type="button" onClick={() => doImport(p)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${importId === p.id ? "bg-green-600 text-white border-green-600" : "bg-white border-green-300 text-green-700 hover:bg-green-100"}`}>
                {p.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); onSave(ex); }} className="space-y-6">
        {/* Básicos */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Datos básicos</h2>
          <Field label="Nombre *"><input required className={inputCls} value={ex.nombre} onChange={e => setEx({ ...ex, nombre: e.target.value })} /></Field>
          <Field label="Nombre en Euskara"><input className={inputCls} value={ex.nombreEu ?? ""} onChange={e => setEx({ ...ex, nombreEu: e.target.value })} /></Field>
          <PhotoPicker label="Foto del lugar" url={ex.fotoUrl ?? ""} onChange={url => setEx({ ...ex, fotoUrl: url })} />
          <Field label="Fecha *"><input required type="date" className={inputCls} value={ex.fecha ?? ""} onChange={e => setEx({ ...ex, fecha: e.target.value })} /></Field>
          <Field label="Descripción"><textarea className={textareaCls} rows={3} value={ex.descripcion ?? ""} onChange={e => setEx({ ...ex, descripcion: e.target.value })} /></Field>
        </div>

        {/* Memoria (realizada) */}
        {isRealizada && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h2 className="font-bold text-foreground">Memoria de la excursión</h2>
            <Field label="Datos de participantes y resumen general">
              <textarea className={textareaCls} rows={4} placeholder="Número de participantes, incidencias, valoración..." value={ex.memoriaParticipantes ?? ""} onChange={e => setEx({ ...ex, memoriaParticipantes: e.target.value })} />
            </Field>
          </div>
        )}

        {/* Subactividades */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Subactividades</h2>
          {ex.subactividades?.map((sa, i) => (
            <SubactBlock key={i} idx={i} subact={sa as Subact} realizada={isRealizada} onChange={s => setSubact(i, s)} />
          ))}
        </div>

        {/* Precios (no realizada) */}
        {!isRealizada && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h2 className="font-bold text-foreground">Precios e inscripción</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Precio inscripción (€)"><input type="number" min="0" step="0.01" className={inputCls} value={ex.precioInscripcion ?? ""} onChange={e => setEx({ ...ex, precioInscripcion: e.target.value })} /></Field>
              <Field label="Subacts. en precio base"><input className={inputCls} placeholder="Ej: 1, 2" value={ex.subactsInscripcion ?? ""} onChange={e => setEx({ ...ex, subactsInscripcion: e.target.value })} /></Field>
              <Field label="Precio suplemento (€)"><input type="number" min="0" step="0.01" className={inputCls} value={ex.precioSuplemento ?? ""} onChange={e => setEx({ ...ex, precioSuplemento: e.target.value })} /></Field>
              <Field label="Subacts. en suplemento"><input className={inputCls} placeholder="Ej: 3, 4" value={ex.subactsSuplemento ?? ""} onChange={e => setEx({ ...ex, subactsSuplemento: e.target.value })} /></Field>
            </div>
            <Field label="Fecha fin de inscripción"><input type="date" className={inputCls} value={ex.fechaFinInscripcion ?? ""} onChange={e => setEx({ ...ex, fechaFinInscripcion: e.target.value })} /></Field>
          </div>
        )}

        {/* Logística */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Logística</h2>
          <Field label="Menú"><textarea className={textareaCls} rows={2} value={ex.menu ?? ""} onChange={e => setEx({ ...ex, menu: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Parada autobús 1"><input className={inputCls} placeholder="Lugar · HH:MM" value={ex.bus1 ?? ""} onChange={e => setEx({ ...ex, bus1: e.target.value })} /></Field>
            <Field label="Parada autobús 2"><input className={inputCls} placeholder="Lugar · HH:MM" value={ex.bus2 ?? ""} onChange={e => setEx({ ...ex, bus2: e.target.value })} /></Field>
          </div>
          <Field label="Hora de regreso"><input className={inputCls} placeholder="HH:MM" value={ex.horaRegreso ?? ""} onChange={e => setEx({ ...ex, horaRegreso: e.target.value })} /></Field>
          <Field label="Observaciones"><textarea className={textareaCls} rows={3} value={ex.observaciones ?? ""} onChange={e => setEx({ ...ex, observaciones: e.target.value })} /></Field>
        </div>

        {/* Cierre (realizada) */}
        {isRealizada && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h2 className="font-bold text-foreground">Cierre</h2>
            <Field label="Resumen de la excursión"><textarea className={textareaCls} rows={4} value={ex.resumen ?? ""} onChange={e => setEx({ ...ex, resumen: e.target.value })} /></Field>
          </div>
        )}

        {/* Publicación */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Publicación</h2>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="pub-exc" checked={!!ex.publicado} onChange={e => setEx({ ...ex, publicado: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
            <label htmlFor="pub-exc" className="text-sm">Publicado (visible en la web)</label>
          </div>
          <Field label="Estado">
            <select className={inputCls} value={ex.estado ?? "prevista"} onChange={e => setEx({ ...ex, estado: e.target.value as EstadoExc })}>
              <option value="prevista">Prevista</option>
              <option value="proxima">Próxima</option>
              <option value="realizada">Realizada</option>
            </select>
          </Field>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1 sm:flex-none gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar excursión
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIAJES
// ══════════════════════════════════════════════════════════════════════════════

function ViajeForm({ initial, onSave, onCancel, saving }: {
  initial: ViajeRow;
  onSave: (v: ViajeRow) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [v, setV] = useState<ViajeRow>(initial);
  const isNew = v.id === 0;
  const isRealizado = v.estado === "realizado";
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={onCancel} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>
      <h1 className="text-2xl font-bold text-foreground mb-8">{isNew ? "Nuevo viaje" : "Editar viaje"}</h1>

      <form onSubmit={e => { e.preventDefault(); onSave(v); }} className="space-y-6">
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Datos básicos</h2>
          <Field label="Nombre *"><input required className={inputCls} value={v.nombre} onChange={e => setV({ ...v, nombre: e.target.value })} /></Field>
          <Field label="Nombre en Euskara"><input className={inputCls} value={v.nombreEu ?? ""} onChange={e => setV({ ...v, nombreEu: e.target.value })} /></Field>
          <Field label="Destinos"><input className={inputCls} placeholder="Ej: Lisboa, Óbidos, Sintra" value={v.destinos ?? ""} onChange={e => setV({ ...v, destinos: e.target.value })} /></Field>
          <PhotoPicker label="Foto" url={v.fotoUrl ?? ""} onChange={url => setV({ ...v, fotoUrl: url })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha inicio"><input type="date" className={inputCls} value={v.fechaInicio ?? ""} onChange={e => setV({ ...v, fechaInicio: e.target.value })} /></Field>
            <Field label="Fecha fin"><input type="date" className={inputCls} value={v.fechaFin ?? ""} onChange={e => setV({ ...v, fechaFin: e.target.value })} /></Field>
          </div>
          <Field label="Descripción"><textarea className={textareaCls} rows={3} value={v.descripcion ?? ""} onChange={e => setV({ ...v, descripcion: e.target.value })} /></Field>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Itinerario y alojamiento</h2>
          <Field label="Itinerario (día a día)"><textarea className={textareaCls} rows={6} placeholder="Día 1: ...\nDía 2: ..." value={v.itinerario ?? ""} onChange={e => setV({ ...v, itinerario: e.target.value })} /></Field>
          <Field label="Alojamiento"><textarea className={textareaCls} rows={2} value={v.alojamiento ?? ""} onChange={e => setV({ ...v, alojamiento: e.target.value })} /></Field>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Precio y transporte</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Precio inscripción (€)"><input type="number" min="0" step="0.01" className={inputCls} value={v.precioInscripcion ?? ""} onChange={e => setV({ ...v, precioInscripcion: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Parada autobús 1"><input className={inputCls} placeholder="Lugar · HH:MM" value={v.bus1 ?? ""} onChange={e => setV({ ...v, bus1: e.target.value })} /></Field>
            <Field label="Parada autobús 2"><input className={inputCls} placeholder="Lugar · HH:MM" value={v.bus2 ?? ""} onChange={e => setV({ ...v, bus2: e.target.value })} /></Field>
          </div>
        </div>

        {isRealizado && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h2 className="font-bold text-foreground">Memoria del viaje</h2>
            <Field label="Participantes y valoración"><textarea className={textareaCls} rows={4} value={(v as ViajeRow & { memoriaParticipantes?: string }).memoriaParticipantes ?? ""} onChange={e => setV({ ...v, ...{ memoriaParticipantes: e.target.value } } as ViajeRow)} /></Field>
            <Field label="Resumen"><textarea className={textareaCls} rows={4} value={(v as ViajeRow & { resumen?: string }).resumen ?? ""} onChange={e => setV({ ...v, ...{ resumen: e.target.value } } as ViajeRow)} /></Field>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-foreground">Publicación</h2>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="pub-viaje" checked={!!v.publicado} onChange={e => setV({ ...v, publicado: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
            <label htmlFor="pub-viaje" className="text-sm">Publicado (visible en la web)</label>
          </div>
          <Field label="Estado">
            <select className={inputCls} value={v.estado ?? "previsto"} onChange={e => setV({ ...v, estado: e.target.value as EstadoViaje })}>
              <option value="previsto">Previsto</option>
              <option value="proximo">Próximo</option>
              <option value="realizado">Realizado</option>
            </select>
          </Field>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1 sm:flex-none gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar viaje
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Generic list header + item card
// ══════════════════════════════════════════════════════════════════════════════

function EventCard({ nombre, fecha, estado, fotoUrl, lang, onClick, onDelete }: {
  nombre: string; fecha?: string | null; estado?: string | null; fotoUrl?: string | null;
  lang: string; onClick: () => void; onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-all cursor-pointer" onClick={onClick}>
      {fotoUrl ? (
        <img src={fotoUrl} className="w-16 h-16 rounded-xl object-cover shrink-0" alt="" />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <MapPin className="w-6 h-6 text-muted-foreground/50" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {estado && <div className="mb-1"><StateBadge estado={estado} lang={lang} /></div>}
        <p className="font-semibold text-foreground truncate">{nombre}</p>
        {fecha && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="w-3.5 h-3.5" /> {new Date(fecha).toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", { day:"numeric", month:"long", year:"numeric" })}
          </p>
        )}
      </div>
      <button onClick={onDelete} className="ml-auto p-2 rounded-xl hover:bg-red-50 hover:text-red-500 text-muted-foreground transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

type Tab = "fiestas" | "excursiones" | "viajes";

type ViewState =
  | { type: "list" }
  | { type: "fiesta"; row: FiestaRow }
  | { type: "excursion"; row: ExcursionRow }
  | { type: "viaje"; row: ViajeRow };

export default function AdminEventos() {
  const { t, lang } = useTranslation();
  const token = useStore(s => s.token);
  const setUser = useStore(s => s.setUser);
  const setToken = useStore(s => s.setToken);

  const handleUnauthorized = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("denok-bat-storage");
    localStorage.removeItem("denok-bat-token");
    alert("Tu sesión ha expirado. Vuelve a iniciar sesión.");
    window.location.href = "/login";
  };

  const [tab, setTab]     = useState<Tab>("excursiones");
  const [view, setView]   = useState<ViewState>({ type: "list" });
  const [saving, setSaving] = useState(false);

  // ── Fiestas state ──────────────────────────────────────────────────────────
  const [fiestas, setFiestas]     = useState<FiestaRow[]>([]);
  const [loadingF, setLoadingF]   = useState(false);

  // ── Excursiones state ──────────────────────────────────────────────────────
  const [excursiones, setExcursiones] = useState<ExcursionRow[]>([]);
  const [loadingE, setLoadingE]       = useState(false);

  // ── Viajes state ───────────────────────────────────────────────────────────
  const [viajes, setViajes]   = useState<ViajeRow[]>([]);
  const [loadingV, setLoadingV] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchFiestas = useCallback(async () => {
    setLoadingF(true);
    try {
      const r = await fetch(`${API}/fiestas`);
      const d = await r.json();
      setFiestas(d.items ?? []);
    } catch { /* keep empty */ } finally { setLoadingF(false); }
  }, []);

  const fetchExcursiones = useCallback(async () => {
    setLoadingE(true);
    try {
      const r = await fetch(`${API}/excursiones`);
      const d = await r.json();
      setExcursiones(d.items ?? []);
    } catch { /* keep empty */ } finally { setLoadingE(false); }
  }, []);

  const fetchViajes = useCallback(async () => {
    setLoadingV(true);
    try {
      const r = await fetch(`${API}/viajes`);
      const d = await r.json();
      setViajes(d.items ?? []);
    } catch { /* keep empty */ } finally { setLoadingV(false); }
  }, []);

  useEffect(() => { fetchFiestas(); }, [fetchFiestas]);
  useEffect(() => { fetchExcursiones(); }, [fetchExcursiones]);
  useEffect(() => { fetchViajes(); }, [fetchViajes]);

  // ── Save / Delete helpers ──────────────────────────────────────────────────

  const saveFiesta = async (f: FiestaRow) => {
    setSaving(true);
    try {
      const url    = f.id === 0 ? `${API}/fiestas` : `${API}/fiestas/${f.id}`;
      const method = f.id === 0 ? "POST" : "PUT";
      const r = await fetch(url, { method, headers: authHeaders(token), body: JSON.stringify(f) });
      if (!r.ok) {
        if (r.status === 401) {
          handleUnauthorized();
          return;
        }
        const err = await r.json().catch(() => ({}));
        const detail = err?.detalle ? `\nDetalle: ${String(err.detalle)}` : "";
        alert("Error guardando: " + (err.error ?? r.statusText) + detail);
        return;
      }
      const saved: FiestaRow = await r.json();
      if (f.id === 0) setFiestas(prev => [saved, ...prev]);
      else setFiestas(prev => prev.map(x => x.id === saved.id ? saved : x));
      setView({ type: "list" });
    } catch (err) { alert("Error guardando: " + String(err)); } finally { setSaving(false); }
  };

  const deleteFiesta = async (id: number) => {
    if (!confirm("¿Eliminar esta fiesta?")) return;
    const r = await fetch(`${API}/fiestas/${id}`, { method: "DELETE", headers: authHeaders(token) });
    if (r.status === 401) {
      handleUnauthorized();
      return;
    }
    setFiestas(prev => prev.filter(x => x.id !== id));
  };

  const saveExcursion = async (ex: ExcursionRow) => {
    setSaving(true);
    try {
      const subactividades = ex.subactividades?.filter(s => s.nombre) ?? [];
      const payload = { ...ex, subactividades };
      const url    = ex.id === 0 ? `${API}/excursiones` : `${API}/excursiones/${ex.id}`;
      const method = ex.id === 0 ? "POST" : "PUT";
      const r = await fetch(url, { method, headers: authHeaders(token), body: JSON.stringify(payload) });
      if (!r.ok) {
        if (r.status === 401) {
          handleUnauthorized();
          return;
        }
        const err = await r.json().catch(() => ({}));
        const detail = err?.detalle ? `\nDetalle: ${String(err.detalle)}` : "";
        alert("Error guardando: " + (err.error ?? r.statusText) + detail);
        return;
      }
      const saved: ExcursionRow = await r.json();
      if (ex.id === 0) setExcursiones(prev => [saved, ...prev]);
      else setExcursiones(prev => prev.map(x => x.id === saved.id ? saved : x));
      setView({ type: "list" });
    } catch (err) { alert("Error guardando: " + String(err)); } finally { setSaving(false); }
  };

  const deleteExcursion = async (id: number) => {
    if (!confirm("¿Eliminar esta excursión?")) return;
    const r = await fetch(`${API}/excursiones/${id}`, { method: "DELETE", headers: authHeaders(token) });
    if (r.status === 401) {
      handleUnauthorized();
      return;
    }
    setExcursiones(prev => prev.filter(x => x.id !== id));
  };

  const saveViaje = async (v: ViajeRow) => {
    setSaving(true);
    try {
      const url    = v.id === 0 ? `${API}/viajes` : `${API}/viajes/${v.id}`;
      const method = v.id === 0 ? "POST" : "PUT";
      const r = await fetch(url, { method, headers: authHeaders(token), body: JSON.stringify(v) });
      if (!r.ok) {
        if (r.status === 401) {
          handleUnauthorized();
          return;
        }
        const err = await r.json().catch(() => ({}));
        const detail = err?.detalle ? `\nDetalle: ${String(err.detalle)}` : "";
        alert("Error guardando: " + (err.error ?? r.statusText) + detail);
        return;
      }
      const saved: ViajeRow = await r.json();
      if (v.id === 0) setViajes(prev => [saved, ...prev]);
      else setViajes(prev => prev.map(x => x.id === saved.id ? saved : x));
      setView({ type: "list" });
    } catch (err) { alert("Error guardando: " + String(err)); } finally { setSaving(false); }
  };

  const deleteViaje = async (id: number) => {
    if (!confirm("¿Eliminar este viaje?")) return;
    const r = await fetch(`${API}/viajes/${id}`, { method: "DELETE", headers: authHeaders(token) });
    if (r.status === 401) {
      handleUnauthorized();
      return;
    }
    setViajes(prev => prev.filter(x => x.id !== id));
  };

  // ── Form views ─────────────────────────────────────────────────────────────

  if (view.type === "fiesta") {
    return <FiestaForm initial={view.row} onSave={saveFiesta} onCancel={() => setView({ type: "list" })} saving={saving} />;
  }
  if (view.type === "excursion") {
    const previstas = excursiones.filter(e => e.estado === "prevista");
    const proximas  = excursiones.filter(e => e.estado === "proxima");
    return <ExcursionForm initial={view.row} previstas={previstas} proximas={proximas} onSave={saveExcursion} onCancel={() => setView({ type: "list" })} saving={saving} />;
  }
  if (view.type === "viaje") {
    return <ViajeForm initial={view.row} onSave={saveViaje} onCancel={() => setView({ type: "list" })} saving={saving} />;
  }

  // ── List view ──────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "fiestas",     label: "Fiestas",     icon: "🎉" },
    { id: "excursiones", label: "Excursiones", icon: "🚌" },
    { id: "viajes",      label: "Viajes",      icon: "✈️" },
  ];

  const newButtonsByTab: Record<Tab, React.ReactNode> = {
    fiestas: (
      <Button size="sm" className="gap-1.5" onClick={() => setView({ type: "fiesta", row: emptyFiesta() })}>
        <Plus className="w-3.5 h-3.5" /> Nueva fiesta
      </Button>
    ),
    excursiones: (
      <div className="flex gap-2 flex-wrap">
        {(["prevista", "proxima", "realizada"] as EstadoExc[]).map(est => (
          <Button key={est} size="sm" variant="outline" className="gap-1.5"
            onClick={() => setView({ type: "excursion", row: emptyExcursion(est) })}>
            <Plus className="w-3.5 h-3.5" /> {lang === "eu" ? LABEL_EU[est] : LABEL_ES[est]}
          </Button>
        ))}
      </div>
    ),
    viajes: (
      <div className="flex gap-2 flex-wrap">
        {(["previsto", "proximo", "realizado"] as EstadoViaje[]).map(est => (
          <Button key={est} size="sm" variant="outline" className="gap-1.5"
            onClick={() => setView({ type: "viaje", row: emptyViaje(est) })}>
            <Plus className="w-3.5 h-3.5" /> {lang === "eu" ? LABEL_EU[est] : LABEL_ES[est]}
          </Button>
        ))}
      </div>
    ),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("menu.admin_eventos")}</h1>
        {newButtonsByTab[tab]}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border mb-8">
        {tabs.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "fiestas" && (
        <div className="space-y-3">
          {loadingF ? <Spinner /> : fiestas.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No hay fiestas. ¡Crea la primera!</p>
          ) : fiestas.map(f => (
            <EventCard key={f.id} nombre={f.nombre} fecha={f.fecha} estado={f.estado} fotoUrl={f.fotoUrl} lang={lang}
              onClick={() => setView({ type: "fiesta", row: { ...f, subactividades: undefined } as FiestaRow })}
              onDelete={e => { e.stopPropagation(); deleteFiesta(f.id); }} />
          ))}
        </div>
      )}

      {tab === "excursiones" && (
        <div className="space-y-3">
          {loadingE ? <Spinner /> : excursiones.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No hay excursiones. ¡Crea la primera!</p>
          ) : [...excursiones].sort((a,b) => (a.fecha ?? "").localeCompare(b.fecha ?? "")).map(ex => (
            <EventCard key={ex.id} nombre={ex.nombre} fecha={ex.fecha} estado={ex.estado} fotoUrl={ex.fotoUrl} lang={lang}
              onClick={() => setView({ type: "excursion", row: ex })}
              onDelete={e => { e.stopPropagation(); deleteExcursion(ex.id); }} />
          ))}
        </div>
      )}

      {tab === "viajes" && (
        <div className="space-y-3">
          {loadingV ? <Spinner /> : viajes.length === 0 ? (
            <div className="text-center py-16">
              <Plane className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No hay viajes. ¡Crea el primero!</p>
            </div>
          ) : viajes.map(v => (
            <EventCard key={v.id} nombre={v.nombre} fecha={v.fechaInicio} estado={v.estado} fotoUrl={v.fotoUrl} lang={lang}
              onClick={() => setView({ type: "viaje", row: v })}
              onDelete={e => { e.stopPropagation(); deleteViaje(v.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}
