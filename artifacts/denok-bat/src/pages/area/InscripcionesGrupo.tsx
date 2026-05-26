import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/use-store";
import { Edit, Loader2, X } from "lucide-react";

const API = "/api";

type Tipo = "fiesta" | "excursion" | "viaje" | "evento" | "actividad";
type EstadoSeccion = "proxima" | "previstas" | "realizadas";

type EventoRow = {
  tipo: Tipo;
  id: number;
  nombre: string | null;
  nombre_eu: string | null;
  fecha: string | null;
  precio: string | number | null;
  precio_suplemento: string | number | null;
  lugar: string | null;
  estado: string | null;
};

const TIPO_LABELS: Record<Tipo, { es: string; eu: string }> = {
  fiesta: { es: "Fiesta", eu: "Jaia" },
  excursion: { es: "Excursión", eu: "Irteera" },
  viaje: { es: "Viaje", eu: "Bidaia" },
  evento: { es: "Evento", eu: "Ekitaldia" },
  actividad: { es: "Actividad", eu: "Jarduera" },
};

type PagoTipo = "efectivo" | "banco" | "pendiente";

type InscritoRow = {
  inscripcionId: number;
  socioId: number;
  socioNombre: string | null;
  socioApellidos: string | null;
  socioGenero: string | null;
  socioDni: string | null;
  socioPoblacion: string | null;
  socioGrupoId: number | null;
  subactividad: boolean;
  subactividadDetalle: string | null;
  paradaBus: string | null;
  observaciones: string | null;
  importe: number;
  pago: {
    id: number | null;
    tipo: PagoTipo;
    estado: string | null;
    metodo: string | null;
    importe: number | null;
  };
};

type Totales = {
  inscritos: number;
  subactividad: number;
  femenino: number;
  masculino: number;
  otros: number;
  importeEfectivo: number;
  importeBanco: number;
  importePendiente: number;
};

const ESTADO_TABS: { key: EstadoSeccion; labelKey: string }[] = [
  { key: "proxima", labelKey: "grupo_inscripcion.estado.proxima" },
  { key: "previstas", labelKey: "grupo_inscripcion.estado.previstas" },
  { key: "realizadas", labelKey: "grupo_inscripcion.estado.realizadas" },
];

function fmtMoney(n: number): string {
  return `${n.toFixed(2)} €`;
}

function clasificarPorFecha(items: EventoRow[]): {
  proxima: EventoRow[];
  previstas: EventoRow[];
  realizadas: EventoRow[];
} {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const conFecha = items.map((e) => {
    const t = e.fecha ? new Date(e.fecha).getTime() : NaN;
    return { e, t: Number.isFinite(t) ? t : null };
  });
  const futuros = conFecha
    .filter((x) => x.t !== null && (x.t as number) >= hoy.getTime())
    .sort((a, b) => (a.t as number) - (b.t as number));
  const pasados = conFecha
    .filter((x) => x.t !== null && (x.t as number) < hoy.getTime())
    .sort((a, b) => (b.t as number) - (a.t as number));
  const sinFecha = conFecha.filter((x) => x.t === null).map((x) => x.e);
  const [proximaItem, ...restoFuturos] = futuros;
  return {
    proxima: proximaItem ? [proximaItem.e] : [],
    previstas: [...restoFuturos.map((x) => x.e), ...sinFecha],
    realizadas: pasados.map((x) => x.e),
  };
}

