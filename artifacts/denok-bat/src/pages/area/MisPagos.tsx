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
      if (!r.ok) throw new Error(t("pagos.error_load"));
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
        throw new Error(detail || t("pagos.error_register"));
      }
      await loadPagos();
      toast({
        title: t("pagos.registered_title"),
        description: t("pagos.registered_desc"),
      });
      if (prefInscripcionId) {
        setTimeout(() => {
          setLocation("/mis-inscripciones");
        }, 450);
      }
    } catch (err) {
      toast({
        title: t("pagos.error_title"),
        description: err instanceof Error ? err.message : t("pagos.error_register"),
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
          <h2 className="text-lg font-bold text-foreground">{t("pagos.options_title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("pagos.options_desc")}
            {importePendiente ? ` ${t("pagos.pending_amount")}: ${importePendiente}€.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={metodoSeleccionado === "transferencia" ? "default" : "outline"}
            onClick={() => setMetodoSeleccionado("transferencia")}
          >
            {t("pagos.transfer")}
          </Button>
          <Button
            type="button"
            variant={metodoSeleccionado === "tarjeta" ? "default" : "outline"}
            onClick={() => setMetodoSeleccionado("tarjeta")}
          >
            {t("pagos.card")}
          </Button>
        </div>
        {metodoSeleccionado === "transferencia" && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
            <p className="font-semibold text-foreground">{t("pagos.transfer_form")}</p>
            <p className="text-sm text-muted-foreground">IBAN: ES00 0000 0000 0000 0000 0000</p>
            <p className="text-sm text-muted-foreground">{t("pagos.transfer_concept_hint")}</p>
            <Button size="sm" onClick={handlePay} disabled={!prefPagoId || paying}>
              {paying ? t("common.registering") : t("pagos.mark_transfer_done")}
            </Button>
          </div>
        )}
        {metodoSeleccionado === "tarjeta" && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
            <p className="font-semibold text-foreground">{t("pagos.card_form")}</p>
            <p className="text-sm text-muted-foreground">{t("pagos.card_pending")}</p>
            <Button size="sm" onClick={handlePay} disabled={!prefPagoId || paying}>
              {paying ? t("common.registering") : t("pagos.pay_card")}
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
                <td className="px-5 py-4 text-muted-foreground" colSpan={6}>{t("pagos.loading")}</td>
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
                <td className="px-5 py-4 text-muted-foreground" colSpan={6}>{t("pagos.none")}</td>
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
