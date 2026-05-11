import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Plus, Search, Edit, Trash2, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/use-store";

const API = "/api";

type SocioRow = {
  id: number;
  odooId?: number | null;
  numeroSocio?: string | null;
  nombre: string;
  apellidos?: string | null;
  dni?: string | null;
  genero?: string | null;
  fechaNacimiento?: string | null;
  fechaFallecimiento?: string | null;
  tipoSocio?: string | null;
  tipologia?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  fechaAlta?: string | null;
  estado?: string | null;
  avatarUrl?: string | null;
  poblacion?: string | null;
  provincia?: string | null;
};

type CargoRow = {
  id: number;
  codigo: string;
  nombre: string;
  nombreEu?: string | null;
  ambito: string;
  activo: number;
};

type HistoricoCargoRow = {
  id: number;
  socioId: number;
  cargoId: number;
  fechaInicio: string;
  fechaFin?: string | null;
  descripcion?: string | null;
  cargoCodigo?: string | null;
  cargoNombre?: string | null;
  cargoNombreEu?: string | null;
  cargoAmbito?: string | null;
  nombre?: string | null;
  apellidos?: string | null;
};

type HistoricoQueryFilters = {
  role?: "contable" | "directivo" | "delegado";
  socioId?: string;
  cargoId?: string;
  from?: string;
  to?: string;
  onlyCurrent?: boolean;
};

type MembershipInvoiceDraft = {
  pagoId?: number;
  concepto: string;
  importe: string;
  fechaFactura: string;
  fechaVencimiento: string;
  estado: string;
  metodo: string;
  referencia: string;
  numeroCuenta: string;
  crearEnOdoo: boolean;
};

type SocioForm = {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  poblacion: string;
  provincia: string;
  estado: string;
  grupoId: string;
  dni: string;
  genero: string;
  fechaNacimiento: string;
  fechaFallecimiento: string;
  tipologia: string;
  numeroSocio: string;
  fechaAlta: string;
  avatarUrl: string;
  membershipInvoice: MembershipInvoiceDraft;
};

type FilterOp = "contains" | "equals" | "startsWith" | "endsWith" | "empty" | "notEmpty";
type ColumnFilter = { op: FilterOp; value: string };
type ColumnFilters = Record<string, ColumnFilter>;

const EMPTY_FORM: SocioForm = {
  nombre: "",
  apellidos: "",
  email: "",
  telefono: "",
  direccion: "",
  poblacion: "",
  provincia: "",
  estado: "solicitante",
  grupoId: "",
  dni: "",
  genero: "",
  fechaNacimiento: "",
  fechaFallecimiento: "",
  tipologia: "numeraria",
  numeroSocio: "",
  fechaAlta: "",
  avatarUrl: "",
  membershipInvoice: {
    concepto: "Cuota membresía",
    importe: "",
    fechaFactura: "",
    fechaVencimiento: "",
    estado: "pendiente",
    metodo: "transferencia",
    referencia: "",
    numeroCuenta: "",
    crearEnOdoo: true,
  },
};

