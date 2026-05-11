import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useStore } from "@/store/use-store";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

type PagoRow = {
  id: number;
  concepto: string | null;
  createdAt?: string | null;
  fechaPago?: string | null;
  importe: string | null;
  metodo: string | null;
  estado: string | null;
};

function isPagoPaid(estado: string | null | undefined) {
  const norm = String(estado ?? "").toLowerCase();
  return norm === "pagado" || norm === "paid";
}

export default function MisPagos() {
  const { t } = useTranslation();
  const { token } = useStore();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const query = useMemo(() => {
    const qIdx = location.indexOf("?");
    return new URLSearchParams(qIdx >= 0 ? location.slice(qIdx + 1) : "");
  }, [location]);
  const prefMetodo = query.get("metodo");
  const prefPagoId = Number(query.get("pagoId") ?? 0) || null;
  const prefInscripcionId = Number(query.get("inscripcionId") ?? 0) || null;
  const importePendiente = query.get("importe");
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<"transferencia" | "tarjeta">(
    prefMetodo === "tarjeta" ? "tarjeta" : "transferencia",
  );
  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const loadPagos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/pagos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("No se pudieron cargar los pagos");
      const d = await r.json();
      setPagos(Array.isArray(d?.items) ? d.items : []);
    } catch {
      setPagos([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPagos();
  }, [loadPagos]);

  const total = pagos
    .filter(p => isPagoPaid(p.estado))
    .reduce((sum, p) => sum + (Number(p.importe ?? 0) || 0), 0);

  const handlePay = async () => {
    if (!token || !prefPagoId) return;
    setPaying(true);
    try {
      const r = await fetch(`${API}/pagos/${prefPagoId}/pagar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ metodo: metodoSeleccionado }),
      });
      if (!r.ok) {
        let detail = "";
        try {
          const payload = await r.json();
          detail = String(payload?.error ?? payload?.detalle ?? "");
        } catch {
          detail = "";
        }
        throw new Error(detail || "No se pudo registrar el pago");
      }
      await loadPagos();
      toast({
        title: "Pago registrado",
        description: "El pago se ha marcado como pagado correctamente.",
      });
      if (prefInscripcionId) {
        setTimeout(() => {
          setLocation("/mis-inscripciones");
        }, 450);
      }
    } catch (err) {
      toast({
        title: "Error en el pago",
        description: err instanceof Error ? err.message : "No se pudo registrar el pago.",
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("pagos.title")}</h1>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {t("common.export")}
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Opciones de pago</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona el método y completa su formulario de pago.
            {importePendiente ? ` Importe pendiente: ${importePendiente}€.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={metodoSeleccionado === "transferencia" ? "default" : "outline"}
            onClick={() => setMetodoSeleccionado("transferencia")}
          >
            Transferencia
          </Button>
          <Button
            type="button"
            variant={metodoSeleccionado === "tarjeta" ? "default" : "outline"}
            onClick={() => setMetodoSeleccionado("tarjeta")}
          >
            Tarjeta
          </Button>
        </div>
        {metodoSeleccionado === "transferencia" && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
            <p className="font-semibold text-foreground">Formulario de pago por transferencia</p>
            <p className="text-sm text-muted-foreground">IBAN: ES00 0000 0000 0000 0000 0000</p>
            <p className="text-sm text-muted-foreground">Concepto: Nº inscripción o nombre completo.</p>
            <Button size="sm" onClick={handlePay} disabled={!prefPagoId || paying}>
              {paying ? "Registrando..." : "He realizado la transferencia"}
            </Button>
          </div>
        )}
        {metodoSeleccionado === "tarjeta" && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
            <p className="font-semibold text-foreground">Formulario de pago con tarjeta</p>
            <p className="text-sm text-muted-foreground">Pasarela de tarjeta (pendiente de integración).</p>
            <Button size="sm" onClick={handlePay} disabled={!prefPagoId || paying}>
              {paying ? "Registrando..." : "Pagar con tarjeta"}
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">{t("pagos.concept")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground hidden sm:table-cell">{t("common.date")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">{t("common.amount")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground hidden sm:table-cell">{t("pagos.method")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">{t("common.status")}</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">{t("pagos.receipt")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td className="px-5 py-4 text-muted-foreground" colSpan={6}>Cargando pagos...</td>
              </tr>
            )}
            {!loading && pagos.map((pago) => (
              <tr key={pago.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4 font-medium text-foreground">{pago.concepto || "-"}</td>
                <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">{(pago.fechaPago || pago.createdAt || "").slice(0, 10) || "-"}</td>
                <td className="px-5 py-4 font-semibold text-foreground">{Number(pago.importe ?? 0).toFixed(2)} €</td>
                <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">{pago.metodo || "-"}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isPagoPaid(pago.estado) ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {isPagoPaid(pago.estado) ? t("common.paid") : t("common.pending")}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {isPagoPaid(pago.estado) && (
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">
                      <Download className="w-3.5 h-3.5" />PDF
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && pagos.length === 0 && (
              <tr>
                <td className="px-5 py-4 text-muted-foreground" colSpan={6}>No hay pagos todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="bg-primary/10 rounded-xl px-6 py-3 text-right">
          <p className="text-sm text-muted-foreground">{t("common.total")} {t("common.paid")}</p>
          <p className="text-2xl font-bold text-primary">{total.toFixed(2)} €</p>
        </div>
      </div>
    </div>
  );
}
