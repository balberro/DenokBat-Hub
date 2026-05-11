import { useState, useEffect, useCallback, useRef } from "react";
import {
  Database, Play, Table2, ChevronRight, RefreshCw, AlertTriangle,
  Info, Copy, CheckCheck, ToggleLeft, ToggleRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/use-store";

const API = "/api";

type DBTable = { name: string; row_count: number | null };
type Column  = { name: string; type: string; nullable: string; default_val: string | null };
type Field   = { name: string };
type QueryResult = {
  rows: Record<string, unknown>[];
  fields: Field[];
  rowCount: number | null;
  command: string;
  elapsed: number;
  error?: string;
};

async function parseJsonSafe(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { error: raw };
  }
}

function authHeaders(token: string | null) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Sidebar: tables list ─────────────────────────────────────────────────────

function TableSidebar({
  token, selected, onSelect, refreshToken,
}: {
  token: string | null;
  selected: string | null;
  onSelect: (name: string) => void;
  refreshToken: number;
}) {
  const [tables, setTables] = useState<DBTable[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/db/tables`, { headers: authHeaders(token) });
      const d = await r.json();
      setTables(d.tables ?? []);
    } catch { setTables([]); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load, refreshToken]);

  const [columns, setColumns] = useState<Column[]>([]);
  const [colsFor, setColsFor] = useState<string | null>(null);

  const handleSelect = async (name: string) => {
    onSelect(name);
    if (colsFor === name) { setColumns([]); setColsFor(null); return; }
    try {
      const r = await fetch(`${API}/admin/db/table/${name}`, { headers: authHeaders(token) });
      const d = await r.json();
      setColumns(d.columns ?? []);
      setColsFor(name);
    } catch { setColumns([]); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between px-2 py-2 mb-1">
        <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
          Tablas ({tables.length})
        </p>
        <button onClick={load} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {tables.map(t => (
        <div key={t.name}>
          <button
            onClick={() => handleSelect(t.name)}
            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all ${
              selected === t.name
                ? "bg-primary/10 text-primary font-semibold"
                : "hover:bg-muted/50 text-foreground"
            }`}
          >
            <Table2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 font-mono truncate text-xs">{t.name}</span>
            {t.row_count != null && (
              <span className="text-xs text-muted-foreground shrink-0">{t.row_count}</span>
            )}
            <ChevronRight className={`w-3 h-3 shrink-0 text-muted-foreground transition-transform ${colsFor === t.name ? "rotate-90" : ""}`} />
          </button>
          {colsFor === t.name && columns.length > 0 && (
            <div className="ml-6 mt-0.5 mb-1 space-y-0.5">
              {columns.map(c => (
                <div key={c.name} className="flex items-baseline gap-2 px-2 py-0.5 rounded text-xs">
                  <span className="font-mono text-foreground">{c.name}</span>
                  <span className="text-muted-foreground text-[10px]">{c.type}</span>
                  {c.nullable === "NO" && (
                    <span className="text-red-400 text-[9px] font-bold">NN</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Results table ────────────────────────────────────────────────────────────

function ResultTable({ result }: { result: QueryResult }) {
  const [copied, setCopied] = useState(false);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result.rows, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (result.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-red-700 text-sm">Error SQL</p>
          <p className="text-red-600 text-sm font-mono mt-1">{result.error}</p>
        </div>
      </div>
    );
  }

  const isWrite = ["INSERT","UPDATE","DELETE"].includes(result.command ?? "");

  if (isWrite || result.rows.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-green-700 text-sm">{result.command}</p>
          <p className="text-green-600 text-sm">
            {isWrite
              ? `${result.rowCount ?? 0} fila(s) afectadas`
              : "Sin resultados"}
            {" — "}{result.elapsed}ms
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {result.rowCount ?? result.rows.length} fila(s) · {result.elapsed}ms
        </p>
        <button
          onClick={copyJson}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted/50 transition-all"
        >
          {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado" : "Copiar JSON"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {result.fields.map(f => (
                <th key={f.name} className="text-left px-3 py-2 font-mono font-bold text-muted-foreground whitespace-nowrap">
                  {f.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.rows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                {result.fields.map(f => {
                  const val = row[f.name];
                  const display = val === null
                    ? <span className="text-muted-foreground/50 italic">NULL</span>
                    : typeof val === "object"
                    ? <span className="font-mono text-blue-600">{JSON.stringify(val)}</span>
                    : String(val);
                  return (
                    <td key={f.name} className="px-3 py-2 font-mono max-w-xs truncate">
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Quick queries ────────────────────────────────────────────────────────────

const QUICK_QUERIES = [
  { label: "Socios (10)",        sql: "SELECT * FROM db_socios LIMIT 10" },
  { label: "Fiestas",            sql: "SELECT id, nombre, fecha, estado, publicado FROM db_fiestas ORDER BY fecha DESC" },
  { label: "Inscripciones",      sql: "SELECT * FROM db_inscripciones ORDER BY created_at DESC LIMIT 20" },
  { label: "Pagos pendientes",   sql: "SELECT * FROM db_pagos WHERE estado = 'pendiente' ORDER BY created_at DESC" },
  { label: "Usuarios",           sql: "SELECT id, username, role, created_at FROM db_users" },
  { label: "Tamaño tablas",      sql: "SELECT relname AS tabla, n_live_tup AS filas FROM pg_stat_user_tables ORDER BY n_live_tup DESC" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminDB() {
  const { token } = useStore();
  const [sql, setSql] = useState("SELECT * FROM db_fiestas ORDER BY fecha DESC;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [writeMode, setWriteMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tablesRefreshToken, setTablesRefreshToken] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runQuery = useCallback(async (query?: string) => {
    const toRun = query ?? sql;
    if (!toRun.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/admin/db/query`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ sql: toRun, mode: writeMode ? "write" : "read" }),
      });
      const d = await parseJsonSafe(r);
      if (!r.ok) {
        // Mostramos primero el detalle SQL real devuelto por backend.
        setResult({
          rows: [],
          fields: [],
          rowCount: 0,
          command: "",
          elapsed: 0,
          error: d.detalle ?? d.error ?? `Error HTTP ${r.status}`,
        });
      } else {
        setResult(d);
      }
    } catch (e) {
      setResult({ rows: [], fields: [], rowCount: 0, command: "", elapsed: 0, error: String(e) });
    }
    setRunning(false);
  }, [sql, token, writeMode]);

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
  };

  const handleTableSelect = (name: string) => {
    setSelectedTable(name);
    const q = `SELECT * FROM ${name} LIMIT 50;`;
    setSql(q);
    runQuery(q);
    textareaRef.current?.focus();
  };

  const bootstrapNosotrosTables = async () => {
    setRunning(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/admin/db/bootstrap-nosotros`, {
        method: "POST",
        headers: authHeaders(token),
      });
      const d = await parseJsonSafe(r);
      if (!r.ok) {
        setResult({
          rows: [],
          fields: [],
          rowCount: 0,
          command: "",
          elapsed: 0,
          error: d.detalle ?? d.error ?? `Error HTTP ${r.status} creando tablas`,
        });
      } else {
        setResult({
          rows: [{ message: d.message ?? "Tablas de Nosotros preparadas" }],
          fields: [{ name: "message" }],
          rowCount: 1,
          command: "BOOTSTRAP",
          elapsed: 0,
        });
        setTablesRefreshToken((v) => v + 1);
      }
    } catch (e) {
      setResult({ rows: [], fields: [], rowCount: 0, command: "", elapsed: 0, error: String(e) });
    }
    setRunning(false);
  };

  return (
    <div className="max-w-full mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Database className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consola de base de datos</h1>
          <p className="text-sm text-muted-foreground">Acceso directo a la BD local de la aplicación</p>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Sidebar */}
        <div className="w-56 shrink-0 bg-white rounded-2xl border border-border shadow-sm p-3 overflow-y-auto max-h-[75vh]">
          <TableSidebar token={token} selected={selectedTable} onSelect={handleTableSelect} refreshToken={tablesRefreshToken} />
        </div>

        {/* Main area */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Quick queries */}
          <div className="flex flex-wrap gap-2">
            {QUICK_QUERIES.map(q => (
              <button
                key={q.label}
                onClick={() => { setSql(q.sql); runQuery(q.sql); }}
                className="text-xs px-3 py-1.5 rounded-xl bg-white border border-border hover:border-primary/30 hover:bg-primary/5 text-foreground font-medium transition-all"
              >
                {q.label}
              </button>
            ))}
            <button
              onClick={bootstrapNosotrosTables}
              className="text-xs px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-semibold transition-all"
            >
              Crear tablas Nosotros
            </button>
          </div>

          {/* Editor */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-muted-foreground">SQL · Ctrl+Enter para ejecutar</span>
              <div className="flex items-center gap-3">
                {/* Write mode toggle */}
                <button
                  onClick={() => setWriteMode(w => !w)}
                  className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    writeMode
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title="Activar modo escritura (INSERT / UPDATE / DELETE)"
                >
                  {writeMode
                    ? <ToggleRight className="w-4 h-4" />
                    : <ToggleLeft className="w-4 h-4" />}
                  {writeMode ? "Escritura ON" : "Sólo lectura"}
                </button>
                <Button
                  size="sm"
                  onClick={() => runQuery()}
                  disabled={running}
                  className="gap-2"
                >
                  {running
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Play className="w-3.5 h-3.5" />}
                  Ejecutar
                </Button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={sql}
              onChange={e => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={8}
              className="w-full p-4 font-mono text-sm bg-[#1e1e2e] text-[#cdd6f4] focus:outline-none resize-y leading-relaxed"
              placeholder="SELECT * FROM db_fiestas LIMIT 10;"
              spellCheck={false}
            />

            {writeMode && (
              <div className="bg-red-50 border-t border-red-200 px-4 py-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <p className="text-xs text-red-600 font-medium">
                  Modo escritura activado — INSERT / UPDATE / DELETE se ejecutarán directamente. DROP y ALTER siguen bloqueados.
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          {result && <ResultTable result={result} />}
        </div>
      </div>
    </div>
  );
}
