import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Plus, Search, Edit, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/use-store";
import GestionGrupos from "./GestionGrupos";

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
  grupoId?: number | null;
  grupoManual?: boolean | null;
};

type SolicitudRow = {
  id: number;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  estado: string;
  usuarioId: number | null;
  usuarioUsername: string | null;
  solicitudRevisionMensaje: string | null;
  solicitudRevisionCampos: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

/** Claves alineadas con Mi perfil / API revisión */
const SOLICITUD_REVISION_FIELDS: { key: string; labelKey: string }[] = [
  { key: "nombre", labelKey: "common.name" },
  { key: "apellidos", labelKey: "perfil.surname" },
  { key: "email", labelKey: "form.email" },
  { key: "telefono", labelKey: "common.phone" },
  { key: "direccion", labelKey: "common.address" },
  { key: "poblacion", labelKey: "common.city" },
  { key: "provincia", labelKey: "common.province" },
  { key: "dni", labelKey: "perfil.dni" },
  { key: "fecha_nacimiento", labelKey: "perfil.birth_date" },
  { key: "genero", labelKey: "common.gender" },
  { key: "foto", labelKey: "perfil.membership_photo_label" },
  { key: "dni_anverso", labelKey: "perfil.membership_dni_front" },
  { key: "dni_reverso", labelKey: "perfil.membership_dni_back" },
  { key: "cuota_importe", labelKey: "perfil.membership_fee_title" },
  { key: "metodo_pago", labelKey: "perfil.membership_payment_method" },
];

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
  /** Asignación manual (protegida frente a recálculo por grupos). */
  grupoManual: boolean;
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
  grupoManual: false,
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

/**
 * Columnas del listado de socios que se pueden ocultar progresivamente desde
 * la izquierda al pulsar el botón "→". Las columnas fijas (foto, n.º, nombre,
 * estado, tipología y acciones) permanecen siempre visibles; las que están
 * aquí van saliendo del viewport en este orden.
 */
const SLIDABLE_COLS = [
  "apellidos",
  "dni",
  "genero",
  "fechaNacimiento",
  "fechaFallecimiento",
  "poblacion",
  "provincia",
  "telefono",
  "fechaAlta",
] as const;
type SlidableCol = (typeof SLIDABLE_COLS)[number];

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
  // Listado de socios: desplazamiento horizontal de columnas. Las columnas
  // listadas en `SLIDABLE_COLS` se ocultan progresivamente desde la izquierda
  // (empezando por "apellidos") al pulsar el botón → y se vuelven a mostrar
  // con el botón ←. De este modo siempre caben las columnas en pantalla sin
  // necesidad de un toggle "mostrar/ocultar secundarias".
  const [colOffset, setColOffset] = useState(0);
  const maxColOffset = SLIDABLE_COLS.length - 1;
  const isColVisible = (c: SlidableCol) => SLIDABLE_COLS.indexOf(c) >= colOffset;
  const [selectedSocioId, setSelectedSocioId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SocioForm>(EMPTY_FORM);
  const [notice, setNotice] = useState("");
  const [subsection, setSubsection] = useState<"socios" | "solicitudes" | "grupos" | "vinculacion" | "contable" | "historico">("socios");

  // ── Vinculación usuario ↔ socio ───────────────────────────────────────────
  type UsuarioNoVinculado = {
    id: number;
    username: string;
    nombre: string | null;
    apellidos: string | null;
    email: string | null;
    telefono: string | null;
    rol: string | null;
    avatarUrl: string | null;
  };
  type SocioNoVinculado = {
    id: number;
    numeroSocio: string | null;
    nombre: string | null;
    apellidos: string | null;
    email: string | null;
    telefono: string | null;
    dni: string | null;
    poblacion: string | null;
    estado: string | null;
  };

  const [vincUsuariosLoading, setVincUsuariosLoading] = useState(false);
  const [vincUsuariosBusqueda, setVincUsuariosBusqueda] = useState("");
  const [vincUsuarios, setVincUsuarios] = useState<UsuarioNoVinculado[]>([]);
  const [vincUsuarioSel, setVincUsuarioSel] = useState<UsuarioNoVinculado | null>(null);

  const [vincSociosLoading, setVincSociosLoading] = useState(false);
  const [vincSociosBusqueda, setVincSociosBusqueda] = useState("");
  const [vincSocios, setVincSocios] = useState<SocioNoVinculado[]>([]);
  const [vincSocioSel, setVincSocioSel] = useState<SocioNoVinculado | null>(null);
  const [vincSaving, setVincSaving] = useState(false);
  const [vincNotice, setVincNotice] = useState<string | null>(null);

  type VinculoExistente = {
    userId: number;
    username: string;
    userNombre: string | null;
    userApellidos: string | null;
    userEmail: string | null;
    userRol: string | null;
    socioId: number;
    numeroSocio: string | null;
    socioNombre: string | null;
    socioApellidos: string | null;
    socioEmail: string | null;
    socioDni: string | null;
    socioPoblacion: string | null;
    socioEstado: string | null;
  };
  const [vincExistentesLoading, setVincExistentesLoading] = useState(false);
  const [vincExistentesBusqueda, setVincExistentesBusqueda] = useState("");
  const [vincExistentes, setVincExistentes] = useState<VinculoExistente[]>([]);

  const loadVincUsuarios = async (q?: string) => {
    if (!token) return;
    setVincUsuariosLoading(true);
    try {
      const url = new URL(`${API}/socios/vinculacion/usuarios-no-vinculados`, window.location.origin);
      if (q && q.trim()) url.searchParams.set("q", q.trim());
      const r = await fetch(url.pathname + url.search, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      setVincUsuarios(Array.isArray(d?.items) ? d.items : []);
    } catch (err) {
      setVincNotice(err instanceof Error ? err.message : "Error");
      setVincUsuarios([]);
    } finally {
      setVincUsuariosLoading(false);
    }
  };

  const loadVincSocios = async (q?: string) => {
    if (!token) return;
    setVincSociosLoading(true);
    try {
      const url = new URL(`${API}/socios/vinculacion/socios-no-vinculados`, window.location.origin);
      if (q && q.trim()) url.searchParams.set("q", q.trim());
      const r = await fetch(url.pathname + url.search, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      setVincSocios(Array.isArray(d?.items) ? d.items : []);
    } catch (err) {
      setVincNotice(err instanceof Error ? err.message : "Error");
      setVincSocios([]);
    } finally {
      setVincSociosLoading(false);
    }
  };

  const loadVincExistentes = async (q?: string) => {
    if (!token) return;
    setVincExistentesLoading(true);
    try {
      const url = new URL(`${API}/socios/vinculacion/existentes`, window.location.origin);
      if (q && q.trim()) url.searchParams.set("q", q.trim());
      const r = await fetch(url.pathname + url.search, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      setVincExistentes(Array.isArray(d?.items) ? d.items : []);
    } catch (err) {
      setVincNotice(err instanceof Error ? err.message : "Error");
      setVincExistentes([]);
    } finally {
      setVincExistentesLoading(false);
    }
  };

  const vincularUsuarioSocio = async () => {
    if (!token) return;
    if (!vincUsuarioSel) {
      setVincNotice(t("socios.vinculacion.choose_user_first"));
      return;
    }
    if (!vincSocioSel) {
      setVincNotice(t("socios.vinculacion.choose_socio_first"));
      return;
    }
    setVincSaving(true);
    setVincNotice(null);
    try {
      const r = await fetch(`${API}/socios/vinculacion/vincular`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: vincUsuarioSel.id, socioId: vincSocioSel.id }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      setVincNotice(t("socios.vinculacion.linked_ok"));
      setVincUsuarioSel(null);
      setVincSocioSel(null);
      await Promise.all([
        loadVincUsuarios(vincUsuariosBusqueda),
        loadVincSocios(vincSociosBusqueda),
        loadVincExistentes(vincExistentesBusqueda),
      ]);
    } catch (err) {
      setVincNotice(err instanceof Error ? err.message : "Error");
    } finally {
      setVincSaving(false);
    }
  };

  const desvincularUsuario = async (userId: number) => {
    if (!token) return;
    setVincSaving(true);
    setVincNotice(null);
    try {
      const r = await fetch(`${API}/socios/vinculacion/desvincular`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(String(d?.error ?? r.status));
      setVincNotice(t("socios.vinculacion.unlinked_ok"));
      await Promise.all([
        loadVincUsuarios(vincUsuariosBusqueda),
        loadVincSocios(vincSociosBusqueda),
        loadVincExistentes(vincExistentesBusqueda),
      ]);
    } catch (err) {
      setVincNotice(err instanceof Error ? err.message : "Error");
    } finally {
      setVincSaving(false);
    }
  };
  const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const [solicitudExpandId, setSolicitudExpandId] = useState<number | null>(null);
  const [revisionCamposPick, setRevisionCamposPick] = useState<string[]>([]);
  const [revisionMensajePick, setRevisionMensajePick] = useState("");
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

  const loadSolicitudes = async () => {
    if (!token) return;
    setSolicitudesLoading(true);
    try {
      const r = await fetch(`${API}/socios/solicitudes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const errBody = await r.json().catch(() => null);
        throw new Error(String(errBody?.error ?? errBody?.detalle ?? `HTTP ${r.status}`));
      }
      const d = await r.json();
      setSolicitudes(Array.isArray(d?.items) ? (d.items as SolicitudRow[]) : []);
    } catch (err) {
      setSolicitudes([]);
      setNotice(err instanceof Error ? err.message : "Error cargando solicitudes");
    } finally {
      setSolicitudesLoading(false);
    }
  };

  const patchSolicitudResolucion = async (
    socioId: number,
    accion: "admitir" | "rechazar" | "pendiente_datos",
    extra?: { campos?: string[]; mensaje?: string },
  ) => {
    if (!token) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/socios/${socioId}/solicitud`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion,
          campos_revision: extra?.campos,
          mensaje_revision: extra?.mensaje,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(String(d?.error ?? d?.detalle ?? `HTTP ${r.status}`));
      }
      setNotice(
        accion === "admitir"
          ? t("socios.solicitud.notice.admitted")
          : accion === "rechazar"
            ? t("socios.solicitud.notice.rejected")
            : t("socios.solicitud.notice.revision_requested"),
      );
      setSolicitudExpandId(null);
      setRevisionCamposPick([]);
      setRevisionMensajePick("");
      await loadSolicitudes();
      await loadSocios();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("socios.solicitud.notice.error"));
    } finally {
      setSaving(false);
    }
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
      const r = await fetch(`${API}/admin/nosotros/cargos`, {
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

  const normalizeEstadoValue = (
    v: string | null | undefined,
  ): "activo" | "solicitante" | "baja" | "pendiente_datos" | "rechazado" | "" => {
    const raw = String(v ?? "").toLowerCase().trim();
    if (!raw) return "";
    if (raw === "activo" || raw === "active") return "activo";
    if (raw === "solicitante" || raw === "pending" || raw === "pendiente") return "solicitante";
    if (raw === "pendiente_datos") return "pendiente_datos";
    if (raw === "rechazado") return "rechazado";
    if (raw === "baja" || raw === "inactivo" || raw === "inactive") return "baja";
    return "";
  };

  // Códigos unificados de género (BD): M (Masculino), F (Femenino), N (Otros / no informado).
  // "H" antiguo se trata como M por compatibilidad con datos heredados.
  const normalizeGeneroValue = (v: string | null | undefined): "M" | "F" | "N" | "" => {
    const raw = String(v ?? "").toLowerCase().trim();
    if (!raw) return "";
    if (raw === "m" || raw === "h" || raw === "masculino" || raw === "male" || raw === "hombre" || raw === "g" || raw === "gizon" || raw === "gizonezkoa") return "M";
    if (raw === "f" || raw === "female" || raw === "femenino" || raw === "mujer" || raw === "e" || raw === "emakume" || raw === "emakumezkoa") return "F";
    if (raw === "n" || raw === "x" || raw === "nb" || raw === "other" || raw === "otro") return "N";
    return "";
  };

  const normalizeGeneroRawToken = (v: string | null | undefined): string => {
    return normalizeGeneroValue(v) || "";
  };

  // Etiqueta visible de la letra de género según idioma activo (M↔G, F↔E, N=N).
  const generoCodeLabel = (code: string): string => {
    if (code === "M") return t("socios.form.gender.code.male");
    if (code === "F") return t("socios.form.gender.code.female");
    if (code === "N") return t("socios.form.gender.code.nonbinary");
    return "";
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
    // m = Masculino (incluye "H" legacy), f = Femenino, n = Otros, other = vacío/desconocido.
    const stats = { m: 0, f: 0, n: 0, other: 0 };
    for (const s of items) {
      const code = normalizeGeneroValue(s.genero);
      if (code === "M") stats.m += 1;
      else if (code === "F") stats.f += 1;
      else if (code === "N") stats.n += 1;
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
      grupoId: source.grupoId != null && source.grupoId !== undefined ? String(source.grupoId) : "",
      grupoManual: Boolean((source as { grupoManual?: boolean | null }).grupoManual),
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

  const aplicarGrupoAutomaticoEdicion = async () => {
    if (!token || !editingId) return;
    setSaving(true);
    setNotice("");
    try {
      const r = await fetch(`${API}/admin/socios/${editingId}/grupo-automatico`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(String(d?.error ?? d?.detalle ?? `HTTP ${r.status}`));
      }
      const r2 = await fetch(`${API}/socios/${editingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const s = await r2.json();
      if (r2.ok) {
        setForm((p) => ({
          ...p,
          grupoId: s.grupoId != null ? String(s.grupoId) : "",
          grupoManual: Boolean(s.grupoManual),
        }));
      }
      setNotice(t("socios.form.notice.grupo_automatico_ok"));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("socios.form.notice.error_saving"));
    } finally {
      setSaving(false);
    }
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

  const cargoOptions = useMemo(
    () =>
      [...cargos].sort((a, b) => {
        const ambitoCmp = String(a.ambito ?? "").localeCompare(String(b.ambito ?? ""), "es");
        if (ambitoCmp !== 0) return ambitoCmp;
        return String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es");
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
          <Button
            className="gap-2"
            onClick={() => {
              setSubsection("solicitudes");
              void loadSolicitudes();
            }}
          >
            <Plus className="w-4 h-4" />
            {t("socios.new")}
          </Button>
          <Button variant="outline" className="gap-2" onClick={openCreate}>
            {t("socios.solicitud.manual_create")}
          </Button>
        </div>
      </div>
      <div className="mb-6 flex gap-2 flex-wrap">
        <Button variant={subsection === "socios" ? "default" : "outline"} size="sm" onClick={() => setSubsection("socios")}>
          {t("socios.tabs.list")}
        </Button>
        <Button
          variant={subsection === "solicitudes" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSubsection("solicitudes");
            void loadSolicitudes();
          }}
        >
          {t("socios.tabs.solicitudes")}
        </Button>
        <Button
          variant={subsection === "grupos" ? "default" : "outline"}
          size="sm"
          onClick={() => setSubsection("grupos")}
        >
          {t("socios.tabs.grupos")}
        </Button>
        <Button
          variant={subsection === "vinculacion" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSubsection("vinculacion");
            void loadVincUsuarios();
            void loadVincSocios();
            void loadVincExistentes();
          }}
        >
          {t("socios.tabs.vinculacion")}
        </Button>
        <Button variant={subsection === "contable" ? "default" : "outline"} size="sm" onClick={() => { setSubsection("contable"); void loadHistorico({ ...contableFilters }); }}>
          {t("socios.tabs.query_positions")}
        </Button>
        <Button variant={subsection === "historico" ? "default" : "outline"} size="sm" onClick={() => { setSubsection("historico"); void loadHistorico({}); }}>
          {t("socios.tabs.assign_positions")}
        </Button>
      </div>

      {subsection === "solicitudes" && (
        <div className="mb-8 rounded-2xl border border-border bg-white p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("socios.solicitud.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("socios.solicitud.subtitle")}</p>
          </div>
          {solicitudesLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : solicitudes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("socios.solicitud.empty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="p-3 font-semibold">{t("common.name")}</th>
                    <th className="p-3 font-semibold">{t("form.email")}</th>
                    <th className="p-3 font-semibold">{t("common.phone")}</th>
                    <th className="p-3 font-semibold">{t("common.status")}</th>
                    <th className="p-3 font-semibold">{t("socios.solicitud.user_login")}</th>
                    <th className="p-3 font-semibold w-[280px]">{t("socios.solicitud.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((s) => {
                    const ne = normalizeEstadoValue(s.estado);
                    const estadoLabel =
                      ne === "pendiente_datos"
                        ? t("socios.form.status.pendiente_datos")
                        : ne === "solicitante"
                          ? t("socios.form.status.solicitante")
                          : s.estado;
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="p-3">
                          {`${s.nombre} ${s.apellidos ?? ""}`.trim()}
                          {s.solicitudRevisionMensaje && ne === "pendiente_datos" ? (
                            <p className="text-xs text-amber-800 mt-1 max-w-xs truncate" title={s.solicitudRevisionMensaje}>
                              {s.solicitudRevisionMensaje}
                            </p>
                          ) : null}
                        </td>
                        <td className="p-3">{s.email ?? "—"}</td>
                        <td className="p-3">{s.telefono ?? "—"}</td>
                        <td className="p-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              ne === "pendiente_datos"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-blue-100 text-blue-900"
                            }`}
                          >
                            {estadoLabel}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{s.usuarioUsername ?? "—"}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={saving}
                              onClick={() => {
                                void patchSolicitudResolucion(s.id, "admitir");
                              }}
                            >
                              {t("socios.solicitud.admit")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs"
                              disabled={saving}
                              onClick={() => {
                                if (window.confirm(t("socios.solicitud.confirm_reject"))) {
                                  void patchSolicitudResolucion(s.id, "rechazar");
                                }
                              }}
                            >
                              {t("socios.solicitud.reject")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={saving}
                              onClick={() => {
                                setSolicitudExpandId(s.id);
                                setRevisionCamposPick([]);
                                setRevisionMensajePick("");
                              }}
                            >
                              {t("socios.solicitud.request_fix")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {solicitudExpandId != null && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
              <p className="font-medium text-foreground">{t("socios.solicitud.revision_panel_title")}</p>
              <p className="text-xs text-muted-foreground">{t("socios.solicitud.revision_panel_hint")}</p>
              <div className="grid sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {SOLICITUD_REVISION_FIELDS.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={revisionCamposPick.includes(f.key)}
                      onChange={(e) => {
                        setRevisionCamposPick((prev) =>
                          e.target.checked ? [...prev, f.key] : prev.filter((k) => k !== f.key),
                        );
                      }}
                    />
                    <span>{t(f.labelKey)}</span>
                  </label>
                ))}
              </div>
              <textarea
                className="w-full min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t("socios.solicitud.mensaje_placeholder")}
                value={revisionMensajePick}
                onChange={(e) => setRevisionMensajePick(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || revisionCamposPick.length === 0}
                  onClick={() => {
                    void patchSolicitudResolucion(solicitudExpandId, "pendiente_datos", {
                      campos: revisionCamposPick,
                      mensaje: revisionMensajePick,
                    });
                  }}
                >
                  {t("socios.solicitud.send_revision")}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSolicitudExpandId(null)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {subsection === "grupos" && (
        <div className="mb-8">
          <GestionGrupos />
        </div>
      )}

      {subsection === "vinculacion" && (
        <div className="mb-8 rounded-2xl border border-border bg-white p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("socios.vinculacion.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("socios.vinculacion.subtitle")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("socios.vinculacion.help")}</p>
          </div>

          {vincNotice ? (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              {vincNotice}
            </div>
          ) : null}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{t("socios.vinculacion.users_label")}</h3>
                <span className="text-xs text-muted-foreground">{vincUsuarios.length}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={vincUsuariosBusqueda}
                  onChange={(e) => setVincUsuariosBusqueda(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadVincUsuarios(vincUsuariosBusqueda);
                  }}
                  onBlur={() => void loadVincUsuarios(vincUsuariosBusqueda)}
                  placeholder={t("socios.vinculacion.search_users")}
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
              {vincUsuariosLoading ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : vincUsuarios.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("socios.vinculacion.no_users")}</p>
              ) : (
                <ul className="max-h-80 overflow-y-auto divide-y divide-border rounded-lg border border-border">
                  {vincUsuarios.map((u) => {
                    const selected = vincUsuarioSel?.id === u.id;
                    const display = `${u.nombre ?? ""} ${u.apellidos ?? ""}`.trim() || u.username;
                    return (
                      <li
                        key={u.id}
                        className={`px-3 py-2 cursor-pointer ${selected ? "bg-primary/10" : "hover:bg-muted/30"}`}
                        onClick={() => setVincUsuarioSel(u)}
                      >
                        <p className="text-sm font-medium text-foreground">{display}</p>
                        <p className="text-xs text-muted-foreground">
                          @{u.username}
                          {u.email ? ` · ${u.email}` : ""}
                          {u.rol ? ` · ${u.rol}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{t("socios.vinculacion.target_socio")}</h3>
                <span className="text-xs text-muted-foreground">{vincSocios.length}</span>
              </div>
              {vincUsuarioSel ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">
                    {t("socios.vinculacion.selected_user")}:{" "}
                    {`${vincUsuarioSel.nombre ?? ""} ${vincUsuarioSel.apellidos ?? ""}`.trim() ||
                      vincUsuarioSel.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{vincUsuarioSel.username}
                    {vincUsuarioSel.email ? ` · ${vincUsuarioSel.email}` : ""}
                  </p>
                </div>
              ) : null}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={vincSociosBusqueda}
                  onChange={(e) => setVincSociosBusqueda(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadVincSocios(vincSociosBusqueda);
                  }}
                  onBlur={() => void loadVincSocios(vincSociosBusqueda)}
                  placeholder={t("socios.vinculacion.search_socios")}
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
              {vincSociosLoading ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : vincSocios.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("socios.vinculacion.no_socios")}</p>
              ) : (
                <ul className="max-h-80 overflow-y-auto divide-y divide-border rounded-lg border border-border">
                  {vincSocios.map((s) => {
                    const selected = vincSocioSel?.id === s.id;
                    const display = `${s.apellidos ?? ""} ${s.nombre ?? ""}`.trim() || `#${s.id}`;
                    return (
                      <li
                        key={s.id}
                        className={`px-3 py-2 cursor-pointer ${selected ? "bg-primary/10" : "hover:bg-muted/30"}`}
                        onClick={() => setVincSocioSel(s)}
                      >
                        <p className="text-sm font-medium text-foreground">{display}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.numeroSocio ? `Nº ${s.numeroSocio}` : `#${s.id}`}
                          {s.dni ? ` · ${s.dni}` : ""}
                          {s.email ? ` · ${s.email}` : ""}
                          {s.poblacion ? ` · ${s.poblacion}` : ""}
                          {s.estado ? ` · ${s.estado}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  onClick={() => void vincularUsuarioSocio()}
                  disabled={vincSaving || !vincUsuarioSel || !vincSocioSel}
                >
                  {vincSaving ? t("common.loading") : t("socios.vinculacion.link")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => vincUsuarioSel && void desvincularUsuario(vincUsuarioSel.id)}
                  disabled={vincSaving || !vincUsuarioSel}
                >
                  {t("socios.vinculacion.unlink")}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{t("socios.vinculacion.existing_title")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("socios.vinculacion.existing_subtitle")}</p>
              </div>
              <span className="text-xs text-muted-foreground">{vincExistentes.length}</span>
            </div>
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={vincExistentesBusqueda}
                onChange={(e) => setVincExistentesBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void loadVincExistentes(vincExistentesBusqueda);
                }}
                onBlur={() => void loadVincExistentes(vincExistentesBusqueda)}
                placeholder={t("socios.vinculacion.search_existing")}
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            {vincExistentesLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : vincExistentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("socios.vinculacion.no_existing")}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="p-3 font-semibold">{t("socios.vinculacion.col_user")}</th>
                      <th className="p-3 font-semibold">{t("socios.vinculacion.col_socio")}</th>
                      <th className="p-3 font-semibold text-right">{t("socios.vinculacion.col_actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {vincExistentes.map((v) => {
                      const userDisplay =
                        `${v.userNombre ?? ""} ${v.userApellidos ?? ""}`.trim() || v.username;
                      const socioDisplay =
                        `${v.socioApellidos ?? ""} ${v.socioNombre ?? ""}`.trim() || `#${v.socioId}`;
                      return (
                        <tr key={`${v.userId}-${v.socioId}`}>
                          <td className="p-3 align-top">
                            <p className="font-medium text-foreground">{userDisplay}</p>
                            <p className="text-xs text-muted-foreground">
                              @{v.username}
                              {v.userEmail ? ` · ${v.userEmail}` : ""}
                              {v.userRol ? ` · ${v.userRol}` : ""}
                            </p>
                          </td>
                          <td className="p-3 align-top">
                            <p className="font-medium text-foreground">{socioDisplay}</p>
                            <p className="text-xs text-muted-foreground">
                              {v.numeroSocio ? `Nº ${v.numeroSocio}` : `#${v.socioId}`}
                              {v.socioDni ? ` · ${v.socioDni}` : ""}
                              {v.socioEmail ? ` · ${v.socioEmail}` : ""}
                              {v.socioPoblacion ? ` · ${v.socioPoblacion}` : ""}
                              {v.socioEstado ? ` · ${v.socioEstado}` : ""}
                            </p>
                          </td>
                          <td className="p-3 align-top text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={vincSaving}
                              onClick={() => void desvincularUsuario(v.userId)}
                            >
                              {t("socios.vinculacion.unlink")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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
                {cargoOptions.map((c) => (
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
                  {saving ? t("common.saving") : t("socios.form.modify_create")}
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
              <option value="M">{t("socios.form.gender.male")}</option>
              <option value="F">{t("socios.form.gender.female")}</option>
              <option value="N">{t("socios.form.gender.nonbinary")}</option>
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
              <option value="pendiente_datos">{t("socios.form.status.pendiente_datos")}</option>
              <option value="activo">{t("socios.form.status.active")}</option>
              <option value="rechazado">{t("socios.form.status.rechazado")}</option>
              <option value="baja">{t("socios.form.status.baja")}</option>
            </select>
            <div className="md:col-span-3 flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={form.grupoId}
                  onChange={(e) => setForm((p) => ({ ...p, grupoId: e.target.value }))}
                  placeholder={t("socios.form.group_id_optional")}
                  className="px-3 py-2 rounded-lg border border-border bg-background min-w-[140px] flex-1 max-w-xs"
                />
                {form.grupoManual ? (
                  <span className="text-xs font-semibold text-primary px-2 py-1 rounded-md bg-primary/10 whitespace-nowrap">
                    {t("socios.form.grupo_manual_badge")}
                  </span>
                ) : null}
                {editingId ? (
                  <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void aplicarGrupoAutomaticoEdicion()}>
                    {t("socios.form.grupo_automatico_btn")}
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{t("socios.form.grupo_help")}</p>
            </div>
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
        <div className="flex gap-2 items-center flex-wrap">
          <Button size="sm" variant="outline" onClick={clearFilters}>
            {t("socios.filters.clear")}
          </Button>
          <div className="flex gap-1 items-center">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              disabled={colOffset === 0}
              onClick={() => setColOffset((o) => Math.max(0, o - 1))}
              title={t("socios.columns.scroll_left")}
              aria-label={t("socios.columns.scroll_left")}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              disabled={colOffset >= maxColOffset}
              onClick={() => setColOffset((o) => Math.min(maxColOffset, o + 1))}
              title={t("socios.columns.scroll_right")}
              aria-label={t("socios.columns.scroll_right")}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground ml-1">
              {`${colOffset + 1}/${SLIDABLE_COLS.length}`}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.form.photo.label")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.member_number")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.name")}</th>
              {isColVisible("apellidos") && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.surname")}</th>}
              {isColVisible("dni") && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.form.dni_nif")}</th>}
              {isColVisible("genero") && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.gender")}</th>}
              {isColVisible("fechaNacimiento") && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.form.birthdate")}</th>}
              {isColVisible("fechaFallecimiento") && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.form.deathdate")}</th>}
              {isColVisible("poblacion") && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.city")}</th>}
              {isColVisible("provincia") && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.province")}</th>}
              {isColVisible("telefono") && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.phone")}</th>}
              {isColVisible("fechaAlta") && <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.join_date")}</th>}
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
              {isColVisible("apellidos") && <th className="px-2 py-2">
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
              </th>}
              {isColVisible("dni") && <th className="px-2 py-2">
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
              </th>}
              {isColVisible("genero") && <th className="px-2 py-2">
                <div className="space-y-1">
                  <select
                    value={columnSearch.genero.value}
                    onChange={(e) => setColumnSearch((p) => ({ ...p, genero: { op: "equals", value: e.target.value } }))}
                    className="w-full px-2 py-1 rounded-md border border-border bg-white text-xs"
                  >
                    <option value="">{t("common.all")}</option>
                    {genderRawOptions.map((opt) => (
                      <option key={opt} value={opt}>{generoCodeLabel(opt) || opt}</option>
                    ))}
                  </select>
                </div>
              </th>}
              {isColVisible("fechaNacimiento") && <th className="px-2 py-2">
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
              {isColVisible("fechaFallecimiento") && <th className="px-2 py-2">
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
              {isColVisible("poblacion") && <th className="px-2 py-2">
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
              {isColVisible("provincia") && <th className="px-2 py-2">
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
              {isColVisible("telefono") && <th className="px-2 py-2">
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
              {isColVisible("fechaAlta") && <th className="px-2 py-2">
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
                    <option value="">{t("common.all")}</option>
                    <option value="activo">{t("socios.form.status.active")}</option>
                    <option value="solicitante">{t("socios.form.status.solicitante")}</option>
                    <option value="pendiente_datos">{t("socios.form.status.pendiente_datos")}</option>
                    <option value="rechazado">{t("socios.form.status.rechazado")}</option>
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
                {isColVisible("apellidos") && <td className="px-4 py-3 text-muted-foreground">{s.apellidos || "-"}</td>}
                {isColVisible("dni") && <td className="px-4 py-3 text-muted-foreground">{s.dni || "-"}</td>}
                {isColVisible("genero") && (
                  <td className="px-4 py-3 text-muted-foreground">
                    {generoCodeLabel(normalizeGeneroRawToken(s.genero)) || "-"}
                  </td>
                )}
                {isColVisible("fechaNacimiento") && <td className="px-4 py-3 text-muted-foreground">{s.fechaNacimiento || "-"}</td>}
                {isColVisible("fechaFallecimiento") && <td className="px-4 py-3 text-muted-foreground">{s.fechaFallecimiento || "-"}</td>}
                {isColVisible("poblacion") && <td className="px-4 py-3 text-muted-foreground">{s.poblacion || "-"}</td>}
                {isColVisible("provincia") && <td className="px-4 py-3 text-muted-foreground">{s.provincia || "-"}</td>}
                {isColVisible("telefono") && <td className="px-4 py-3 text-muted-foreground">{s.telefono || "-"}</td>}
                {isColVisible("fechaAlta") && <td className="px-4 py-3 text-muted-foreground">{s.fechaAlta || "-"}</td>}
                <td className="px-4 py-3">
                  {(() => {
                    const normalizedEstado = normalizeEstadoValue(s.estado);
                    return (
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      normalizedEstado === "activo"
                        ? "bg-green-100 text-green-700"
                        : normalizedEstado === "solicitante"
                          ? "bg-blue-100 text-blue-700"
                          : normalizedEstado === "pendiente_datos"
                            ? "bg-amber-100 text-amber-900"
                            : normalizedEstado === "rechazado"
                              ? "bg-red-100 text-red-700"
                              : normalizedEstado === "baja"
                                ? "bg-red-100 text-red-600"
                                : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {normalizedEstado === "activo"
                      ? t("socios.form.status.active")
                      : normalizedEstado === "solicitante"
                        ? t("socios.form.status.solicitante")
                        : normalizedEstado === "pendiente_datos"
                          ? t("socios.form.status.pendiente_datos")
                          : normalizedEstado === "rechazado"
                            ? t("socios.form.status.rechazado")
                            : normalizedEstado === "baja"
                              ? t("socios.form.status.baja")
                              : String(s.estado ?? "-")}
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
          {`${t("common.gender")}: ${generoCodeLabel("M")}: ${genderRawStats.m} · ${generoCodeLabel("F")}: ${genderRawStats.f} · ${generoCodeLabel("N")}: ${genderRawStats.n} · ?: ${genderRawStats.other}`}
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
