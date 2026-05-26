import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Calendar, Tag, Euro, Bus, Loader2, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { useStore } from "@/store/use-store";
import { Link } from "wouter";

const API = "/api";

type Pago = {
  id: number;
  estado: string;
  importe: string;
  metodo: string | null;
};

type Inscripcion = {
  id: number;
  tipo: string;
  estado: string | null;
  nombre?: string;
  nombreEu?: string | null;
  fecha?: string | null;
  paradaBus: string | null;
  fechaInscripcion: string | null;
  pagos: Pago[];
};

const TIPO_KEY: Record<string, string> = {
  fiesta:    "inscripciones.tipo.fiesta",
  evento:    "inscripciones.tipo.evento",
  actividad: "inscripciones.tipo.actividad",
  excursion: "inscripciones.tipo.excursion",
  viaje:     "inscripciones.tipo.viaje",
};

function estadoBadge(estado: string | null, t: (k: string) => string) {
  if (estado === "confirmada" || estado === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" />
        {t("inscripciones.confirmed_short")}
      </span>
    );
  }
  if (estado === "pendiente" || estado === "waiting") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
        <Clock3 className="w-3 h-3" />
        {t("inscripciones.waiting_short")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
      {estado ?? "—"}
    </span>
  );
}

export default function MisInscripciones() {
  const { t, lang } = useTranslation();
  const { token } = useStore();
  const [items, setItems] = useState<Inscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/inscripciones`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!r.ok) throw new Error(t("inscripciones.load_error"));
      const d = await r.json();
      setItems(d.items ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      const r = await fetch(`${API}/inscripciones/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (r.ok) setItems(prev => prev.filter(i => i.id !== id));
    } finally { setCancelling(null); }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t("inscripciones.title")}</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {t("inscripciones.load_error")}
        </div>
      )}

      {items.length === 0 && !error ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center text-muted-foreground">
          <Tag className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">{t("inscripciones.none_yet")}</p>
          <p className="text-sm mt-1">{t("inscripciones.go_events")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const nombre = lang === "eu" ? (item.nombreEu ?? item.nombre ?? "—") : (item.nombre ?? "—");
            const tipoLabel = TIPO_KEY[item.tipo] ? t(TIPO_KEY[item.tipo]) : item.tipo;
            const pendingPago = item.pagos?.find(p => p.estado === "pendiente") ?? null;

            return (
              <div key={item.id} className="bg-white rounded-2xl border border-border shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-base">{nombre}</p>
                      {estadoBadge(item.estado, t)}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />{tipoLabel}
                      </span>
                      {item.fecha && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary" />
                          {new Date(item.fecha + "T12:00:00").toLocaleDateString("es-ES", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </span>
                      )}
                      {item.paradaBus && item.paradaBus !== "__none__" && (
                        <span className="flex items-center gap-1">
                          <Bus className="w-3 h-3 text-primary" />📍 {item.paradaBus}
                        </span>
                      )}
                    </div>

                    {/* Pago pendiente */}
                    {pendingPago && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Euro className="w-4 h-4 text-amber-600 shrink-0" />
                        <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-amber-700 font-medium">
                            {t("inscripciones.pago_pendiente_prefix")}{" "}
                            <span className="font-bold">{parseFloat(pendingPago.importe)}€</span>
                          </p>
                          <Link href={`/mis-pagos?inscripcionId=${item.id}&pagoId=${pendingPago.id}&importe=${encodeURIComponent(String(pendingPago.importe ?? ""))}`}>
                            <Button size="sm" className="h-7 text-xs px-3">
                              {t("inscripciones.pay")}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(item.id)}
                    disabled={cancelling === item.id}
                    className="text-red-500 border-red-200 hover:bg-red-50 shrink-0"
                  >
                    {cancelling === item.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : t("inscripciones.cancel")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