export default function GestionSocios() {
  const { t, lang } = useTranslation();
  const token = useStore((s) => s.token);
  const [search, setSearch] = useState("");
  const defaultFilter = (): ColumnFilter => ({ op: "contains", value: "" });
  const buildDefaultColumnFilters = (): ColumnFilters => ({
    numeroSocio: defaultFilter(),
    nombre: defaultFilter(),
    apellidos: defaultFilter(),
    dni: defaultFilter(),
    genero: defaultFilter(),
    fechaNacimiento: defaultFilter(),
    fechaFallecimiento: defaultFilter(),
    poblacion: defaultFilter(),
    provincia: defaultFilter(),
    telefono: defaultFilter(),
    fechaAlta: defaultFilter(),
    estado: defaultFilter(),
    tipologia: defaultFilter(),
  });
  const [columnSearch, setColumnSearch] = useState<ColumnFilters>(buildDefaultColumnFilters());
  const [items, setItems] = useState<SocioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showSecondaryColumns, setShowSecondaryColumns] = useState(true);
  const [selectedSocioId, setSelectedSocioId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SocioForm>(EMPTY_FORM);
  const [notice, setNotice] = useState("");
  const [subsection, setSubsection] = useState<"socios" | "contable" | "historico">("socios");
  const [cargos, setCargos] = useState<CargoRow[]>([]);
  const [historico, setHistorico] = useState<HistoricoCargoRow[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoForm, setHistoricoForm] = useState({
    socioId: "",
    cargoId: "",
    fechaInicio: "",
    fechaFin: "",
    descripcion: "",
  });
  const [contableSearch, setContableSearch] = useState("");
  const [historicoSearch, setHistoricoSearch] = useState("");
  const [contableFilters, setContableFilters] = useState({
    socioId: "",
    cargoId: "",
    from: "",
    to: "",
    onlyCurrent: true,
  });
  const [newCargoForm, setNewCargoForm] = useState({
    codigo: "",
    nombre: "",
    nombreEu: "",
    ambito: "directivo",
  });

  const isHonorificoByBirthdate = (fechaNacimiento?: string | null): boolean => {
    if (!fechaNacimiento) return false;
    const birth = new Date(`${fechaNacimiento}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return false;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
    return age >= 85;
  };

  const fileToDataUrl = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });
  };

  const loadSocios = async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const pageSize = 100;
      let page = 1;
      const allItems: SocioRow[] = [];

      while (true) {
        const r = await fetch(`${API}/socios?limit=${pageSize}&page=${page}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) {
          const errBody = await r.json().catch(() => null);
          const backendMessage = String(errBody?.error || errBody?.detalle || "").trim();
          throw new Error(backendMessage ? `HTTP ${r.status}: ${backendMessage}` : `HTTP ${r.status}`);
        }
        const d = await r.json();
        const chunk = Array.isArray(d?.items) ? d.items as SocioRow[] : [];
        allItems.push(...chunk);
        if (chunk.length < pageSize) break;
        page += 1;
      }

      // Defensa extra ante duplicados de paginación: nos quedamos con un registro por id.
      const uniqueById = new Map<number, SocioRow>();
      for (const row of allItems) uniqueById.set(row.id, row);
      setItems(Array.from(uniqueById.values()));
    } catch (err) {
      setItems([]);
      setLoadError(err instanceof Error ? err.message : "No se pudieron cargar socios desde el servidor");
    } finally {
      setLoading(false);
    }
  };

  const loadCargos = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API}/admin/nosotros`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("No se pudieron cargar cargos");
      const d = await r.json();
      setCargos(Array.isArray(d?.cargos) ? d.cargos : []);
    } catch {
      setCargos([]);
    }
  };

  const loadHistorico = async (filters?: HistoricoQueryFilters) => {
    if (!token) return;
    setHistoricoLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.role) params.set("role", filters.role);
      if (filters?.socioId) params.set("socioId", filters.socioId);
      if (filters?.cargoId) params.set("cargoId", filters.cargoId);
      if (filters?.from) params.set("from", filters.from);
      if (filters?.to) params.set("to", filters.to);
      if (filters?.onlyCurrent) params.set("onlyCurrent", "true");
      const r = await fetch(`${API}/admin/nosotros/historico?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("No se pudo cargar histórico");
      const d = await r.json();
      setHistorico(Array.isArray(d?.items) ? d.items : []);
    } catch (err) {
      setHistorico([]);
      setNotice(err instanceof Error ? err.message : "Error cargando histórico");
    } finally {
      setHistoricoLoading(false);
    }
  };

  useEffect(() => {
    void loadSocios();
    void loadCargos();
    void loadHistorico({});
  }, [token]);

  useEffect(() => {
    // Evita estados de filtro arrastrados en recargas/HMR.
    setSearch("");
    setColumnSearch((prev) => ({ ...buildDefaultColumnFilters(), ...prev }));
  }, []);

  const applyFilters = () => {
    // Fuerza refresco visual y deja constancia de ejecución.
    setColumnSearch((prev) => ({ ...prev }));
    setNotice(`Búsqueda aplicada: ${new Date().toLocaleTimeString("es-ES")}`);
  };

  const clearFilters = () => {
    setSearch("");
    setColumnSearch(buildDefaultColumnFilters());
    setNotice("Filtros limpiados");
  };

  const normalizeEstadoValue = (v: string | null | undefined): "activo" | "solicitante" | "baja" | "" => {
    const raw = String(v ?? "").toLowerCase().trim();
    if (!raw) return "";
    if (raw === "activo" || raw === "active") return "activo";
    if (raw === "solicitante" || raw === "pending" || raw === "pendiente") return "solicitante";
    if (raw === "baja" || raw === "inactivo" || raw === "inactive") return "baja";
    return "baja";
  };

  const normalizeGeneroValue = (v: string | null | undefined): "H" | "M" | "F" | "" => {
    const raw = String(v ?? "").toLowerCase().trim();
    if (!raw) return "";
    // Sin heurística: mantenemos codificación de origen.
    // H = hombre, M/F = códigos tal cual BD.
    if (raw === "h" || raw === "hombre" || raw === "male" || raw === "masculino") return "H";
    if (raw === "m" || raw === "mujer") return "M";
    if (raw === "f" || raw === "female" || raw === "femenino") return "F";

    return "";
  };

  const normalizeGeneroRawToken = (v: string | null | undefined): string => {
    const raw = String(v ?? "").toLowerCase().trim();
    if (!raw) return "";
    if (raw === "h" || raw === "hombre" || raw === "male" || raw === "masculino") return "H";
    if (raw === "m" || raw === "mujer") return "M";
    if (raw === "f" || raw === "female" || raw === "femenino") return "F";
    return raw.toUpperCase();
  };

  const applyColumnFilter = (raw: string | null | undefined, filter: ColumnFilter): boolean => {
    const normalized = String(raw ?? "").toLowerCase().trim();
    const value = filter.value.toLowerCase().trim();
    switch (filter.op) {
      case "equals":
        return normalized === value;
      case "startsWith":
        return normalized.startsWith(value);
      case "endsWith":
        return normalized.endsWith(value);
      case "empty":
        return normalized.length === 0;
      case "notEmpty":
        return normalized.length > 0;
      case "contains":
      default:
        return normalized.includes(value);
    }
  };

  const hasActiveColumnFilter = (filter?: ColumnFilter): boolean => {
    if (!filter) return false;
    if (filter.op === "empty" || filter.op === "notEmpty") return true;
    return filter.value.trim().length > 0;
  };

  const filtered = useMemo(() => {
    const filterSocios = (
    source: SocioRow[],
    globalSearch: string,
    currentColumnSearch: Record<string, ColumnFilter>,
  ): SocioRow[] => source.filter((s) => {
    const fullName = `${s.nombre ?? ""} ${s.apellidos ?? ""}`.toLowerCase();
    const q = globalSearch.toLowerCase();
    const matchesGlobal = (
      fullName.includes(q)
      || String(s.numeroSocio ?? "").toLowerCase().includes(q)
      || String(s.dni ?? "").toLowerCase().includes(q)
      || String(s.email ?? "").toLowerCase().includes(q)
    );
    if (!matchesGlobal) return false;

    const checks: Array<[string | null | undefined, ColumnFilter]> = [
      [s.numeroSocio, currentColumnSearch.numeroSocio],
      [s.nombre, currentColumnSearch.nombre],
      [s.apellidos, currentColumnSearch.apellidos],
      [s.dni, currentColumnSearch.dni],
      [normalizeGeneroRawToken(s.genero), { ...currentColumnSearch.genero, value: normalizeGeneroRawToken(currentColumnSearch.genero.value) }],
      [s.fechaNacimiento, currentColumnSearch.fechaNacimiento],
      [s.fechaFallecimiento, currentColumnSearch.fechaFallecimiento],
      [s.poblacion, currentColumnSearch.poblacion],
      [s.provincia, currentColumnSearch.provincia],
      [s.telefono, currentColumnSearch.telefono],
      [s.fechaAlta, currentColumnSearch.fechaAlta],
      [normalizeEstadoValue(s.estado), { ...currentColumnSearch.estado, value: normalizeEstadoValue(currentColumnSearch.estado.value) }],
      [s.tipologia, currentColumnSearch.tipologia],
    ];
    return checks.every(([raw, filter]) => (!hasActiveColumnFilter(filter) ? true : applyColumnFilter(raw, filter)));
  });
    return filterSocios(items, search, columnSearch);
  }, [items, search, columnSearch]);

  const genderRawStats = useMemo(() => {
    const stats = { h: 0, m: 0, f: 0, other: 0 };
    for (const s of items) {
      const raw = String(s.genero ?? "").toLowerCase().trim();
      if (raw === "h") stats.h += 1;
      else if (raw === "m") stats.m += 1;
      else if (raw === "f") stats.f += 1;
      else stats.other += 1;
    }
    return stats;
  }, [items]);

  const genderRawOptions = useMemo(() => {
    const opts = new Set<string>();
    for (const s of items) {
      const token = normalizeGeneroRawToken(s.genero);
      if (token) opts.add(token);
    }
    return Array.from(opts).sort();
  }, [items]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setNotice("");
    setShowForm(true);
  };

  const openEdit = async (s: SocioRow) => {
    const toDateInput = (v: unknown): string => {
      if (!v) return "";
      const raw = String(v);
      return raw.length >= 10 ? raw.slice(0, 10) : "";
    };
    const normalizeEstadoForm = (v: unknown): string => {
      const raw = String(v ?? "").toLowerCase().trim();
      if (raw === "activo" || raw === "active") return "activo";
      if (raw === "baja" || raw === "inactivo" || raw === "inactive") return "baja";
      return "solicitante";
    };
    const normalizeTipologiaForm = (v: unknown): string => {
      const raw = String(v ?? "").toLowerCase().trim();
      if (["fundadora", "directiva", "delegada", "honorifica", "numeraria", "colaboradora"].includes(raw)) return raw;
      return "numeraria";
    };
    const normalizeGeneroForm = (v: unknown): string => {
      return normalizeGeneroValue(String(v ?? ""));
    };

    let source = s;
    if (token) {
      try {
        const r = await fetch(`${API}/socios/${s.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const d = await r.json();
          source = { ...s, ...(d ?? {}) };
        } else {
          const d = await r.json().catch(() => null);
          const msg = String(d?.error || d?.detalle || `HTTP ${r.status}`);
          setNotice(`No se pudo cargar detalle para editar: ${msg}`);
        }
      } catch {
        setNotice("No se pudo cargar detalle para editar, usando datos visibles");
      }
    }
    setEditingId(s.id);
    setForm({
      nombre: source.nombre ?? "",
      apellidos: source.apellidos ?? "",
      email: source.email ?? "",
      telefono: source.telefono ?? "",
      direccion: source.direccion ?? "",
      poblacion: source.poblacion ?? "",
      provincia: source.provincia ?? "",
      estado: normalizeEstadoForm(source.estado),
      grupoId: "",
      dni: source.dni ?? "",
      genero: normalizeGeneroValue(source.genero),
      fechaNacimiento: toDateInput(source.fechaNacimiento),
      fechaFallecimiento: toDateInput(source.fechaFallecimiento),
      tipologia: normalizeTipologiaForm(source.tipologia),
      numeroSocio: String(source.numeroSocio ?? ""),
      fechaAlta: toDateInput(source.fechaAlta),
      avatarUrl: source.avatarUrl ?? "",
      membershipInvoice: {
        ...EMPTY_FORM.membershipInvoice,
      },
    });
    setNotice("");
    setShowForm(true);
  };

  const selectedSocio = selectedSocioId == null
    ? null
    : items.find((s) => s.id === selectedSocioId) ?? null;

  const submitForm = async () => {
    if (!token) return;
    if (!form.nombre.trim()) {
      setNotice(t("socios.form.notice.name_required"));
      return;
    }
    setSaving(true);
    setNotice("Guardando cambios...");
    try {
      const asTrimmed = (v: unknown): string => String(v ?? "").trim();
      if (
        form.membershipInvoice.importe
        && form.membershipInvoice.metodo === "domiciliacion"
        && !asTrimmed(form.membershipInvoice.numeroCuenta)
      ) {
        setNotice("Para domiciliación, debes indicar el número de cuenta");
        setSaving(false);
        return;
      }

      const referenciaFactura = asTrimmed(form.membershipInvoice.referencia);
      const numeroCuenta = asTrimmed(form.membershipInvoice.numeroCuenta);
      const referenciaConCuenta = form.membershipInvoice.metodo === "domiciliacion" && numeroCuenta
        ? [referenciaFactura, `CTA:${numeroCuenta}`].filter(Boolean).join(" | ")
        : referenciaFactura;

      const payload = {
        nombre: asTrimmed(form.nombre),
        apellidos: asTrimmed(form.apellidos),
        email: asTrimmed(form.email),
        telefono: asTrimmed(form.telefono),
        direccion: asTrimmed(form.direccion),
        poblacion: asTrimmed(form.poblacion),
        provincia: asTrimmed(form.provincia),
        estado: form.estado,
        grupoId: asTrimmed(form.grupoId) ? Number(form.grupoId) : null,
        dni: asTrimmed(form.dni),
        genero: form.genero || null,
        fechaNacimiento: form.fechaNacimiento || null,
        fechaFallecimiento: form.fechaFallecimiento || null,
        tipologia: form.tipologia,
        numeroSocio: asTrimmed(form.numeroSocio),
        fechaAlta: form.fechaAlta || null,
        avatarUrl: form.avatarUrl || null,
        membershipInvoice: form.membershipInvoice.importe
          ? {
              concepto: asTrimmed(form.membershipInvoice.concepto),
              importe: form.membershipInvoice.importe,
              fechaFactura: form.membershipInvoice.fechaFactura || null,
              fechaVencimiento: form.membershipInvoice.fechaVencimiento || null,
              estado: form.membershipInvoice.estado,
              metodo: form.membershipInvoice.metodo,
              referencia: referenciaConCuenta,
              crearEnOdoo: form.membershipInvoice.crearEnOdoo,
            }
          : null,
      };
      const url = editingId ? `${API}/socios/${editingId}` : `${API}/socios`;
      const method = editingId ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const raw = await r.text().catch(() => "");
        let msg = t("socios.form.notice.save_failed");
        let detail = "";
        try {
          const d = raw ? JSON.parse(raw) : null;
          msg = String(d?.error || msg);
          detail = String(d?.detalle || "").trim();
        } catch {
          detail = raw.trim();
        }
        throw new Error(detail ? `${msg} (${detail})` : `${msg} (HTTP ${r.status})`);
      }
      await loadSocios();
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setNotice(editingId ? t("socios.form.notice.updated") : t("socios.form.notice.created"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("socios.form.notice.error_saving"));
    } finally {
      setSaving(false);
    }
  };

  const isHonorificoForm = form.tipologia === "honorifica" || isHonorificoByBirthdate(form.fechaNacimiento);

  const contableCargoOptions = useMemo(
    () =>
      cargos.filter((cargo) => {
        const codigo = String(cargo.codigo ?? "").toLowerCase();
        const nombre = String(cargo.nombre ?? "").toLowerCase();
        return codigo.includes("tesorer") || codigo.includes("contable") || nombre.includes("tesorer") || nombre.includes("contable");
      }),
    [cargos],
  );

  const saveHistoricoCargo = async () => {
    if (!token || !historicoForm.socioId || !historicoForm.cargoId || !historicoForm.fechaInicio) {
      setNotice("socio, cargo y fechaInicio son obligatorios.");
      return;
    }
    if (historicoForm.cargoId === "nuevo") {
      setNotice("Primero crea el nuevo cargo y luego selecciónalo.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const r = await fetch(`${API}/admin/nosotros/historico`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          socioId: Number(historicoForm.socioId),
          cargoId: Number(historicoForm.cargoId),
          fechaInicio: historicoForm.fechaInicio,
          fechaFin: historicoForm.fechaFin || null,
          descripcion: historicoForm.descripcion || null,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error(String(d?.error ?? "No se pudo guardar histórico"));
      }
      setHistoricoForm({ socioId: "", cargoId: "", fechaInicio: "", fechaFin: "", descripcion: "" });
      await loadHistorico({});
      setNotice("Histórico de cargo guardado.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error guardando histórico de cargo");
    } finally {
      setSaving(false);
    }
  };

  const contableRows = useMemo(
    () =>
      historico.filter((row) => {
        const q = contableSearch.trim().toLowerCase();
        if (!q) return true;
        const who = `${row.nombre ?? ""} ${row.apellidos ?? ""}`.toLowerCase();
        const cargo = `${row.cargoNombre ?? ""} ${row.cargoCodigo ?? ""}`.toLowerCase();
        return who.includes(q) || cargo.includes(q);
      }),
    [historico, contableSearch],
  );

  const historicoRows = useMemo(
    () =>
      historico.filter((row) => {
        const q = historicoSearch.trim().toLowerCase();
        if (!q) return true;
        const who = `${row.nombre ?? ""} ${row.apellidos ?? ""}`.toLowerCase();
        return who.includes(q);
      }),
    [historico, historicoSearch],
  );

  const getCargoLabel = (row: Pick<HistoricoCargoRow, "cargoNombre" | "cargoNombreEu" | "cargoCodigo">) =>
    lang === "eu"
      ? row.cargoNombreEu || row.cargoNombre || row.cargoCodigo || "-"
      : row.cargoNombre || row.cargoNombreEu || row.cargoCodigo || "-";

  const exportContableCsv = () => {
    const header = [
      "id",
      "socioId",
      "socio",
      "cargoId",
      "cargo",
      "codigoCargo",
      "fechaInicio",
      "fechaFin",
      "descripcion",
    ];
    const escapeCsv = (value: unknown) => {
      const s = String(value ?? "");
      if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
        return `"${s.replace(/"/g, "\"\"")}"`;
      }
      return s;
    };
    const rows = contableRows.map((row) => [
      row.id,
      row.socioId,
      `${row.nombre ?? ""} ${row.apellidos ?? ""}`.trim(),
      row.cargoId,
      row.cargoNombre ?? "",
      row.cargoCodigo ?? "",
      row.fechaInicio ?? "",
      row.fechaFin ?? "",
      row.descripcion ?? "",
    ]);
    const csv = [header, ...rows].map((line) => line.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `listado-contable-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveCargoFromAsignacion = async () => {
    if (!token) return;
    if (!newCargoForm.codigo.trim() || !newCargoForm.nombre.trim()) {
      setNotice("Para crear cargo, código y nombre son obligatorios.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const selectedCargoId = Number(historicoForm.cargoId);
      const isUpdate = Number.isFinite(selectedCargoId) && selectedCargoId > 0;
      const r = await fetch(
        isUpdate ? `${API}/admin/nosotros/cargos/${selectedCargoId}` : `${API}/admin/nosotros/cargos`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newCargoForm),
        },
      );
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error(String(d?.error ?? "No se pudo guardar el cargo"));
      }
      const saved = await r.json().catch(() => null);
      await loadCargos();
      if (saved?.id) {
        setHistoricoForm((p) => ({ ...p, cargoId: String(saved.id) }));
      }
      if (!isUpdate) {
        setNewCargoForm({ codigo: "", nombre: "", nombreEu: "", ambito: "directivo" });
      }
      setNotice(isUpdate ? "Cargo modificado correctamente." : "Cargo creado correctamente.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error guardando cargo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t("menu.gestion_socios")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-4 h-4" />{t("common.export")}</Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!selectedSocio}
            onClick={() => {
              if (selectedSocio) openEdit(selectedSocio);
            }}
          >
            <Edit className="w-4 h-4" />
            Editar seleccionado
          </Button>
          <Button className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" />{t("socios.new")}</Button>
        </div>
      </div>
      <div className="mb-6 flex gap-2">
        <Button variant={subsection === "socios" ? "default" : "outline"} size="sm" onClick={() => setSubsection("socios")}>
          {t("socios.tabs.list")}
        </Button>
        <Button variant={subsection === "contable" ? "default" : "outline"} size="sm" onClick={() => { setSubsection("contable"); void loadHistorico({ ...contableFilters }); }}>
          {t("socios.tabs.query_positions")}
        </Button>
        <Button variant={subsection === "historico" ? "default" : "outline"} size="sm" onClick={() => { setSubsection("historico"); void loadHistorico({}); }}>
          {t("socios.tabs.assign_positions")}
        </Button>
      </div>

      {subsection === "contable" && (
        <div className="mb-8 rounded-2xl border border-border bg-white p-4 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("socios.positions.query_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("socios.positions.query_subtitle")}</p>
          <div className="grid md:grid-cols-5 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("socios.positions.field.cargo")}</label>
              <select
                value={contableFilters.cargoId}
                onChange={(e) => setContableFilters((p) => ({ ...p, cargoId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              >
                <option value="">{t("socios.positions.field.cargo")}</option>
                {contableCargoOptions.map((c) => (
                    <option key={c.id} value={c.id}>{`${lang === "eu" ? (c.nombreEu || c.nombre) : c.nombre} (${c.codigo})`}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("socios.positions.field.member")}</label>
              <select
                value={contableFilters.socioId}
                onChange={(e) => setContableFilters((p) => ({ ...p, socioId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              >
                <option value="">{t("socios.positions.field.member")}</option>
                {items.map((s) => (
                  <option key={s.id} value={s.id}>{`${s.nombre} ${s.apellidos ?? ""}`.trim()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("socios.positions.field.from")}</label>
              <input
                type="date"
                value={contableFilters.from}
                onChange={(e) => setContableFilters((p) => ({ ...p, from: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("socios.positions.field.to")}</label>
              <input
                type="date"
                value={contableFilters.to}
                onChange={(e) => setContableFilters((p) => ({ ...p, to: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm px-2 py-2 rounded-lg border border-border bg-background">
              <input
                type="checkbox"
                checked={contableFilters.onlyCurrent}
                onChange={(e) => setContableFilters((p) => ({ ...p, onlyCurrent: e.target.checked }))}
              />
              {t("socios.positions.field.only_current")}
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void loadHistorico({ ...contableFilters })}
              disabled={historicoLoading}
            >
              {historicoLoading ? t("common.loading") : t("socios.positions.button.apply_filters")}
            </Button>
            <Button variant="outline" onClick={exportContableCsv} disabled={contableRows.length === 0}>
              {t("socios.positions.button.download_csv")}
            </Button>
          </div>
          <input
            value={contableSearch}
            onChange={(e) => setContableSearch(e.target.value)}
            placeholder={t("socios.positions.search.query_placeholder")}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background"
          />
          <div className="space-y-2">
            {historicoLoading && <p className="text-sm text-muted-foreground">{t("socios.positions.loading_query")}</p>}
            {!historicoLoading && contableRows.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="grid md:grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <p>{t("socios.positions.table.cargo")}</p>
                  <p>{t("socios.positions.table.member")}</p>
                  <p>{t("socios.positions.table.from")}</p>
                  <p>{t("socios.positions.table.to")}</p>
                </div>
              </div>
            )}
            {!historicoLoading && contableRows
              .map((row) => (
                <div key={row.id} className="rounded-lg border border-border p-3">
                  <div className="grid md:grid-cols-4 gap-2 text-sm">
                    <p className="text-foreground">{getCargoLabel(row)}</p>
                    <p className="text-foreground">{`${row.nombre ?? ""} ${row.apellidos ?? ""}`.trim() || "-"}</p>
                    <p className="text-foreground">{row.fechaInicio || "-"}</p>
                    <p className="text-foreground">{row.fechaFin || "-"}</p>
                  </div>
                </div>
              ))}
            {!historicoLoading && contableRows.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("socios.positions.no_results")}</p>
            )}
          </div>
        </div>
      )}

      {subsection === "historico" && (
        <div className="mb-8 rounded-2xl border border-border bg-white p-4 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("socios.positions.assign_title")}</h2>
          <div className="grid md:grid-cols-5 gap-2">
            <select
              value={historicoForm.cargoId}
              onChange={(e) => {
                const value = e.target.value;
                setHistoricoForm((p) => ({ ...p, cargoId: value }));
                if (value === "nuevo" || value === "") {
                  setNewCargoForm({ codigo: "", nombre: "", nombreEu: "", ambito: "directivo" });
                  return;
                }
                const selected = cargos.find((c) => c.id === Number(value));
                if (selected) {
                  setNewCargoForm({
                    codigo: String(selected.codigo ?? ""),
                    nombre: String(selected.nombre ?? ""),
                    nombreEu: String(selected.nombreEu ?? ""),
                    ambito: String(selected.ambito ?? "directivo"),
                  });
                }
              }}
              className="px-3 py-2 rounded-lg border border-border bg-background"
            >
              <option value="">{t("socios.positions.field.cargo")}</option>
              <option value="nuevo">{t("socios.positions.new_cargo.option")}</option>
              {cargos.map((c) => (
                <option key={c.id} value={c.id}>{`${lang === "eu" ? (c.nombreEu || c.nombre) : c.nombre} (${c.ambito})`}</option>
              ))}
            </select>
            <select value={historicoForm.socioId} onChange={(e) => setHistoricoForm((p) => ({ ...p, socioId: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background">
              <option value="">{t("socios.positions.field.member")}</option>
              {items.map((s) => (
                <option key={s.id} value={s.id}>{`${s.nombre} ${s.apellidos ?? ""}`.trim()}</option>
              ))}
            </select>
            <input type="date" value={historicoForm.fechaInicio} onChange={(e) => setHistoricoForm((p) => ({ ...p, fechaInicio: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <input type="date" value={historicoForm.fechaFin} onChange={(e) => setHistoricoForm((p) => ({ ...p, fechaFin: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <Button onClick={saveHistoricoCargo} disabled={saving}>{saving ? t("common.saving") : t("socios.positions.button.save_assignment")}</Button>
          </div>
          {(historicoForm.cargoId === "nuevo" || Number.isFinite(Number(historicoForm.cargoId))) && (
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="text-sm font-semibold text-foreground">Modificar cargo / crear nuevo</p>
              <div className="grid md:grid-cols-5 gap-2">
                <input
                  value={newCargoForm.codigo}
                  onChange={(e) => setNewCargoForm((p) => ({ ...p, codigo: e.target.value }))}
                  placeholder={t("socios.positions.new_cargo.code")}
                  className="px-3 py-2 rounded-lg border border-border bg-background"
                />
                <input
                  value={newCargoForm.nombre}
                  onChange={(e) => setNewCargoForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder={t("socios.positions.new_cargo.name")}
                  className="px-3 py-2 rounded-lg border border-border bg-background"
                />
                <input
                  value={newCargoForm.nombreEu}
                  onChange={(e) => setNewCargoForm((p) => ({ ...p, nombreEu: e.target.value }))}
                  placeholder={t("socios.positions.new_cargo.name_eu_optional")}
                  className="px-3 py-2 rounded-lg border border-border bg-background"
                />
                <select
                  value={newCargoForm.ambito}
                  onChange={(e) => setNewCargoForm((p) => ({ ...p, ambito: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-border bg-background"
                >
                  <option value="directivo">directivo</option>
                  <option value="delegado">delegado</option>
                  <option value="fundador">fundador</option>
                </select>
                <Button onClick={saveCargoFromAsignacion} disabled={saving}>
                  {saving ? t("common.saving") : "Modificar / Crear"}
                </Button>
              </div>
            </div>
          )}
          <input
            value={historicoSearch}
            onChange={(e) => setHistoricoSearch(e.target.value)}
            placeholder={t("socios.positions.search.assign_placeholder")}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background"
          />
          <div className="space-y-2">
            {historicoLoading && <p className="text-sm text-muted-foreground">{t("socios.positions.loading_assignments")}</p>}
            {!historicoLoading && historicoRows.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="grid md:grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <p>{t("socios.positions.table.cargo")}</p>
                  <p>{t("socios.positions.table.member")}</p>
                  <p>{t("socios.positions.table.from")}</p>
                  <p>{t("socios.positions.table.to")}</p>
                </div>
              </div>
            )}
            {!historicoLoading && historicoRows.map((row) => (
              <div key={row.id} className="rounded-lg border border-border p-3">
                <div className="grid md:grid-cols-4 gap-2 text-sm">
                  <p className="text-foreground">{getCargoLabel(row)}</p>
                  <p className="text-foreground">{`${row.nombre ?? ""} ${row.apellidos ?? ""}`.trim() || "-"}</p>
                  <p className="text-foreground">{row.fechaInicio || "-"}</p>
                  <p className="text-foreground">{row.fechaFin || "-"}</p>
                </div>
              </div>
            ))}
            {!historicoLoading && historicoRows.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("socios.positions.no_results")}</p>
            )}
          </div>
        </div>
      )}

      {subsection === "socios" && (
      <>
      {showForm && (
        <div className="mb-6 rounded-2xl border border-border bg-white p-4 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {editingId ? t("socios.form.title.edit") : t("socios.form.title.create")}
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder={`${t("common.name")} *`} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <input value={form.apellidos} onChange={(e) => setForm((p) => ({ ...p, apellidos: e.target.value }))} placeholder={t("common.surname")} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <input value={form.dni} onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value }))} placeholder={t("socios.form.dni_nif")} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <select value={form.genero} onChange={(e) => setForm((p) => ({ ...p, genero: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background">
              <option value="">{t("socios.form.gender.empty")}</option>
              <option value="H">{t("socios.form.gender.male")}</option>
              <option value="M">M</option>
              <option value="F">{t("socios.form.gender.female")}</option>
            </select>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder={t("common.email")} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <input value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} placeholder={t("common.phone")} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <input value={form.numeroSocio} onChange={(e) => setForm((p) => ({ ...p, numeroSocio: e.target.value }))} placeholder={t("socios.member_number")} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <input type="date" value={form.fechaNacimiento} onChange={(e) => setForm((p) => ({ ...p, fechaNacimiento: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <input type="date" value={form.fechaFallecimiento} onChange={(e) => setForm((p) => ({ ...p, fechaFallecimiento: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <select value={form.tipologia} onChange={(e) => setForm((p) => ({ ...p, tipologia: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background">
              <option value="fundadora">{t("socios.form.tipologia.fundadora")}</option>
              <option value="directiva">{t("socios.form.tipologia.directiva")}</option>
              <option value="delegada">{t("socios.form.tipologia.delegada")}</option>
              <option value="honorifica">{t("socios.form.tipologia.honorifica")}</option>
              <option value="numeraria">{t("socios.form.tipologia.numeraria")}</option>
              <option value="colaboradora">{t("socios.form.tipologia.colaboradora")}</option>
            </select>
            <input value={form.poblacion} onChange={(e) => setForm((p) => ({ ...p, poblacion: e.target.value }))} placeholder={t("common.city")} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <input value={form.provincia} onChange={(e) => setForm((p) => ({ ...p, provincia: e.target.value }))} placeholder={t("common.province")} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <input type="date" value={form.fechaAlta} onChange={(e) => setForm((p) => ({ ...p, fechaAlta: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background" />
            <select value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background">
              <option value="solicitante">{t("socios.form.status.solicitante")}</option>
              <option value="activo">{t("socios.form.status.active")}</option>
              <option value="baja">{t("socios.form.status.baja")}</option>
            </select>
            <input value={form.grupoId} onChange={(e) => setForm((p) => ({ ...p, grupoId: e.target.value }))} placeholder={t("socios.form.group_id_optional")} className="px-3 py-2 rounded-lg border border-border bg-background" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t("socios.form.photo.label")}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background cursor-pointer text-sm hover:bg-muted/40 transition-colors">
                {t("socios.form.photo.upload")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await fileToDataUrl(file);
                      setForm((p) => ({ ...p, avatarUrl: dataUrl }));
                    } catch {
                      setNotice(t("socios.form.photo.read_error"));
                    }
                  }}
                />
              </label>
              {form.avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((p) => ({ ...p, avatarUrl: "" }))}
                >
                  {t("socios.form.photo.remove")}
                </Button>
              )}
            </div>
            {form.avatarUrl && (
              <img
                src={form.avatarUrl}
                alt={t("socios.form.photo.preview_alt")}
                className="w-20 h-20 rounded-full object-cover border border-border"
              />
            )}
          </div>
          <textarea value={form.direccion} onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))} placeholder={t("common.address")} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background" />

          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
            <h3 className="font-semibold text-foreground">{t("socios.form.membership.title")}</h3>
            {isHonorificoForm ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {t("socios.form.membership.honorifico_no_fee")}
              </p>
            ) : (
              <div className="grid md:grid-cols-3 gap-3">
                <input value={form.membershipInvoice.concepto} onChange={(e) => setForm((p) => ({ ...p, membershipInvoice: { ...p.membershipInvoice, concepto: e.target.value } }))} placeholder={t("socios.form.membership.concept")} className="px-3 py-2 rounded-lg border border-border bg-background" />
                <input value={form.membershipInvoice.importe} onChange={(e) => setForm((p) => ({ ...p, membershipInvoice: { ...p.membershipInvoice, importe: e.target.value } }))} placeholder={t("socios.form.membership.amount")} className="px-3 py-2 rounded-lg border border-border bg-background" />
                <input value={form.membershipInvoice.referencia} onChange={(e) => setForm((p) => ({ ...p, membershipInvoice: { ...p.membershipInvoice, referencia: e.target.value } }))} placeholder={t("socios.form.membership.reference")} className="px-3 py-2 rounded-lg border border-border bg-background" />
                <input type="date" value={form.membershipInvoice.fechaFactura} onChange={(e) => setForm((p) => ({ ...p, membershipInvoice: { ...p.membershipInvoice, fechaFactura: e.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background" />
                <input type="date" value={form.membershipInvoice.fechaVencimiento} onChange={(e) => setForm((p) => ({ ...p, membershipInvoice: { ...p.membershipInvoice, fechaVencimiento: e.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background" />
                <select value={form.membershipInvoice.estado} onChange={(e) => setForm((p) => ({ ...p, membershipInvoice: { ...p.membershipInvoice, estado: e.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background">
                  <option value="pendiente">{t("socios.form.membership.pending")}</option>
                  <option value="pagado">{t("socios.form.membership.paid")}</option>
                </select>
                <select value={form.membershipInvoice.metodo} onChange={(e) => setForm((p) => ({ ...p, membershipInvoice: { ...p.membershipInvoice, metodo: e.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background">
                  <option value="transferencia">{t("socios.form.membership.method_transfer")}</option>
                  <option value="tarjeta">{t("socios.form.membership.method_card")}</option>
                  <option value="domiciliacion">{t("socios.form.membership.method_direct_debit")}</option>
                </select>
                {form.membershipInvoice.metodo === "domiciliacion" && (
                  <input
                    value={form.membershipInvoice.numeroCuenta}
                    onChange={(e) => setForm((p) => ({ ...p, membershipInvoice: { ...p.membershipInvoice, numeroCuenta: e.target.value } }))}
                    placeholder="Número de cuenta (IBAN)"
                    className="px-3 py-2 rounded-lg border border-border bg-background md:col-span-2"
                  />
                )}
                <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={form.membershipInvoice.crearEnOdoo} onChange={(e) => setForm((p) => ({ ...p, membershipInvoice: { ...p.membershipInvoice, crearEnOdoo: e.target.checked } }))} />
                  {t("socios.form.membership.sync_odoo")}
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={submitForm} disabled={saving}>{saving ? t("common.saving") : t("socios.form.save_member")}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>{t("common.cancel")}</Button>
          </div>
          {notice && <p className="text-sm text-muted-foreground mt-2">{notice}</p>}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters();
          }}
          placeholder={t("common.search")}
          className="w-full pl-10 pr-28 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        <Button
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8"
          onClick={applyFilters}
        >
          {t("common.search")}
        </Button>
      </div>
      <div className="mb-3">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={clearFilters}>
            {t("socios.filters.clear")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSecondaryColumns((v) => !v)}
          >
            {showSecondaryColumns ? t("socios.columns.hide_secondary") : t("socios.columns.show_secondary")}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-muted/50">
            <tr onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.form.photo.label")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.member_number")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.name")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.surname")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.form.dni_nif")}</th>
              {showSecondaryColumns && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.gender")}</th>}
              {showSecondaryColumns && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.form.birthdate")}</th>}
              {showSecondaryColumns && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.form.deathdate")}</th>}
              {showSecondaryColumns && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.city")}</th>}
              {showSecondaryColumns && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.province")}</th>}
              {showSecondaryColumns && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.phone")}</th>}
              {showSecondaryColumns && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.join_date")}</th>}
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.status")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipología</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.actions")}</th>
            </tr>
            <tr>
              <th className="px-2 py-2" />
              <th className="px-2 py-2">
                <div className="space-y-1">
                  <select value={columnSearch.numeroSocio.op} onChange={(e) => setColumnSearch((p) => ({ ...p, numeroSocio: { ...p.numeroSocio, op: e.target.value as FilterOp } }))} className="w-full px-2 py-1 rounded-md border border-border bg-white text-[11px]">
                    <option value="contains">contiene</option>
                    <option value="equals">igual</option>
                    <option value="startsWith">empieza</option>
                    <option value="endsWith">termina</option>
                    <option value="empty">vacío</option>
                    <option value="notEmpty">no vacío</option>
                  </select>
                  <input value={columnSearch.numeroSocio.value} onChange={(e) => setColumnSearch((p) => ({ ...p, numeroSocio: { ...p.numeroSocio, value: e.target.value } }))} placeholder={t("common.search")} className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs" disabled={columnSearch.numeroSocio.op === "empty" || columnSearch.numeroSocio.op === "notEmpty"} />
                </div>
              </th>
              <th className="px-2 py-2">
                <div className="space-y-1">
                  <select value={columnSearch.nombre.op} onChange={(e) => setColumnSearch((p) => ({ ...p, nombre: { ...p.nombre, op: e.target.value as FilterOp } }))} className="w-full px-2 py-1 rounded-md border border-border bg-white text-[11px]">
                    <option value="contains">contiene</option>
                    <option value="equals">igual</option>
                    <option value="startsWith">empieza</option>
                    <option value="endsWith">termina</option>
                    <option value="empty">vacío</option>
                    <option value="notEmpty">no vacío</option>
                  </select>
                  <input value={columnSearch.nombre.value} onChange={(e) => setColumnSearch((p) => ({ ...p, nombre: { ...p.nombre, value: e.target.value } }))} placeholder={t("common.search")} className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs" disabled={columnSearch.nombre.op === "empty" || columnSearch.nombre.op === "notEmpty"} />
                </div>
              </th>
              <th className="px-2 py-2">
                <div className="space-y-1">
                  <select value={columnSearch.apellidos.op} onChange={(e) => setColumnSearch((p) => ({ ...p, apellidos: { ...p.apellidos, op: e.target.value as FilterOp } }))} className="w-full px-2 py-1 rounded-md border border-border bg-white text-[11px]">
                    <option value="contains">contiene</option>
                    <option value="equals">igual</option>
                    <option value="startsWith">empieza</option>
                    <option value="endsWith">termina</option>
                    <option value="empty">vacío</option>
                    <option value="notEmpty">no vacío</option>
                  </select>
                  <input value={columnSearch.apellidos.value} onChange={(e) => setColumnSearch((p) => ({ ...p, apellidos: { ...p.apellidos, value: e.target.value } }))} placeholder={t("common.search")} className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs" disabled={columnSearch.apellidos.op === "empty" || columnSearch.apellidos.op === "notEmpty"} />
                </div>
              </th>
              <th className="px-2 py-2">
                <div className="space-y-1">
                  <select value={columnSearch.dni.op} onChange={(e) => setColumnSearch((p) => ({ ...p, dni: { ...p.dni, op: e.target.value as FilterOp } }))} className="w-full px-2 py-1 rounded-md border border-border bg-white text-[11px]">
                    <option value="contains">contiene</option>
                    <option value="equals">igual</option>
                    <option value="startsWith">empieza</option>
                    <option value="endsWith">termina</option>
                    <option value="empty">vacío</option>
                    <option value="notEmpty">no vacío</option>
                  </select>
                  <input value={columnSearch.dni.value} onChange={(e) => setColumnSearch((p) => ({ ...p, dni: { ...p.dni, value: e.target.value } }))} placeholder={t("common.search")} className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs" disabled={columnSearch.dni.op === "empty" || columnSearch.dni.op === "notEmpty"} />
                </div>
              </th>
              {showSecondaryColumns && <th className="px-2 py-2">
                <div className="space-y-1">
                  <select
                    value={columnSearch.genero.value}
                    onChange={(e) => setColumnSearch((p) => ({ ...p, genero: { op: "equals", value: e.target.value } }))}
                    className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs"
                  >
                    <option value="">Todos</option>
                    {genderRawOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </th>}
              {showSecondaryColumns && <th className="px-2 py-2">
                <div className="space-y-1">
                  <select value={columnSearch.fechaNacimiento.op} onChange={(e) => setColumnSearch((p) => ({ ...p, fechaNacimiento: { ...p.fechaNacimiento, op: e.target.value as FilterOp } }))} className="w-full px-2 py-1 rounded-md border border-border bg-white text-[11px]">
                    <option value="contains">contiene</option>
                    <option value="equals">igual</option>
                    <option value="startsWith">empieza</option>
                    <option value="endsWith">termina</option>
                    <option value="empty">vacío</option>
                    <option value="notEmpty">no vacío</option>
                  </select>
                  <input value={columnSearch.fechaNacimiento.value} onChange={(e) => setColumnSearch((p) => ({ ...p, fechaNacimiento: { ...p.fechaNacimiento, value: e.target.value } }))} placeholder={t("common.search")} className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs" disabled={columnSearch.fechaNacimiento.op === "empty" || columnSearch.fechaNacimiento.op === "notEmpty"} />
                </div>
              </th>}
              {showSecondaryColumns && <th className="px-2 py-2">
                <div className="space-y-1">
                  <select value={columnSearch.fechaFallecimiento.op} onChange={(e) => setColumnSearch((p) => ({ ...p, fechaFallecimiento: { ...p.fechaFallecimiento, op: e.target.value as FilterOp } }))} className="w-full px-2 py-1 rounded-md border border-border bg-white text-[11px]">
                    <option value="contains">contiene</option>
                    <option value="equals">igual</option>
                    <option value="startsWith">empieza</option>
                    <option value="endsWith">termina</option>
                    <option value="empty">vacío</option>
                    <option value="notEmpty">no vacío</option>
                  </select>
                  <input value={columnSearch.fechaFallecimiento.value} onChange={(e) => setColumnSearch((p) => ({ ...p, fechaFallecimiento: { ...p.fechaFallecimiento, value: e.target.value } }))} placeholder={t("common.search")} className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs" disabled={columnSearch.fechaFallecimiento.op === "empty" || columnSearch.fechaFallecimiento.op === "notEmpty"} />
                </div>
              </th>}
              {showSecondaryColumns && <th className="px-2 py-2">
                <div className="space-y-1">
                  <select value={columnSearch.poblacion.op} onChange={(e) => setColumnSearch((p) => ({ ...p, poblacion: { ...p.poblacion, op: e.target.value as FilterOp } }))} className="w-full px-2 py-1 rounded-md border border-border bg-white text-[11px]">
                    <option value="contains">contiene</option>
                    <option value="equals">igual</option>
                    <option value="startsWith">empieza</option>
                    <option value="endsWith">termina</option>
                    <option value="empty">vacío</option>
                    <option value="notEmpty">no vacío</option>
                  </select>
                  <input value={columnSearch.poblacion.value} onChange={(e) => setColumnSearch((p) => ({ ...p, poblacion: { ...p.poblacion, value: e.target.value } }))} placeholder={t("common.search")} className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs" disabled={columnSearch.poblacion.op === "empty" || columnSearch.poblacion.op === "notEmpty"} />
                </div>
              </th>}
              {showSecondaryColumns && <th className="px-2 py-2">
                <div className="space-y-1">
                  <select value={columnSearch.provincia.op} onChange={(e) => setColumnSearch((p) => ({ ...p, provincia: { ...p.provincia, op: e.target.value as FilterOp } }))} className="w-full px-2 py-1 rounded-md border border-border bg-white text-[11px]">
                    <option value="contains">contiene</option>
                    <option value="equals">igual</option>
                    <option value="startsWith">empieza</option>
                    <option value="endsWith">termina</option>
                    <option value="empty">vacío</option>
                    <option value="notEmpty">no vacío</option>
                  </select>
                  <input value={columnSearch.provincia.value} onChange={(e) => setColumnSearch((p) => ({ ...p, provincia: { ...p.provincia, value: e.target.value } }))} placeholder={t("common.search")} className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs" disabled={columnSearch.provincia.op === "empty" || columnSearch.provincia.op === "notEmpty"} />
                </div>
              </th>}
              {showSecondaryColumns && <th className="px-2 py-2">
                <div className="space-y-1">
                  <select value={columnSearch.telefono.op} onChange={(e) => setColumnSearch((p) => ({ ...p, telefono: { ...p.telefono, op: e.target.value as FilterOp } }))} className="w-full px-2 py-1 rounded-md border border-border bg-white text-[11px]">
                    <option value="contains">contiene</option>
                    <option value="equals">igual</option>
                    <option value="startsWith">empieza</option>
                    <option value="endsWith">termina</option>
                    <option value="empty">vacío</option>
                    <option value="notEmpty">no vacío</option>
                  </select>
                  <input value={columnSearch.telefono.value} onChange={(e) => setColumnSearch((p) => ({ ...p, telefono: { ...p.telefono, value: e.target.value } }))} placeholder={t("common.search")} className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs" disabled={columnSearch.telefono.op === "empty" || columnSearch.telefono.op === "notEmpty"} />
                </div>
              </th>}
              {showSecondaryColumns && <th className="px-2 py-2">
                <div className="space-y-1">
                  <select value={columnSearch.fechaAlta.op} onChange={(e) => setColumnSearch((p) => ({ ...p, fechaAlta: { ...p.fechaAlta, op: e.target.value as FilterOp } }))} className="w-full px-2 py-1 rounded-md border border-border bg-white text-[11px]">
                    <option value="contains">contiene</option>
                    <option value="equals">igual</option>
                    <option value="startsWith">empieza</option>
                    <option value="endsWith">termina</option>
                    <option value="empty">vacío</option>
                    <option value="notEmpty">no vacío</option>
                  </select>
                  <input value={columnSearch.fechaAlta.value} onChange={(e) => setColumnSearch((p) => ({ ...p, fechaAlta: { ...p.fechaAlta, value: e.target.value } }))} placeholder={t("common.search")} className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs" disabled={columnSearch.fechaAlta.op === "empty" || columnSearch.fechaAlta.op === "notEmpty"} />
                </div>
              </th>}
              <th className="px-2 py-2">
                <div className="space-y-1">
                  <select
                    value={columnSearch.estado.value}
                    onChange={(e) => setColumnSearch((p) => ({ ...p, estado: { op: "equals", value: e.target.value } }))}
                    className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs"
                  >
                    <option value="">Todos</option>
                    <option value="activo">{t("socios.form.status.active")}</option>
                    <option value="solicitante">{t("socios.form.status.solicitante")}</option>
                    <option value="baja">{t("socios.form.status.baja")}</option>
                  </select>
                </div>
              </th>
              <th className="px-2 py-2">
                <div className="space-y-1">
                  <select
                    value={columnSearch.tipologia.value}
                    onChange={(e) => setColumnSearch((p) => ({ ...p, tipologia: { op: "equals", value: e.target.value } }))}
                    className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs"
                  >
                    <option value="">Todas</option>
                    <option value="fundadora">{t("socios.form.tipologia.fundadora")}</option>
                    <option value="directiva">{t("socios.form.tipologia.directiva")}</option>
                    <option value="delegada">{t("socios.form.tipologia.delegada")}</option>
                    <option value="honorifica">{t("socios.form.tipologia.honorifica")}</option>
                    <option value="numeraria">{t("socios.form.tipologia.numeraria")}</option>
                    <option value="colaboradora">{t("socios.form.tipologia.colaboradora")}</option>
                  </select>
                </div>
              </th>
              <th className="px-2 py-2">
                <Button size="sm" variant="outline" onClick={applyFilters}>
                  Aplicar
                </Button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => (
              <tr
                key={s.id}
                className={`hover:bg-muted/20 transition-colors cursor-pointer ${selectedSocioId === s.id ? "bg-primary/5" : ""}`}
                onClick={() => setSelectedSocioId(s.id)}
              >
                <td className="px-4 py-3">
                  {s.avatarUrl ? (
                    <img
                      src={s.avatarUrl}
                      alt={`${s.nombre ?? ""} ${s.apellidos ?? ""}`.trim() || t("socios.form.photo.preview_alt")}
                      className="w-10 h-10 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground">
                      {(s.nombre?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{s.numeroSocio || "-"}</td>
                <td className="px-4 py-3 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span>{s.nombre || "-"}</span>
                    {(s.tipologia === "honorifica" || isHonorificoByBirthdate(s.fechaNacimiento)) && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                        {t("socios.form.honorifico")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.apellidos || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.dni || "-"}</td>
                {showSecondaryColumns && (
                  <td className="px-4 py-3 text-muted-foreground">
                    {normalizeGeneroRawToken(s.genero) || "-"}
                  </td>
                )}
                {showSecondaryColumns && <td className="px-4 py-3 text-muted-foreground">{s.fechaNacimiento || "-"}</td>}
                {showSecondaryColumns && <td className="px-4 py-3 text-muted-foreground">{s.fechaFallecimiento || "-"}</td>}
                {showSecondaryColumns && <td className="px-4 py-3 text-muted-foreground">{s.poblacion || "-"}</td>}
                {showSecondaryColumns && <td className="px-4 py-3 text-muted-foreground">{s.provincia || "-"}</td>}
                {showSecondaryColumns && <td className="px-4 py-3 text-muted-foreground">{s.telefono || "-"}</td>}
                {showSecondaryColumns && <td className="px-4 py-3 text-muted-foreground">{s.fechaAlta || "-"}</td>}
                <td className="px-4 py-3">
                  {(() => {
                    const normalizedEstado = normalizeEstadoValue(s.estado);
                    return (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    normalizedEstado === "activo"
                      ? "bg-green-100 text-green-700"
                      : normalizedEstado === "solicitante"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-600"
                  }`}>
                    {normalizedEstado === "activo"
                      ? t("socios.form.status.active")
                      : normalizedEstado === "solicitante"
                        ? t("socios.form.status.solicitante")
                        : t("socios.form.status.baja")}
                  </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.tipologia || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(s)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground mt-3">
        {loading ? t("socios.form.loading_members") : `${filtered.length} ${t("common.member")}s`}
      </p>
      {!loading && (
        <p className="text-xs text-muted-foreground mt-1">
          Cargados: {items.length} · Mostrados: {filtered.length}
        </p>
      )}
      {!loading && (
        <p className="text-xs text-muted-foreground mt-1">
          Género (crudo BD): H: {genderRawStats.h} · M: {genderRawStats.m} · F: {genderRawStats.f} · Otros/vacío: {genderRawStats.other}
        </p>
      )}
      {loadError && (
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-red-600">{loadError}</p>
          <Button size="sm" variant="outline" onClick={() => void loadSocios()}>
            Reintentar
          </Button>
        </div>
      )}
      {!showForm && notice && <p className="text-sm text-muted-foreground mt-2">{notice}</p>}
      </>
      )}
    </div>
  );
}