function authHeaders(token: string | null): Record<string, string> {
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

export default function InscripcionesGrupo() {
  const { t, lang } = useTranslation();
  const token = useStore((s) => s.token);

  const [estado, setEstado] = useState<EstadoSeccion>("proxima");
  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [seleccion, setSeleccion] = useState<{ tipo: Tipo; id: number } | null>(null);
  const [inscritos, setInscritos] = useState<InscritoRow[]>([]);
  const [evento, setEvento] = useState<EventoRow | null>(null);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<InscritoRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clasificados = useMemo(() => clasificarPorFecha(eventos), [eventos]);
  const eventosDeEstado = clasificados[estado];

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setLoadingEventos(true);
      setError(null);
      try {
        const r = await fetch(`${API}/delegado/eventos?tipo=todos`, {
          headers: authHeaders(token),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(String(d?.error ?? r.status));
        if (cancelled) return;
        const items: EventoRow[] = Array.isArray(d?.items) ? d.items : [];
        setEventos(items);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("common.error"));
        setEventos([]);
      } finally {
        if (!cancelled) setLoadingEventos(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, lang]);

  // Auto-seleccionar el primer evento del estado actual.
  useEffect(() => {
    if (eventosDeEstado.length === 0) {
      setSeleccion(null);
      setInscritos([]);
      setEvento(null);
      setTotales(null);
      return;
    }
    const first = eventosDeEstado[0];
    setSeleccion({ tipo: first.tipo, id: first.id });
  }, [estado, eventos.length, eventosDeEstado.length]);

  // Cargar inscritos cuando hay evento seleccionado.
  useEffect(() => {
    if (!token || !seleccion) {
      setInscritos([]);
      setEvento(null);
      setTotales(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingInscritos(true);
      setError(null);
      setMotivo(null);
      try {
        const r = await fetch(`${API}/delegado/inscritos?tipo=${seleccion!.tipo}&id=${seleccion!.id}`, {
          headers: authHeaders(token),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(String(d?.error ?? r.status));
        if (cancelled) return;
        setInscritos(Array.isArray(d?.items) ? d.items : []);
        setEvento(d?.evento ?? null);
        setTotales(d?.totales ?? null);
        setMotivo(typeof d?.motivo === "string" ? d.motivo : null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("common.error"));
        setInscritos([]);
        setTotales(null);
      } finally {
        if (!cancelled) setLoadingInscritos(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, seleccion?.tipo, seleccion?.id, lang]);

  const reloadInscritos = async () => {
    if (!token || !seleccion) return;
    const r = await fetch(`${API}/delegado/inscritos?tipo=${seleccion.tipo}&id=${seleccion.id}`, {
      headers: authHeaders(token),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return;
    setInscritos(Array.isArray(d?.items) ? d.items : []);
    setEvento(d?.evento ?? null);
    setTotales(d?.totales ?? null);
  };

  const updateInscrito = async (
    row: InscritoRow,
    patch: Partial<{
      subactividad: boolean;
      paradaBus: string | null;
      observaciones: string | null;
      pago: { tipo: PagoTipo; metodo?: string };
    }>,
  ) => {
    if (!token) return;
    setSavingId(row.inscripcionId);
    try {
      const r = await fetch(`${API}/delegado/inscripciones/${row.inscripcionId}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(patch),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      await reloadInscritos();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground mb-6">{t("grupo_inscripcion.title")}</h1>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {ESTADO_TABS.map((sb) => (
          <button
            key={sb.key}
            onClick={() => setEstado(sb.key)}
            className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all ${
              estado === sb.key
                ? "border-primary text-primary bg-primary/5"
                : "border-border bg-white text-muted-foreground hover:border-primary/30"
            }`}
          >
            {t(sb.labelKey)}
            <span className="ml-2 text-xs opacity-60">{clasificados[sb.key].length}</span>
          </button>
        ))}
      </div>

      <div className="mb-4">
        {loadingEventos ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : eventosDeEstado.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("grupo_inscripcion.no_events")}</p>
        ) : (
          <select
            value={seleccion ? `${seleccion.tipo}:${seleccion.id}` : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setSeleccion(null);
                return;
              }
              const [t, id] = v.split(":");
              setSeleccion({ tipo: t as Tipo, id: Number(id) });
            }}
            className="w-full md:w-auto min-w-[320px] px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t("grupo_inscripcion.select_event")}</option>
            {eventosDeEstado.map((ev) => {
              const nombre = lang === "eu" ? ev.nombre_eu || ev.nombre : ev.nombre;
              const fecha = ev.fecha ? new Date(ev.fecha).toLocaleDateString("es-ES") : "—";
              const tipoLbl = lang === "eu" ? TIPO_LABELS[ev.tipo].eu : TIPO_LABELS[ev.tipo].es;
              return (
                <option key={`${ev.tipo}-${ev.id}`} value={`${ev.tipo}:${ev.id}`}>
                  [{tipoLbl}] {nombre} · {fecha}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {motivo === "usuario_sin_socio" || motivo === "no_es_delegado" ? (
        <p className="text-sm text-muted-foreground mb-4">{t("grupo_inscripcion.no_group")}</p>
      ) : null}

      {evento ? (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4">
          <p className="font-bold text-foreground flex items-center gap-2 flex-wrap">
            {seleccion ? (
              <span className="inline-block px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                {lang === "eu" ? TIPO_LABELS[seleccion.tipo].eu : TIPO_LABELS[seleccion.tipo].es}
              </span>
            ) : null}
            <span>{lang === "eu" ? evento.nombre_eu || evento.nombre : evento.nombre}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {evento.fecha ? new Date(evento.fecha).toLocaleDateString("es-ES") : "—"}
            {" · "}
            {t("grupo_inscripcion.price")}: {fmtMoney(Number(evento.precio ?? 0) || 0)}
            {evento.precio_suplemento != null && Number(evento.precio_suplemento) > 0 ? (
              <>
                {" "}
                + {fmtMoney(Number(evento.precio_suplemento))} {t("grupo_inscripcion.subact_short")}
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {loadingInscritos ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : seleccion && inscritos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">{t("grupo_inscripcion.no_inscritos")}</p>
      ) : seleccion ? (
        <>
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold text-muted-foreground">
                    {t("common.name")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground">
                    {t("common.gender")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground">
                    {t("grupo_inscripcion.col.amount")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground">
                    {t("grupo_inscripcion.col.payment")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground">
                    {t("grupo_inscripcion.col.subact_short")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground">
                    {t("grupo_inscripcion.col.bus_stop_short")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground">
                    {t("grupo_inscripcion.observations")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground text-right">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inscritos.map((row) => {
                  const nombre = `${row.socioApellidos ?? ""} ${row.socioNombre ?? ""}`.trim();
                  // BD: M (Masculino), F (Femenino), N (Otros). Acepta "H" antiguo como M.
                  // Visualización: M/F/N en español, G/E/N en euskera.
                  const gRaw = String(row.socioGenero ?? "").trim().toUpperCase();
                  const gCode = gRaw === "H" ? "M" : gRaw === "M" || gRaw === "F" || gRaw === "N" ? gRaw : "";
                  const genero = gCode === "M" ? t("socios.form.gender.code.male")
                    : gCode === "F" ? t("socios.form.gender.code.female")
                    : gCode === "N" ? t("socios.form.gender.code.nonbinary")
                    : "";
                  return (
                    <tr key={row.inscripcionId} className="hover:bg-muted/20">
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium text-foreground">{nombre || `#${row.socioId}`}</p>
                        {row.socioPoblacion ? (
                          <p className="text-xs text-muted-foreground">{row.socioPoblacion}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 align-top text-muted-foreground">
                        {genero || "—"}
                      </td>
                      <td className="px-3 py-2 align-top font-semibold">
                        {fmtMoney(row.importe)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col gap-1 text-xs">
                          {(["efectivo", "banco", "pendiente"] as PagoTipo[]).map((p) => (
                            <label key={p} className="inline-flex items-center gap-1.5">
                              <input
                                type="radio"
                                name={`pago-${row.inscripcionId}`}
                                checked={row.pago.tipo === p}
                                disabled={savingId === row.inscripcionId}
                                onChange={() => void updateInscrito(row, { pago: { tipo: p } })}
                              />
                              {t(`grupo_inscripcion.pago.${p}`)}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <label className="inline-flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={row.subactividad}
                            disabled={savingId === row.inscripcionId}
                            onChange={(e) =>
                              void updateInscrito(row, { subactividad: e.target.checked })
                            }
                          />
                          {t("common.yes")}
                        </label>
                      </td>
                      <td className="px-3 py-2 align-top text-muted-foreground">
                        {row.paradaBus ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-muted-foreground">
                        {row.observaciones ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEditing(row)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          {t("common.modify")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totales ? (
                <tfoot>
                  <tr className="bg-muted/30 font-bold text-sm">
                    <td className="px-3 py-2" colSpan={2}>
                      {t("grupo_inscripcion.total_line")}
                    </td>
                    <td className="px-3 py-2 text-xs font-normal text-muted-foreground" colSpan={6}>
                      {t("grupo_inscripcion.totales.inscritos")}: {totales.inscritos}
                      {" · "}
                      {t("grupo_inscripcion.totales.subact")}: {totales.subactividad}
                      {" · "}
                      {t("grupo_inscripcion.totales.fm")}: {totales.masculino} / {totales.femenino}
                      {totales.otros > 0 ? ` · N: ${totales.otros}` : null}
                      <br />
                      <span className="text-green-700">
                        {t("grupo_inscripcion.totales.efectivo")}:{" "}
                        {fmtMoney(totales.importeEfectivo)}
                      </span>
                      {" · "}
                      <span className="text-blue-700">
                        {t("grupo_inscripcion.totales.banco")}: {fmtMoney(totales.importeBanco)}
                      </span>
                      {" · "}
                      <span className="text-amber-700">
                        {t("grupo_inscripcion.totales.pendiente")}:{" "}
                        {fmtMoney(totales.importePendiente)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </>
      ) : null}

      {seleccion && totales && (totales.importeEfectivo > 0 || inscritos.length > 0) ? (
        <LiquidacionBloque
          tipo={seleccion.tipo}
          eventoId={seleccion.id}
          token={token}
          importeEnMano={totales.importeEfectivo}
          onDone={() => void reloadInscritos()}
          t={t}
        />
      ) : null}

      {editing ? (
        <EditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await updateInscrito(editing, patch);
            setEditing(null);
          }}
          saving={savingId === editing.inscripcionId}
          t={t}
        />
      ) : null}
    </div>
  );
}

function EditModal({
  row,
  onClose,
  onSave,
  saving,
  t,
}: {
  row: InscritoRow;
  onClose: () => void;
  onSave: (patch: {
    paradaBus: string | null;
    observaciones: string | null;
    subactividad: boolean;
    pago: { tipo: PagoTipo };
  }) => Promise<void>;
  saving: boolean;
  t: (k: string) => string;
}) {
  const [parada, setParada] = useState<string>(row.paradaBus ?? "");
  const [observ, setObserv] = useState<string>(row.observaciones ?? "");
  const [subact, setSubact] = useState<boolean>(row.subactividad);
  const [pagoTipo, setPagoTipo] = useState<PagoTipo>(row.pago.tipo);
  const nombre = `${row.socioApellidos ?? ""} ${row.socioNombre ?? ""}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{t("grupo_inscripcion.modal.title")}</h3>
            <p className="text-sm text-muted-foreground">{nombre || `#${row.socioId}`}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {t("grupo_inscripcion.col.payment")}
            </label>
            <div className="grid grid-cols-3 gap-1 text-xs">
              {(["efectivo", "banco", "pendiente"] as PagoTipo[]).map((p) => (
                <label
                  key={p}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 cursor-pointer ${
                    pagoTipo === p ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="modal-pago"
                    value={p}
                    checked={pagoTipo === p}
                    onChange={() => setPagoTipo(p)}
                  />
                  {t(`grupo_inscripcion.pago.${p}`)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={subact}
                onChange={(e) => setSubact(e.target.checked)}
              />
              {t("grupo_inscripcion.subactivity")}
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {t("grupo_inscripcion.bus_stop")}
            </label>
            <input
              value={parada}
              onChange={(e) => setParada(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {t("grupo_inscripcion.observations")}
            </label>
            <textarea
              value={observ}
              onChange={(e) => setObserv(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button
            className="flex-1"
            disabled={saving}
            onClick={() => {
              void onSave({
                paradaBus: parada.trim() || null,
                observaciones: observ.trim() || null,
                subactividad: subact,
                pago: { tipo: pagoTipo },
              });
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LiquidacionBloque({
  tipo,
  eventoId,
  token,
  importeEnMano,
  onDone,
  t,
}: {
  tipo: Tipo;
  eventoId: number;
  token: string | null;
  importeEnMano: number;
  onDone: () => void;
  t: (k: string) => string;
}) {
  type Metodo = "transferencia" | "ingreso" | "bizum" | "tpv" | "tesoreria" | "otro";
  const METODOS: Metodo[] = ["transferencia", "ingreso", "bizum", "tpv", "tesoreria", "otro"];
  const [metodo, setMetodo] = useState<Metodo>("transferencia");
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [referencia, setReferencia] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const aplicar = async () => {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API}/delegado/liquidacion?tipo=${tipo}&id=${eventoId}`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ metodo, fecha, referencia }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      setNotice(
        `${t("grupo_inscripcion.liquidacion.ok")} (${d?.actualizados ?? 0} · ${fmtMoney(Number(d?.importeTotal ?? 0))})`,
      );
      onDone();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-white p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-foreground">{t("grupo_inscripcion.liquidacion.title")}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t("grupo_inscripcion.liquidacion.subtitle")}</p>
        <p className="text-sm font-bold text-green-700 mt-1">
          {t("grupo_inscripcion.totales.efectivo")}: {fmtMoney(importeEnMano)}
        </p>
      </div>
      <div className="grid md:grid-cols-4 gap-2">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t("grupo_inscripcion.liquidacion.metodo")}
          </label>
          <select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as Metodo)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {t(`grupo_inscripcion.liquidacion.metodo.${m}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t("grupo_inscripcion.liquidacion.fecha")}
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            {t("grupo_inscripcion.liquidacion.referencia")}
          </label>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : <span />}
        <Button onClick={() => void aplicar()} disabled={saving || importeEnMano <= 0}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t("grupo_inscripcion.liquidacion.aplicar")}
        </Button>
      </div>
    </div>
  );
}
