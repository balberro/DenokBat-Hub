import { useEffect, useState } from "react";
import { Tag, Server, GitCommit, Clock, Cpu, RefreshCw } from "lucide-react";
import { useTranslation } from "@/i18n/translations";
import { useStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type VersionInfo = {
  version: string;
  entorno: string;
  commit: string | null;
  buildTime: string | null;
  node: string;
  uptimeSeconds: number;
};

/** Formatea una duración en segundos como "3d 4h 12m" / "12m 34s". */
function formatUptime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Traduce el valor del entorno a algo legible. */
function entornoLabel(entorno: string): string {
  if (entorno === "production") return "Producción";
  if (entorno === "development") return "Desarrollo";
  return entorno;
}

/**
 * Panel de versión/entorno.
 *
 * Consume `GET /api/version` (endpoint solo para administradores) y muestra la
 * versión desplegada, el entorno de ejecución, el commit, la fecha de build,
 * la versión de Node y el tiempo de actividad del proceso. Pensado para el
 * panel de administración, de modo que el administrador vea de un vistazo qué
 * versión está corriendo. No distingue test/producción: solo
 * "production" | "development".
 *
 * No renderiza nada si no hay sesión: la propia API ya restringe el acceso al
 * rol administrador, así que el control de visibilidad es doble.
 */
export default function AppVersionPanel({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/api/version`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as VersionInfo;
      setInfo(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) return null;

  const rows: { icon: typeof Tag; label: string; value: React.ReactNode }[] = [];

  if (info) {
    rows.push({
      icon: Tag,
      label: t("app.version.env_label"),
      value: (
        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wide">
          {entornoLabel(info.entorno)}
        </span>
      ),
    });
    rows.push({
      icon: GitCommit,
      label: t("app.version.commit_label"),
      value: <span className="font-mono">{info.commit ?? "—"}</span>,
    });
    rows.push({
      icon: Clock,
      label: t("app.version.build_label"),
      value: <span className="font-mono">{info.buildTime ?? "—"}</span>,
    });
    rows.push({
      icon: Cpu,
      label: t("app.version.node_label"),
      value: <span className="font-mono">{info.node}</span>,
    });
    rows.push({
      icon: Server,
      label: t("app.version.uptime_label"),
      value: <span className="font-mono">{formatUptime(info.uptimeSeconds)}</span>,
    });
  }

  return (
    <div className={`bg-white rounded-2xl border border-border shadow-sm p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t("app.version.title")}</h2>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {t("asoc.reload")}
        </Button>
      </div>

      {/* Versión principal, destacada */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold font-mono text-foreground">
          {info ? info.version : "—"}
        </span>
        <span className="text-sm text-muted-foreground">
          {t("app.version.version_label")}
        </span>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{t("app.version.error")}</p>}
      {!info && !error && (
        <p className="text-sm text-muted-foreground mb-2">{t("app.version.loading")}</p>
      )}

      {info && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <row.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="ml-auto text-sm text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
