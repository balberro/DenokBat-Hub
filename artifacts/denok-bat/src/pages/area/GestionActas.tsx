import { useCallback, useEffect, useState } from "react";
import { useStore, getUserRoles } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  PenLine,
  FolderPlus,
  FolderCog,
  Trash2,
  RotateCw,
  Printer,
  Mail,
  X,
  FileText,
  AlertTriangle,
  Download,
  Save,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Acta = {
  id: number;
  numero: number | null;
  convocatoria_id: number | null;
  titulo: string;
  fecha: string | null;
  estado: string;
  asistentes: string | null;
  resumen: string | null;
  observaciones: string | null;
  pdf_url?: string | null;
  pdf_filename?: string | null;
  pdf_anyo_mes?: string | null;
  pdf_size?: number | null;
  pdf_subido_en?: string | null;
  convocatoria?: {
    id: number;
    numero: number | null;
    titulo: string;
    tipo: string;
    fecha: string | null;
    hora: string | null;
    lugar: string | null;
  } | null;
};

type DuplicadoMes = {
  id: number;
  numero: number | null;
  titulo: string;
  fecha: string | null;
  pdf_filename: string | null;
  pdf_url: string | null;
};

type Punto = {
  id: number;
  orden: number;
  propuesta_id: number | null;
  titulo: string | null;
  descripcion: string | null;
  acuerdo: string | null;
  resultado_propuesta: string | null;
  expediente_accion: string | null;
  expediente_id: number | null;
  notas: string | null;
  propuesta: {
    id: number;
    denominacion: string;
    descripcion: string;
    estado_buzon: string;
    resultado: string | null;
    expediente_id: number | null;
  } | null;
};

type ConvocatoriaDisponible = {
  id: number;
  numero: number | null;
  titulo: string;
  fecha: string | null;
  hora: string | null;
  lugar: string | null;
  estado: string;
};

type ConvocatoriaPuntoPreview = {
  id: number;
  orden: number;
  titulo: string | null;
  descripcion: string | null;
  propuesta_id: number | null;
  propuesta: { id: number; denominacion: string; descripcion: string } | null;
};

const ESTADOS = ["borrador", "completa", "aceptada"] as const;
const RESULTADOS = ["", "rechazada", "mas_aportaciones", "expediente_abierto", "expediente_cerrado"] as const;
const EXP_ACCIONES = ["", "abrir", "continuar", "cerrar"] as const;
const TIPOLOGIAS = ["sugerencias", "eventos", "actividades", "administracion", "subvenciones"] as const;
const ACCION_ESTADOS = ["pendiente", "hecha", "cancelada"] as const;

type Usuario = { id: number; nombre: string | null; username: string | null; email: string | null };
type ExpedienteResumen = {
  id: number;
  numero: number | null;
  denominacion: string;
  estado: string;
};
type AccionExistente = {
  id: number;
  expediente_id: number;
  descripcion: string;
  responsable_user_id: number | null;
  responsable_nombre: string | null;
  responsable_username: string | null;
  estado: string;
  plazo: string | null;
  observaciones: string | null;
};
type AccionDraft = {
  key: string;
  descripcion: string;
  responsable_user_id: string;
  plazo: string;
  observaciones: string;
};
type AccionEdit = {
  id: number;
  descripcion: string;
  responsable_user_id: string;
  plazo: string;
  observaciones: string;
  estado: string;
  toDelete: boolean;
};

const draftAccion = (): AccionDraft => ({
  key: `n_${Math.random().toString(36).slice(2)}`,
  descripcion: "",
  responsable_user_id: "",
  plazo: "",
  observaciones: "",
});

export default function GestionActas() {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const { t } = useTranslation();

  const roles = user ? getUserRoles(user) : [];
  const puedeEscribir = roles.includes("contable");
  // El contable tiene acceso total a todas las actas (acceso desde
  // Documentación → Actas); el directivo arranca filtrado por "completa".
  const esContable = roles.includes("contable");

  const [items, setItems] = useState<Acta[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState(() => (esContable ? "" : "completa"));
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<{ acta: Acta; puntos: Punto[] } | null>(null);
  const [convocatorias, setConvocatorias] = useState<ConvocatoriaDisponible[]>([]);
  const [creando, setCreando] = useState(false);
  const [convocatoriaId, setConvocatoriaId] = useState("");
  // Estado con el que se creará el acta: borrador o completa.
  const [estadoInicial, setEstadoInicial] = useState<"borrador" | "completa">("borrador");
  // Vista previa del orden del día de la convocatoria seleccionada al crear el acta.
  const [previewPuntos, setPreviewPuntos] = useState<ConvocatoriaPuntoPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Borradores de decisión por punto, indexados por id de db_convocatoria_puntos.
  type PuntoOverride = {
    acuerdo: string;
    resultado_propuesta: string;
    expediente_accion: string;
    expediente_id: string;
    notas: string;
  };
  const [previewOverrides, setPreviewOverrides] = useState<Record<number, PuntoOverride>>({});
  const [headerForm, setHeaderForm] = useState({
    titulo: "",
    fecha: "",
    asistentes: "",
    resumen: "",
    observaciones: "",
  });
  const [editandoCabecera, setEditandoCabecera] = useState(false);
  // Estado local por punto, autoguardado al hacer blur en cada campo.
  type PuntoFormState = {
    acuerdo: string;
    resultado_propuesta: string;
    expediente_accion: string;
    expediente_id: string;
    notas: string;
  };
  const [puntoForms, setPuntoForms] = useState<Record<number, PuntoFormState>>({});
  // Guardar lo último persistido para saber si un campo cambió antes de PUT.
  const [puntoFormsLast, setPuntoFormsLast] = useState<Record<number, PuntoFormState>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosLoaded, setUsuariosLoaded] = useState(false);
  const [expedientesEnCurso, setExpedientesEnCurso] = useState<ExpedienteResumen[]>([]);
  const [emailModal, setEmailModal] = useState<{
    open: boolean;
    junta: Array<{
      id: number;
      nombre: string | null;
      username: string | null;
      email: string;
      rol_destacado: string;
    }>;
    socios: Array<{
      id: number;
      nombre: string | null;
      username: string | null;
      email: string;
      roles: string[];
    }>;
    seleccionados: Record<number, boolean>;
    busqueda: string;
    emailsLibres: string;
    asunto: string;
    mensaje: string;
    loadingJunta: boolean;
    loadingSocios: boolean;
    enviando: boolean;
    resultMsg: string | null;
  }>({
    open: false,
    junta: [],
    socios: [],
    seleccionados: {},
    busqueda: "",
    emailsLibres: "",
    asunto: "",
    mensaje: "",
    loadingJunta: false,
    loadingSocios: false,
    enviando: false,
    resultMsg: null,
  });
  const [expPanelPunto, setExpPanelPunto] = useState<{
    puntoId: number;
    mode: "abrir" | "continuar";
    denominacion: string;
    descripcion: string;
    tipologia: string;
    observaciones: string;
    notas: string;
    acciones: AccionDraft[];
    expedienteId: string;
    accionesExistentes: AccionEdit[];
    accionesNuevas: AccionDraft[];
  } | null>(null);

  const labelEstado = (estado: string) => t(`actas.estado.${estado}`);

  /**
   * Compone un mensaje de error legible a partir de la respuesta del backend.
   * Si es un error de esquema, incluye el detalle, la causa y el SQL a ejecutar.
   */
  const mensajeError = (d: unknown): string => {
    const data = (d ?? {}) as Record<string, unknown>;
    const lineas = [String(data.error ?? t("common.error"))];
    if (data.detalle) lineas.push(String(data.detalle));
    if (data.causa && data.causa !== data.detalle) lineas.push(`Causa: ${String(data.causa)}`);
    if (data.solucion_sql) lineas.push(`\n${String(data.solucion_sql)}`);
    return lineas.join("\n");
  };

  const labelResultado = (resultado: string) =>
    resultado ? t(`actas.resultado.${resultado}`) : t("actas.resultado.sin_resultado");
  const labelAccion = (accion: string) =>
    accion ? t(`actas.expediente_accion.${accion}`) : t("actas.expediente_accion.sin_accion");

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (estadoFiltro) q.set("estado", estadoFiltro);
      const r = await fetch(`${API_BASE}/api/admin/actas?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setItems(d.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, estadoFiltro]);

  const loadConvocatorias = useCallback(async () => {
    if (!token) return;
    const r = await fetch(`${API_BASE}/api/admin/actas/convocatorias-disponibles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (r.ok) setConvocatorias(d.items ?? []);
  }, [token]);

  const loadPreviewPuntos = useCallback(
    async (convId: string) => {
      if (!token) return;
      if (!convId) {
        setPreviewPuntos([]);
        setPreviewOverrides({});
        return;
      }
      setPreviewLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/admin/convocatorias/${convId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (r.ok) {
          const puntos = (d.puntos as ConvocatoriaPuntoPreview[]) ?? [];
          setPreviewPuntos(puntos);
          const map: Record<number, PuntoOverride> = {};
          for (const p of puntos) {
            map[p.id] = {
              acuerdo: "",
              resultado_propuesta: "",
              expediente_accion: "",
              expediente_id: "",
              notas: "",
            };
          }
          setPreviewOverrides(map);
        } else {
          setPreviewPuntos([]);
          setPreviewOverrides({});
        }
      } catch {
        setPreviewPuntos([]);
        setPreviewOverrides({});
      } finally {
        setPreviewLoading(false);
      }
    },
    [token],
  );

  function actualizarOverride(cpId: number, patch: Partial<PuntoOverride>) {
    setPreviewOverrides((p) => ({
      ...p,
      [cpId]: {
        ...(p[cpId] ?? {
          acuerdo: "",
          resultado_propuesta: "",
          expediente_accion: "",
          expediente_id: "",
          notas: "",
        }),
        ...patch,
      },
    }));
  }

  const loadDetalle = useCallback(
    async (id: number) => {
      if (!token) return;
      setSelectedId(id);
      setMsg(null);
      setEditandoCabecera(false);
      const r = await fetch(`${API_BASE}/api/admin/actas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) {
        setDetalle(null);
        setMsg(mensajeError(d));
        return;
      }
      setDetalle(d);
      const a = d.acta as Acta;
      setHeaderForm({
        titulo: a.titulo ?? "",
        fecha: a.fecha ?? "",
        asistentes: a.asistentes ?? "",
        resumen: a.resumen ?? "",
        observaciones: a.observaciones ?? "",
      });
      const map: Record<number, PuntoFormState> = {};
      for (const p of (d.puntos as Punto[]) ?? []) {
        map[p.id] = {
          acuerdo: p.acuerdo ?? "",
          resultado_propuesta: p.resultado_propuesta ?? "",
          expediente_accion: p.expediente_accion ?? "",
          expediente_id: p.expediente_id != null ? String(p.expediente_id) : "",
          notas: p.notas ?? "",
        };
      }
      setPuntoForms(map);
      setPuntoFormsLast(map);
    },
    [token, t],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (creando) void loadConvocatorias();
  }, [creando, loadConvocatorias]);

  async function crearActa() {
    if (!token || !convocatoriaId) return;
    setSaving(true);
    setMsg(null);
    try {
      // Solo enviamos overrides con algún cambio para no sobreescribir con vacíos.
      const overridesPayload = Object.entries(previewOverrides)
        .map(([cpId, ov]) => {
          const data: Record<string, unknown> = {
            convocatoria_punto_id: Number(cpId),
          };
          if (ov.acuerdo.trim()) data.acuerdo = ov.acuerdo;
          if (ov.resultado_propuesta) data.resultado_propuesta = ov.resultado_propuesta;
          if (ov.expediente_accion) data.expediente_accion = ov.expediente_accion;
          if (ov.expediente_id.trim()) data.expediente_id = ov.expediente_id;
          if (ov.notas.trim()) data.notas = ov.notas;
          return data;
        })
        .filter((d) => Object.keys(d).length > 1);
      const r = await fetch(`${API_BASE}/api/admin/actas/desde-convocatoria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          convocatoria_id: convocatoriaId,
          estado: estadoInicial,
          ...headerForm,
          puntos_overrides: overridesPayload,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(mensajeError(d));
        return;
      }
      setMsg(
        estadoInicial === "completa" ? t("actas.msg.completa") : t("actas.msg.creada"),
      );
      setCreando(false);
      setConvocatoriaId("");
      setPreviewPuntos([]);
      setPreviewOverrides({});
      setEstadoInicial("borrador");
      setHeaderForm({ titulo: "", fecha: "", asistentes: "", resumen: "", observaciones: "" });
      await loadList();
      const id = Number(d.acta?.id);
      if (Number.isFinite(id)) await loadDetalle(id);
    } catch {
      setMsg(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  }

  async function guardarCabecera() {
    if (!token || !detalle) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/actas/${detalle.acta.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...headerForm, estado: estadoInicial }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(mensajeError(d));
        return;
      }
      setEditandoCabecera(false);
      await loadList();
      await loadDetalle(detalle.acta.id);
    } catch {
      setMsg(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  }

  async function guardarPunto(puntoId: number) {
    if (!token || !detalle) return;
    const form = puntoForms[puntoId];
    const last = puntoFormsLast[puntoId];
    if (!form) return;
    // Evitar PUTs innecesarios.
    if (
      last &&
      last.acuerdo === form.acuerdo &&
      last.resultado_propuesta === form.resultado_propuesta &&
      last.expediente_accion === form.expediente_accion &&
      last.expediente_id === form.expediente_id &&
      last.notas === form.notas
    ) {
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/actas/${detalle.acta.id}/puntos/${puntoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          expediente_id: form.expediente_id || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setPuntoFormsLast((p) => ({ ...p, [puntoId]: form }));
    } catch {
      setMsg(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  }

  function actualizarPunto(puntoId: number, patch: Partial<PuntoFormState>) {
    setPuntoForms((p) => ({
      ...p,
      [puntoId]: { ...(p[puntoId] ?? {
        acuerdo: "",
        resultado_propuesta: "",
        expediente_accion: "",
        expediente_id: "",
        notas: "",
      }), ...patch },
    }));
  }

  const ensureUsuarios = useCallback(async () => {
    if (!token || usuariosLoaded) return;
    try {
      const r = await fetch(`${API_BASE}/api/admin/expedientes/usuarios-seleccionables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setUsuarios((d.items as Usuario[]) ?? []);
      setUsuariosLoaded(true);
    } catch {
      setUsuariosLoaded(true);
    }
  }, [token, usuariosLoaded]);

  const loadExpedientesEnCurso = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE}/api/admin/expedientes?estado=en_curso`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) setExpedientesEnCurso((d.items as ExpedienteResumen[]) ?? []);
    } catch {
      // ignorar
    }
  }, [token]);

  const loadAccionesExpediente = useCallback(
    async (expedienteId: number): Promise<AccionEdit[]> => {
      if (!token) return [];
      const r = await fetch(`${API_BASE}/api/admin/expedientes/${expedienteId}/acciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) return [];
      const items = (d.items as AccionExistente[]) ?? [];
      return items.map((a) => ({
        id: a.id,
        descripcion: a.descripcion,
        responsable_user_id: a.responsable_user_id != null ? String(a.responsable_user_id) : "",
        plazo: a.plazo ? String(a.plazo).slice(0, 10) : "",
        observaciones: a.observaciones ?? "",
        estado: a.estado,
        toDelete: false,
      }));
    },
    [token],
  );

  async function abrirPanelAbrir(p: Punto) {
    await ensureUsuarios();
    setExpPanelPunto({
      puntoId: p.id,
      mode: "abrir",
      denominacion: p.titulo ?? p.propuesta?.denominacion ?? "",
      descripcion: p.descripcion ?? p.propuesta?.descripcion ?? "",
      tipologia: "sugerencias",
      observaciones: "",
      notas: p.acuerdo ?? "",
      acciones: [draftAccion()],
      expedienteId: "",
      accionesExistentes: [],
      accionesNuevas: [],
    });
  }

  async function abrirPanelContinuar(p: Punto) {
    await ensureUsuarios();
    await loadExpedientesEnCurso();
    let acciones: AccionEdit[] = [];
    const expIdInicial = p.expediente_id != null ? String(p.expediente_id) : "";
    if (p.expediente_id != null) {
      acciones = await loadAccionesExpediente(p.expediente_id);
    }
    setExpPanelPunto({
      puntoId: p.id,
      mode: "continuar",
      denominacion: "",
      descripcion: "",
      tipologia: "sugerencias",
      observaciones: "",
      notas: p.acuerdo ?? "",
      acciones: [],
      expedienteId: expIdInicial,
      accionesExistentes: acciones,
      accionesNuevas: [],
    });
  }

  async function cambiarExpedienteContinuar(expedienteId: string) {
    setExpPanelPunto((p) => (p ? { ...p, expedienteId } : p));
    const expId = parseInt(expedienteId, 10);
    if (!Number.isFinite(expId)) {
      setExpPanelPunto((p) => (p ? { ...p, accionesExistentes: [] } : p));
      return;
    }
    const acciones = await loadAccionesExpediente(expId);
    setExpPanelPunto((p) => (p ? { ...p, accionesExistentes: acciones } : p));
  }

  async function guardarPanelExpediente() {
    if (!token || !detalle || !expPanelPunto) return;
    setSaving(true);
    setMsg(null);
    try {
      if (expPanelPunto.mode === "abrir") {
        const acciones = expPanelPunto.acciones
          .filter((a) => a.descripcion.trim().length >= 2)
          .map((a) => ({
            descripcion: a.descripcion.trim(),
            responsable_user_id: a.responsable_user_id || null,
            plazo: a.plazo || null,
            observaciones: a.observaciones.trim() || null,
          }));
        if (acciones.length < 1) {
          setMsg(t("actas.expediente.error_min_accion"));
          return;
        }
        const r = await fetch(
          `${API_BASE}/api/admin/actas/${detalle.acta.id}/puntos/${expPanelPunto.puntoId}/abrir-expediente`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              denominacion: expPanelPunto.denominacion,
              descripcion: expPanelPunto.descripcion,
              tipologia: expPanelPunto.tipologia,
              observaciones: expPanelPunto.observaciones || undefined,
              notas: expPanelPunto.notas || undefined,
              acciones,
            }),
          },
        );
        const d = await r.json();
        if (!r.ok) {
          setMsg(String(d?.error ?? t("common.error")));
          return;
        }
        setMsg(t("actas.expediente.msg_abierto"));
      } else {
        const expedienteId = parseInt(expPanelPunto.expedienteId, 10);
        if (!Number.isFinite(expedienteId)) {
          setMsg(t("actas.expediente.error_seleccionar_expediente"));
          return;
        }
        const acciones_modificadas = expPanelPunto.accionesExistentes
          .filter((a) => !a.toDelete)
          .map((a) => ({
            id: a.id,
            descripcion: a.descripcion.trim(),
            responsable_user_id: a.responsable_user_id || null,
            plazo: a.plazo || null,
            observaciones: a.observaciones.trim() || null,
            estado: a.estado,
          }));
        const acciones_borradas = expPanelPunto.accionesExistentes
          .filter((a) => a.toDelete)
          .map((a) => a.id);
        const acciones_nuevas = expPanelPunto.accionesNuevas
          .filter((a) => a.descripcion.trim().length >= 2)
          .map((a) => ({
            descripcion: a.descripcion.trim(),
            responsable_user_id: a.responsable_user_id || null,
            plazo: a.plazo || null,
            observaciones: a.observaciones.trim() || null,
          }));
        const r = await fetch(
          `${API_BASE}/api/admin/actas/${detalle.acta.id}/puntos/${expPanelPunto.puntoId}/continuar-expediente`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              expediente_id: expedienteId,
              notas: expPanelPunto.notas || undefined,
              observaciones: expPanelPunto.observaciones || undefined,
              acciones_modificadas,
              acciones_borradas,
              acciones_nuevas,
            }),
          },
        );
        const d = await r.json();
        if (!r.ok) {
          setMsg(String(d?.error ?? t("common.error")));
          return;
        }
        setMsg(t("actas.expediente.msg_continuado"));
      }
      setExpPanelPunto(null);
      await loadDetalle(detalle.acta.id);
    } catch {
      setMsg(t("common.network_error"));
    } finally {
      setSaving(false);
    }
  }

  function abrirImpresion(actaId: number) {
    window.open(`${API_BASE}/actas/${actaId}/imprimir`, "_blank");
  }

  async function abrirEmailModal() {
    if (!token || !detalle) return;
    const asuntoDefault = `Acta ${detalle.acta.numero ?? `#${detalle.acta.id}`} — ${detalle.acta.titulo ?? ""}`.trim();
    setEmailModal({
      open: true,
      junta: [],
      socios: [],
      seleccionados: {},
      busqueda: "",
      emailsLibres: "",
      asunto: asuntoDefault,
      mensaje: "",
      loadingJunta: true,
      loadingSocios: false,
      enviando: false,
      resultMsg: null,
    });
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/actas/${detalle.acta.id}/destinatarios-junta`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const d = await r.json();
      if (r.ok) {
        const items = (d.items as { id: number }[]) ?? [];
        const seleccion: Record<number, boolean> = {};
        items.forEach((u) => {
          seleccion[u.id] = true;
        });
        setEmailModal((p) => ({
          ...p,
          junta: items as typeof p.junta,
          seleccionados: seleccion,
          loadingJunta: false,
        }));
      } else {
        setEmailModal((p) => ({ ...p, loadingJunta: false }));
      }
    } catch {
      setEmailModal((p) => ({ ...p, loadingJunta: false }));
    }
  }

  async function buscarSocios(q: string) {
    if (!token || !detalle) return;
    setEmailModal((p) => ({ ...p, busqueda: q, loadingSocios: true }));
    try {
      const url = `${API_BASE}/api/admin/actas/${detalle.acta.id}/buscar-socios?q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (r.ok) {
        setEmailModal((p) => ({
          ...p,
          socios: (d.items as typeof p.socios) ?? [],
          loadingSocios: false,
        }));
      } else {
        setEmailModal((p) => ({ ...p, loadingSocios: false }));
      }
    } catch {
      setEmailModal((p) => ({ ...p, loadingSocios: false }));
    }
  }

  async function enviarEmail() {
    if (!token || !detalle) return;
    setEmailModal((p) => ({ ...p, enviando: true, resultMsg: null }));
    const ids = Object.entries(emailModal.seleccionados)
      .filter(([, v]) => v)
      .map(([k]) => parseInt(k, 10))
      .filter((x) => Number.isFinite(x));
    const emails = emailModal.emailsLibres
      .split(/[,;\s]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    if (ids.length === 0 && emails.length === 0) {
      setEmailModal((p) => ({
        ...p,
        enviando: false,
        resultMsg: t("actas.email.error_sin_destinatarios"),
      }));
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/api/admin/actas/${detalle.acta.id}/enviar-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          asunto: emailModal.asunto,
          mensaje: emailModal.mensaje,
          destinatarios_user_ids: ids,
          destinatarios_emails: emails,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setEmailModal((p) => ({
          ...p,
          enviando: false,
          resultMsg: String(d?.error ?? t("common.error")),
        }));
        return;
      }
      setEmailModal((p) => ({
        ...p,
        enviando: false,
        resultMsg: d.simulado
          ? t("actas.email.ok_simulado").replace("{n}", String(d.total))
          : t("actas.email.ok").replace("{n}", String(d.total)),
      }));
    } catch {
      setEmailModal((p) => ({
        ...p,
        enviando: false,
        resultMsg: t("common.network_error"),
      }));
    }
  }

  async function cambiarEstado(accion: "completar" | "firmar") {
    if (!token || !detalle) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/actas/${detalle.acta.id}/${accion}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(accion === "completar" ? t("actas.msg.completa") : t("actas.msg.firmada"));
      await loadList();
      await loadDetalle(detalle.acta.id);
    } finally {
      setSaving(false);
    }
  }

  // ------------ Firma con subida de PDF ------------
  type FirmaModalState = {
    open: boolean;
    // Acta destino del PDF firmado. Se elige dentro del propio modal.
    selectedActaId: number | null;
    // Modo de archivo: a un acta existente o elaborando un acta de otro año-mes.
    modo: "existente" | "otro";
    // Listado de actas disponibles para archivar el PDF firmado.
    actas: Acta[];
    loadingActas: boolean;
    pdfDataUrl: string;
    pdfName: string;
    pdfSize: number;
    duplicados: DuplicadoMes[];
    loadingDuplicados: boolean;
    anyoMes: string;
    anyoMesDefault: string;
    // Año-mes de archivo elegido por el usuario (formato YYYY-MM).
    anyoMesElegido: string;
    // Año-mes del acta a elaborar (modo "otro"), formato YYYY-MM.
    otroAnyoMes: string;
    enviando: boolean;
    errorPdf: string | null;
    resultMsg: string | null;
  };
  const [firmaModal, setFirmaModal] = useState<FirmaModalState>({
    open: false,
    selectedActaId: null,
    modo: "existente",
    actas: [],
    loadingActas: false,
    pdfDataUrl: "",
    pdfName: "",
    pdfSize: 0,
    duplicados: [],
    loadingDuplicados: false,
    anyoMes: "",
    anyoMesDefault: "",
    anyoMesElegido: "",
    otroAnyoMes: "",
    enviando: false,
    errorPdf: null,
    resultMsg: null,
  });

  // Recarga los duplicados del mes para un año-mes concreto (YYYY-MM).
  const cargarDuplicadosMes = useCallback(
    async (id: number, anyoMes: string) => {
      if (!token) return;
      setFirmaModal((p) => ({ ...p, loadingDuplicados: true }));
      try {
        const q = anyoMes ? `?anyo_mes=${encodeURIComponent(anyoMes)}` : "";
        const r = await fetch(
          `${API_BASE}/api/admin/actas/${id}/duplicados-mes${q}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const d = await r.json();
        if (r.ok) {
          setFirmaModal((p) => ({
            ...p,
            duplicados: (d.items as DuplicadoMes[]) ?? [],
            anyoMes: String(d.anyo_mes ?? anyoMes),
            loadingDuplicados: false,
          }));
        } else {
          setFirmaModal((p) => ({ ...p, loadingDuplicados: false }));
        }
      } catch {
        setFirmaModal((p) => ({ ...p, loadingDuplicados: false }));
      }
    },
    [token],
  );

  // Carga los duplicados del mes del acta elegida y actualiza año-mes por defecto.
  const cargarDuplicadosPorDefecto = useCallback(
    async (id: number) => {
      if (!token) return;
      setFirmaModal((p) => ({ ...p, loadingDuplicados: true }));
      try {
        const r = await fetch(
          `${API_BASE}/api/admin/actas/${id}/duplicados-mes`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const d = await r.json();
        if (r.ok) {
          const anyoMes = String(d.anyo_mes ?? "");
          setFirmaModal((p) => ({
            ...p,
            duplicados: (d.items as DuplicadoMes[]) ?? [],
            anyoMes,
            anyoMesDefault: anyoMes,
            anyoMesElegido: anyoMes,
            loadingDuplicados: false,
          }));
        } else {
          setFirmaModal((p) => ({ ...p, loadingDuplicados: false }));
        }
      } catch {
        setFirmaModal((p) => ({ ...p, loadingDuplicados: false }));
      }
    },
    [token],
  );

  // Abre el modal de subida de PDF firmado. Si hay un acta seleccionada se
  // preselecciona; si no, el usuario elige el acta destino dentro del modal.
  // El PDF firmado puede haberse elaborado dentro o fuera de la app, por lo
  // que no se exige que el acta esté en un estado concreto para subirlo.
  async function abrirFirmaModal() {
    if (!token) return;
    const preseleccion = detalle?.acta.id ?? null;
    setMsg(null);
    setFirmaModal({
      open: true,
      selectedActaId: preseleccion,
      modo: "existente",
      actas: [],
      loadingActas: true,
      pdfDataUrl: "",
      pdfName: "",
      pdfSize: 0,
      duplicados: [],
      loadingDuplicados: false,
      anyoMes: "",
      anyoMesDefault: "",
      anyoMesElegido: "",
      otroAnyoMes: "",
      enviando: false,
      errorPdf: null,
      resultMsg: null,
    });
    try {
      // Solo las actas completas pueden recibir el PDF firmado.
      const r = await fetch(`${API_BASE}/api/admin/actas?estado=completa`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      const lista = r.ok ? ((d.items as Acta[]) ?? []) : [];
      // Solo se puede archivar el PDF firmado en un acta COMPLETA (aún no
      // firmada). Se excluyen borrador y firmada, así como las actas de otro
      // año-mes (esas se gestionan con el modo "otro").
      const actaDetalle = detalle?.acta;
      let actasModal = lista.filter((a) => a.estado === "completa");
      // Si el acta abierta en el detalle es la preseleccionada y aún no está
      // en el listado (p. ej. el listado vino filtrado), se añade siempre que
      // sea "completa", que es el único destino válido.
      if (
        actaDetalle &&
        actaDetalle.estado === "completa" &&
        !actasModal.some((a) => a.id === actaDetalle.id)
      ) {
        actasModal = [actaDetalle, ...actasModal];
      }
      // La preselección solo es válida si el acta sigue en estado "completa".
      const preseleccionValida =
        preseleccion != null && actasModal.some((a) => a.id === preseleccion)
          ? preseleccion
          : null;
      setFirmaModal((p) => ({
        ...p,
        actas: actasModal,
        selectedActaId: preseleccionValida,
        loadingActas: false,
      }));
      // Si no había acta válida preseleccionada, elegir la primera disponible.
      let idDestino = preseleccionValida;
      if (idDestino == null && actasModal.length > 0) {
        idDestino = actasModal[0].id;
        setFirmaModal((p) => ({ ...p, selectedActaId: idDestino }));
      }
      if (idDestino != null) await cargarDuplicadosPorDefecto(idDestino);
    } catch {
      setFirmaModal((p) => ({ ...p, loadingActas: false }));
    }
  }

  // Cambia el acta destino dentro del modal y recarga sus duplicados del mes.
  async function cambiarActaDestino(id: number) {
    setFirmaModal((p) => ({
      ...p,
      selectedActaId: id,
      // Se reinicia el año-mes hasta conocer el del acta elegida.
      anyoMes: "",
      anyoMesDefault: "",
      anyoMesElegido: "",
      duplicados: [],
    }));
    await cargarDuplicadosPorDefecto(id);
  }

  function cerrarFirmaModal() {
    setFirmaModal((p) => ({ ...p, open: false }));
  }

  async function leerPdfASeleccionar(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFirmaModal((p) => ({
        ...p,
        errorPdf: t("actas.firma.error_no_pdf"),
        pdfDataUrl: "",
        pdfName: "",
        pdfSize: 0,
      }));
      return;
    }
    const MAX_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setFirmaModal((p) => ({
        ...p,
        errorPdf: t("actas.firma.error_tamano"),
        pdfDataUrl: "",
        pdfName: "",
        pdfSize: 0,
      }));
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setFirmaModal((p) => ({
      ...p,
      pdfDataUrl: dataUrl,
      pdfName: file.name,
      pdfSize: file.size,
      errorPdf: null,
    }));
  }

  async function confirmarFirma() {
    if (!token) return;
    const modoOtro = firmaModal.modo === "otro";
    const actaId = firmaModal.selectedActaId;
    if (!modoOtro && actaId == null) {
      setFirmaModal((p) => ({ ...p, errorPdf: t("actas.firma.error_sin_acta") }));
      return;
    }
    if (modoOtro && !firmaModal.otroAnyoMes) {
      setFirmaModal((p) => ({ ...p, errorPdf: t("actas.firma.error_requiere_anio_mes") }));
      return;
    }
    if (!firmaModal.pdfDataUrl) {
      setFirmaModal((p) => ({ ...p, errorPdf: t("actas.firma.error_sin_pdf") }));
      return;
    }
    setFirmaModal((p) => ({ ...p, enviando: true, resultMsg: null, errorPdf: null }));
    try {
      const url = modoOtro
        ? `${API_BASE}/api/admin/actas/firmar-otro-mes`
        : `${API_BASE}/api/admin/actas/${actaId}/firmar`;
      const payload = modoOtro
        ? {
            pdf_data_url: firmaModal.pdfDataUrl,
            anyo_mes: firmaModal.otroAnyoMes,
          }
        : {
            pdf_data_url: firmaModal.pdfDataUrl,
            anyo_mes: firmaModal.anyoMesElegido || undefined,
          };
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        // El backend puede devolver un error de esquema (503) con detalle
        // accionable: `detalle`, `causa` y `solucion_sql`.
        const lineas = [String(d?.error ?? t("common.error"))];
        if (d?.detalle) lineas.push(String(d.detalle));
        if (d?.causa && d.causa !== d.detalle) lineas.push(`Causa: ${String(d.causa)}`);
        if (d?.solucion_sql) lineas.push(`\n${String(d.solucion_sql)}`);
        setFirmaModal((p) => ({
          ...p,
          enviando: false,
          errorPdf: lineas.join("\n"),
        }));
        return;
      }
      const suffix = Number(d?.suffix ?? 0);
      const baseMsg = t("actas.msg.firmada");
      const okMsg =
        suffix > 1
          ? `${baseMsg} ${t("actas.firma.aviso_sufijo").replace("{n}", String(suffix))}`
          : baseMsg;
      setFirmaModal((p) => ({
        ...p,
        enviando: false,
        resultMsg: okMsg,
      }));
      setMsg(okMsg);
      await loadList();
      // Si el acta destino es la que está abierta en el detalle, recargarla.
      if (modoOtro) {
        const nuevaId = Number(d?.acta?.id);
        if (Number.isFinite(nuevaId)) await loadDetalle(nuevaId);
      } else if (selectedId === actaId) {
        await loadDetalle(actaId as number);
      }
    } catch {
      setFirmaModal((p) => ({
        ...p,
        enviando: false,
        errorPdf: t("common.network_error"),
      }));
    }
  }

  const acta = detalle?.acta;
  // Los puntos/decisiones solo se editan en borrador.
  const editable = puedeEscribir && acta?.estado === "borrador";
  // La cabecera (título, fecha, asistentes, resumen, observaciones) puede
  // editarse tanto en borrador como en completa. Las firmadas son inmutables.
  const puedeEditarCabecera =
    puedeEscribir && (acta?.estado === "borrador" || acta?.estado === "completa");
  // Puntos sin decisión completa (acuerdo + resultado si aplica).
  const puntosPendientes = (detalle?.puntos ?? []).filter((p) => {
    const form = puntoForms[p.id];
    if (!form) return true;
    if (!form.acuerdo.trim()) return true;
    if (p.propuesta_id != null && !form.resultado_propuesta) return true;
    return false;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {creando
                ? t("actas.title.nueva")
                : acta && editable
                  ? t("actas.title.editando")
                  : t("actas.title.listado")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("actas.intro")}</p>
          </div>
        </div>
        {puedeEscribir && !creando && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="gap-2"
              onClick={() => void abrirFirmaModal()}
              disabled={saving}
            >
              <PenLine className="w-4 h-4" />
              {t("actas.action.subir_pdf_firmada")}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => { window.location.href = "/admin/actas/firmadas"; }}
            >
              <FileText className="w-4 h-4" />
              {t("actas.firmadas.ver_firmadas")}
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                setCreando(true);
                setDetalle(null);
                setSelectedId(null);
              }}
            >
              <Plus className="w-4 h-4" />
              {t("actas.action.nueva")}
            </Button>
          </div>
        )}
      </div>

      {msg && (
        <p className="mb-4 text-sm text-muted-foreground bg-muted/40 rounded-xl px-4 py-2 whitespace-pre-wrap break-words">
          {msg}
        </p>
      )}

      {creando && puedeEscribir && (
        <ActaFormCard
          modo="crear"
          form={headerForm}
          onChange={setHeaderForm}
          t={t}
          saving={saving}
          titulo={t("actas.form.nueva_title")}
          guardarLabel={`${t("actas.form.guardar_como")} ${labelEstado(estadoInicial)}`}
          onGuardar={() => void crearActa()}
          onCancelar={() => {
            setCreando(false);
            setConvocatoriaId("");
            setPreviewPuntos([]);
            setPreviewOverrides({});
            setEstadoInicial("borrador");
          }}
          selectorConvocatoria={
            <select
              value={convocatoriaId}
              onChange={(e) => {
                const id = e.target.value;
                setConvocatoriaId(id);
                const c = convocatorias.find((row) => String(row.id) === id);
                if (c) {
                  setHeaderForm((p) => ({
                    ...p,
                    titulo: `Acta: ${c.titulo}`,
                    fecha: c.fecha ?? "",
                  }));
                }
                void loadPreviewPuntos(id);
              }}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background"
            >
              <option value="">{t("actas.form.select_convocatoria")}</option>
              {convocatorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero != null ? `#${c.numero} - ` : ""}
                  {c.titulo}
                  {c.fecha ? ` (${c.fecha})` : ""}
                </option>
              ))}
            </select>
          }
          selectorEstado={
            <div>
              <label className="block text-sm font-semibold mb-1 text-muted-foreground">
                {t("actas.form.estado_label")}
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="estado-inicial"
                    checked={estadoInicial === "borrador"}
                    onChange={() => setEstadoInicial("borrador")}
                  />
                  <span className="text-sm">{labelEstado("borrador")}</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="estado-inicial"
                    checked={estadoInicial === "completa"}
                    onChange={() => setEstadoInicial("completa")}
                  />
                  <span className="text-sm">{labelEstado("completa")}</span>
                </label>
              </div>
            </div>
          }
          slotPuntos={
            convocatoriaId ? (
              <div className="border border-border rounded-xl bg-muted/20 p-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  {t("actas.form.asuntos_tratados")}
                </h3>
                {previewLoading ? (
                  <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
                ) : previewPuntos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("actas.form.orden_del_dia_vacio")}
                  </p>
                ) : (
                  <ol className="space-y-3 text-sm">
                    {previewPuntos.map((p, idx) => {
                      const titulo =
                        p.titulo ??
                        p.propuesta?.denominacion ??
                        t("actas.puntos.sin_titulo");
                      const descripcion =
                        p.descripcion ?? p.propuesta?.descripcion ?? "";
                      const ov =
                        previewOverrides[p.id] ?? {
                          acuerdo: "",
                          resultado_propuesta: "",
                          expediente_accion: "",
                          expediente_id: "",
                          notas: "",
                        };
                      const tienePropuesta = p.propuesta_id != null;
                      return (
                        <li
                          key={p.id}
                          className="border border-border rounded-lg bg-white px-3 py-2"
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-foreground shrink-0">
                              {idx + 1}.
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">
                                {titulo}
                                {tienePropuesta && (
                                  <span className="ml-2 text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                                    {t("actas.puntos.propuesta")} #{p.propuesta_id}
                                  </span>
                                )}
                              </p>
                              {descripcion && (
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-0.5">
                                  {descripcion}
                                </p>
                              )}
                              <div className="mt-2 space-y-2">
                                <textarea
                                  value={ov.acuerdo}
                                  onChange={(e) =>
                                    actualizarOverride(p.id, {
                                      acuerdo: e.target.value,
                                    })
                                  }
                                  rows={2}
                                  placeholder={t("actas.field.acuerdo")}
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                />
                                <div className="grid sm:grid-cols-3 gap-2">
                                  <select
                                    value={ov.resultado_propuesta}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      actualizarOverride(p.id, {
                                        resultado_propuesta: v,
                                        expediente_accion:
                                          v === "expediente_abierto"
                                            ? ov.expediente_accion || "abrir"
                                            : ov.expediente_accion === "abrir"
                                              ? ""
                                              : ov.expediente_accion,
                                      });
                                    }}
                                    disabled={!tienePropuesta}
                                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm disabled:bg-muted/40"
                                  >
                                    {RESULTADOS.map((r) => (
                                      <option key={r} value={r}>
                                        {labelResultado(r)}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={ov.expediente_accion}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      actualizarOverride(p.id, {
                                        expediente_accion: v,
                                        resultado_propuesta:
                                          v === "abrir"
                                            ? "expediente_abierto"
                                            : ov.resultado_propuesta,
                                      });
                                    }}
                                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                  >
                                    {EXP_ACCIONES.map((a) => (
                                      <option key={a} value={a}>
                                        {labelAccion(a)}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    value={ov.expediente_id}
                                    onChange={(e) =>
                                      actualizarOverride(p.id, {
                                        expediente_id: e.target.value,
                                      })
                                    }
                                    placeholder={t("actas.field.expediente_id")}
                                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                  />
                                </div>
                                <textarea
                                  value={ov.notas}
                                  onChange={(e) =>
                                    actualizarOverride(p.id, {
                                      notas: e.target.value,
                                    })
                                  }
                                  rows={2}
                                  placeholder={t("actas.field.notas")}
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                />
                              </div>
                            </div>
        </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <p className="text-[11px] text-muted-foreground mt-2">
                  {t("actas.form.orden_del_dia_hint")}
                </p>
              </div>
            ) : null
          }
        />
      )}

      {emailModal.open && detalle && (
        <EmailActaModal
          modal={emailModal}
          setModal={setEmailModal}
          onBuscarSocios={(q) => void buscarSocios(q)}
          onEnviar={() => void enviarEmail()}
          t={t}
        />
      )}

      {firmaModal.open && (
        <FirmaActaModal
          modal={firmaModal}
          onChangeActa={(id) => void cambiarActaDestino(id)}
          onCambiarModo={(modo) =>
            setFirmaModal((p) => ({
              ...p,
              modo,
              duplicados: modo === "otro" ? [] : p.duplicados,
            }))
          }
          onCambiarOtroAnyoMes={(v) =>
            setFirmaModal((p) => ({ ...p, otroAnyoMes: v }))
          }
          onClose={cerrarFirmaModal}
          onPickFile={(file) => void leerPdfASeleccionar(file)}
          onCambiarAnyoMes={(v) => {
            setFirmaModal((p) => ({ ...p, anyoMesElegido: v }));
            if (firmaModal.selectedActaId != null) {
              void cargarDuplicadosMes(firmaModal.selectedActaId, v);
            }
          }}
          onResetAnyoMes={() => {
            setFirmaModal((p) => ({ ...p, anyoMesElegido: p.anyoMesDefault }));
            if (firmaModal.selectedActaId != null) {
              void cargarDuplicadosMes(firmaModal.selectedActaId, firmaModal.anyoMesDefault);
            }
          }}
          onConfirmar={() => void confirmarFirma()}
          t={t}
          apiBase={API_BASE}
        />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-sm"
          >
            <option value="">{t("actas.filter.todos_estados")}</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {labelEstado(e)}
              </option>
            ))}
          </select>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("actas.empty")}</p>
          ) : (
            <ul className="divide-y divide-border max-h-[520px] overflow-y-auto">
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => void loadDetalle(a.id)}
                    className={`w-full text-left px-3 py-3 hover:bg-muted/30 transition-colors ${
                      selectedId === a.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <p className="font-semibold text-foreground">
                      {a.numero != null ? `#${a.numero} - ` : ""}
                      {a.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {labelEstado(a.estado)}
                      {a.fecha ? ` - ${a.fecha}` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 min-h-[320px]">
          {!acta ? (
            <p className="text-sm text-muted-foreground">{t("actas.select_one")}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {acta.numero != null ? `${t("actas.numero")} ${acta.numero}` : `#${acta.id}`}
                  </h2>
                  <p className="text-sm font-medium text-foreground mt-1">{acta.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {labelEstado(acta.estado)}
                    {acta.fecha ? ` - ${acta.fecha}` : ""}
                  </p>
                  {acta.convocatoria && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("actas.field.convocatoria")}: {acta.convocatoria.titulo}
                    </p>
                  )}
                </div>
              </div>

              {/* Panel de flujo: borrador → completa → aceptada */}
              <div className="border border-border rounded-2xl bg-muted/20 p-3 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                  {(["borrador", "completa", "aceptada"] as const).map((st, idx) => {
                    const isActive = acta.estado === st;
                    const isDone =
                      (st === "borrador" && acta.estado !== "borrador") ||
                      (st === "completa" && acta.estado === "aceptada");
                    return (
                      <div key={st} className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : isDone
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-white border border-border text-muted-foreground"
                          }`}
                        >
                          {labelEstado(st)}
                        </span>
                        {idx < 2 && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>

                {acta.estado === "borrador" && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {puedeEscribir && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void cambiarEstado("completar")}
                        disabled={saving}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t("actas.action.pasar_a_completada")}
                      </Button>
                    )}
                    {puedeEditarCabecera && !editandoCabecera && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          setEstadoInicial("borrador");
                          setEditandoCabecera(true);
                        }}
                      >
                        <PenLine className="w-4 h-4" />
                        {t("common.edit")}
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground self-center">
                      {t("actas.flujo.borrador_hint")}
                    </p>
                  </div>
                )}

                {acta.estado === "completa" && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => abrirImpresion(acta.id)}
                    >
                      <Printer className="w-4 h-4" />
                      {t("actas.print.button")}
                    </Button>
                    {puedeEditarCabecera && !editandoCabecera && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          setEstadoInicial("completa");
                          setEditandoCabecera(true);
                        }}
                      >
                        <PenLine className="w-4 h-4" />
                        {t("common.edit")}
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("actas.flujo.completa_hint")}
                    </p>
                  </div>
                )}

                {acta.estado === "aceptada" && (
                  <div className="space-y-2">
                    <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-semibold">{t("actas.flujo.firmada_banner")}</span>
                      <span>· {t("actas.flujo.firmada_hint")}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {acta.pdf_url && (
                        <a
                          href={`${API_BASE}${acta.pdf_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={acta.pdf_filename ?? undefined}
                          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted/40"
                        >
                          <Download className="w-4 h-4" />
                          {t("actas.firma.descargar_pdf")}
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => abrirImpresion(acta.id)}
                      >
                        <Printer className="w-4 h-4" />
                        {t("actas.print.button")}
                      </Button>
                      {puedeEscribir && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => void abrirEmailModal()}
                        >
                          <Mail className="w-4 h-4" />
                          {t("actas.email.button")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {editandoCabecera && puedeEditarCabecera && (
                <ActaFormCard
                  modo="editar"
                  form={headerForm}
                  onChange={setHeaderForm}
                  t={t}
                  saving={saving}
                  titulo={t("actas.title.editando")}
                  guardarLabel={
                    acta.estado === "completa"
                      ? t("common.save")
                      : `${t("actas.form.guardar_como")} ${labelEstado(estadoInicial)}`
                  }
                  onGuardar={() => void guardarCabecera()}
                  onCancelar={() => setEditandoCabecera(false)}
                  selectorEstado={
                    acta.estado === "completa" ? (
                      // En actas completas el estado no se toca desde la
                      // cabecera (se gestiona con el flujo completar/firmar).
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-muted-foreground">
                          {t("actas.form.estado_label")}
                        </label>
                        <p className="text-sm">{labelEstado("completa")}</p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-muted-foreground">
                          {t("actas.form.estado_label")}
                        </label>
                        <div className="flex flex-wrap gap-4">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="estado-edicion"
                              checked={estadoInicial === "borrador"}
                              onChange={() => setEstadoInicial("borrador")}
                            />
                            <span className="text-sm">{labelEstado("borrador")}</span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="estado-edicion"
                              checked={estadoInicial === "completa"}
                              onChange={() => setEstadoInicial("completa")}
                            />
                            <span className="text-sm">{labelEstado("completa")}</span>
                          </label>
                        </div>
                </div>
                    )
                  }
                />
              )}

              {!editandoCabecera && (
                <div className="text-sm text-muted-foreground space-y-2">
                  {acta.asistentes && (
                    <p>
                      <span className="font-semibold">{t("actas.field.asistentes")}: </span>
                      {acta.asistentes}
                    </p>
                  )}
                  {acta.resumen && (
                    <p className="whitespace-pre-wrap">
                      <span className="font-semibold">{t("actas.field.resumen")}: </span>
                      {acta.resumen}
                    </p>
                  )}
                  {acta.observaciones && (
                    <p className="whitespace-pre-wrap">
                      <span className="font-semibold">{t("actas.field.observaciones")}: </span>
                      {acta.observaciones}
                    </p>
                  )}
                </div>
              )}

              <div>
                <h3 className="font-semibold text-sm mb-2">{t("actas.puntos.title")}</h3>
                {editable && puntosPendientes.length > 0 && (
                  <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2 text-xs">
                    <p className="font-semibold mb-1">
                      {t("actas.puntos.aviso_pendientes")} ({puntosPendientes.length})
                    </p>
                    <p>{t("actas.puntos.aviso_explicacion")}</p>
                  </div>
                )}
                {(detalle?.puntos ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("actas.puntos.empty")}</p>
                ) : (
                  <ol className="space-y-3">
                    {(detalle?.puntos ?? []).map((p, idx) => {
                      const form = puntoForms[p.id] ?? {
                        acuerdo: "",
                        resultado_propuesta: "",
                        expediente_accion: "",
                        expediente_id: "",
                        notas: "",
                      };
                      const tienePropuesta = p.propuesta_id != null;
                      const necesitaResultado = tienePropuesta && !form.resultado_propuesta;
                      const necesitaAcuerdo = !form.acuerdo.trim();
                      return (
                        <li key={p.id} className="border border-border rounded-xl px-3 py-3 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-foreground">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">
                                {p.titulo ?? p.propuesta?.denominacion ?? t("actas.puntos.sin_titulo")}
                                {p.propuesta && (
                                  <span className="ml-2 text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                                    {t("actas.puntos.propuesta")} #{p.propuesta.id}
                                  </span>
                                )}
                                {editable && (necesitaAcuerdo || necesitaResultado) && (
                                  <span className="ml-2 text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                    {t("actas.puntos.pendiente")}
                                  </span>
                                )}
                              </p>
                              {p.descripcion && (
                                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                                  {p.descripcion}
                                </p>
                              )}
                              {editable ? (
                                <div className="space-y-2 mt-3">
                                  <textarea
                                    value={form.acuerdo}
                                    onChange={(e) =>
                                      actualizarPunto(p.id, { acuerdo: e.target.value })
                                    }
                                    onBlur={() => void guardarPunto(p.id)}
                                    rows={3}
                                    placeholder={t("actas.field.acuerdo")}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                  />
                                  <div className="grid sm:grid-cols-3 gap-2">
                                    <select
                                      value={form.resultado_propuesta}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        actualizarPunto(p.id, {
                                          resultado_propuesta: v,
                                          expediente_accion:
                                            v === "expediente_abierto"
                                              ? form.expediente_accion || "abrir"
                                              : form.expediente_accion === "abrir"
                                                ? ""
                                                : form.expediente_accion,
                                        });
                                      }}
                                      onBlur={() => void guardarPunto(p.id)}
                                      disabled={!tienePropuesta}
                                      className="px-3 py-2 rounded-lg border border-border bg-background text-sm disabled:bg-muted/40"
                                    >
                                      {RESULTADOS.map((r) => (
                                        <option key={r} value={r}>
                                          {labelResultado(r)}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={form.expediente_accion}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        actualizarPunto(p.id, {
                                          expediente_accion: v,
                                          resultado_propuesta:
                                            v === "abrir"
                                              ? "expediente_abierto"
                                              : form.resultado_propuesta,
                                        });
                                      }}
                                      onBlur={() => void guardarPunto(p.id)}
                                      className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                    >
                                      {EXP_ACCIONES.map((a) => (
                                        <option key={a} value={a}>
                                          {labelAccion(a)}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      value={form.expediente_id}
                                      onChange={(e) =>
                                        actualizarPunto(p.id, { expediente_id: e.target.value })
                                      }
                                      onBlur={() => void guardarPunto(p.id)}
                                      placeholder={t("actas.field.expediente_id")}
                                      className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                    />
                                  </div>
                                  <textarea
                                    value={form.notas}
                                    onChange={(e) =>
                                      actualizarPunto(p.id, { notas: e.target.value })
                                    }
                                    onBlur={() => void guardarPunto(p.id)}
                                    rows={2}
                                    placeholder={t("actas.field.notas")}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                  />
                                </div>
                              ) : (
                                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                  {p.acuerdo && (
                                    <p className="whitespace-pre-wrap">
                                      <span className="font-semibold">
                                        {t("actas.field.acuerdo")}:{" "}
                                      </span>
                                      {p.acuerdo}
                                    </p>
                                  )}
                                  <p>
                                    {t("actas.field.resultado")}:{" "}
                                    {labelResultado(p.resultado_propuesta ?? "")}
                                    {" · "}
                                    {t("actas.field.expediente_accion")}:{" "}
                                    {labelAccion(p.expediente_accion ?? "")}
                                    {p.expediente_id != null ? ` #${p.expediente_id}` : ""}
                                  </p>
                                  {p.notas && <p className="italic">{p.notas}</p>}
                                </div>
                              )}
                              {/* Botón configurar expediente: abrir o continuar */}
                              {editable &&
                                (p.expediente_accion === "abrir" ||
                                  p.expediente_accion === "continuar") && (
                                  <div className="mt-3">
                                    {p.expediente_accion === "abrir" && p.expediente_id == null && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        onClick={() => void abrirPanelAbrir(p)}
                                        disabled={saving}
                                      >
                                        <FolderPlus className="w-4 h-4" />
                                        {t("actas.expediente.configurar_abrir")}
                                      </Button>
                                    )}
                                    {p.expediente_accion === "abrir" && p.expediente_id != null && (
                                      <p className="text-xs text-primary">
                                        {t("actas.expediente.abierto_ok")} #{p.expediente_id}
                                      </p>
                                    )}
                                    {p.expediente_accion === "continuar" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        onClick={() => void abrirPanelContinuar(p)}
                                        disabled={saving}
                                      >
                                        <FolderCog className="w-4 h-4" />
                                        {p.expediente_id != null
                                          ? t("actas.expediente.configurar_continuar_existente")
                                          : t("actas.expediente.configurar_continuar")}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              {expPanelPunto && expPanelPunto.puntoId === p.id && (
                                <ExpedientePanel
                                  panel={expPanelPunto}
                                  setPanel={setExpPanelPunto}
                                  usuarios={usuarios}
                                  expedientesEnCurso={expedientesEnCurso}
                                  saving={saving}
                                  onCambiarExpediente={(id) => void cambiarExpedienteContinuar(id)}
                                  onGuardar={() => void guardarPanelExpediente()}
                                  t={t}
                                />
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ExpPanelState = {
  puntoId: number;
  mode: "abrir" | "continuar";
  denominacion: string;
  descripcion: string;
  tipologia: string;
  observaciones: string;
  notas: string;
  acciones: AccionDraft[];
  expedienteId: string;
  accionesExistentes: AccionEdit[];
  accionesNuevas: AccionDraft[];
};

function ExpedientePanel({
  panel,
  setPanel,
  usuarios,
  expedientesEnCurso,
  saving,
  onCambiarExpediente,
  onGuardar,
  t,
}: {
  panel: ExpPanelState;
  setPanel: (
    v: ExpPanelState | null | ((p: ExpPanelState | null) => ExpPanelState | null),
  ) => void;
  usuarios: Usuario[];
  expedientesEnCurso: ExpedienteResumen[];
  saving: boolean;
  onCambiarExpediente: (id: string) => void;
  onGuardar: () => void;
  t: (key: string) => string;
}) {
  const nombre = (u: Usuario) =>
    u.nombre?.trim() || u.username?.trim() || u.email?.trim() || `Usuario #${u.id}`;
  const responsableSelect = (
    value: string,
    onChange: (v: string) => void,
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
    >
      <option value="">{t("actas.expediente.responsable_placeholder")}</option>
      {usuarios.map((u) => (
        <option key={u.id} value={u.id}>
          {nombre(u)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="mt-3 border border-primary/30 rounded-xl p-4 bg-primary/5 space-y-3">
      <h4 className="text-sm font-bold text-foreground">
        {panel.mode === "abrir"
          ? t("actas.expediente.titulo_abrir")
          : t("actas.expediente.titulo_continuar")}
      </h4>

      {panel.mode === "abrir" ? (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t("actas.expediente.denominacion")}
              </label>
              <input
                value={panel.denominacion}
                onChange={(e) => setPanel((p) => (p ? { ...p, denominacion: e.target.value } : p))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t("actas.expediente.tipologia")}
              </label>
              <select
                value={panel.tipologia}
                onChange={(e) => setPanel((p) => (p ? { ...p, tipologia: e.target.value } : p))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              >
                {TIPOLOGIAS.map((tp) => (
                  <option key={tp} value={tp}>
                    {t(`expedientes.tipologia.${tp}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t("actas.expediente.descripcion")}
            </label>
            <textarea
              value={panel.descripcion}
              onChange={(e) => setPanel((p) => (p ? { ...p, descripcion: e.target.value } : p))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t("actas.expediente.observaciones")}
            </label>
            <textarea
              value={panel.observaciones}
              onChange={(e) => setPanel((p) => (p ? { ...p, observaciones: e.target.value } : p))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t("actas.expediente.expediente_destino")}
            </label>
            <select
              value={panel.expedienteId}
              onChange={(e) => onCambiarExpediente(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">{t("actas.expediente.expediente_destino_placeholder")}</option>
              {expedientesEnCurso.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.numero != null ? `#${exp.numero} · ` : ""}
                  {exp.denominacion}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-semibold mb-1">
          {t("actas.expediente.notas_movimiento")}
        </label>
        <textarea
          value={panel.notas}
          onChange={(e) => setPanel((p) => (p ? { ...p, notas: e.target.value } : p))}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
        />
      </div>

      {/* Acciones existentes (solo en continuar) */}
      {panel.mode === "continuar" && panel.accionesExistentes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold">{t("actas.expediente.acciones_existentes")}</p>
          {panel.accionesExistentes.map((a, idx) => (
            <div
              key={a.id}
              className={`rounded-lg border p-3 text-sm space-y-2 ${
                a.toDelete ? "border-red-300 bg-red-50/40" : "border-border bg-background"
              }`}
            >
              <div className="grid sm:grid-cols-2 gap-2">
                <textarea
                  value={a.descripcion}
                  onChange={(e) =>
                    setPanel((p) => {
                      if (!p) return p;
                      const next = [...p.accionesExistentes];
                      next[idx] = { ...next[idx], descripcion: e.target.value };
                      return { ...p, accionesExistentes: next };
                    })
                  }
                  rows={2}
                  className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                />
                {responsableSelect(a.responsable_user_id, (v) =>
                  setPanel((p) => {
                    if (!p) return p;
                    const next = [...p.accionesExistentes];
                    next[idx] = { ...next[idx], responsable_user_id: v };
                    return { ...p, accionesExistentes: next };
                  }),
                )}
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <input
                  type="date"
                  value={a.plazo}
                  onChange={(e) =>
                    setPanel((p) => {
                      if (!p) return p;
                      const next = [...p.accionesExistentes];
                      next[idx] = { ...next[idx], plazo: e.target.value };
                      return { ...p, accionesExistentes: next };
                    })
                  }
                  className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                />
                <select
                  value={a.estado}
                  onChange={(e) =>
                    setPanel((p) => {
                      if (!p) return p;
                      const next = [...p.accionesExistentes];
                      next[idx] = { ...next[idx], estado: e.target.value };
                      return { ...p, accionesExistentes: next };
                    })
                  }
                  className="px-2 py-1.5 rounded border border-border bg-background text-xs"
                >
                  {ACCION_ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {t(`acciones.estado.${s}`)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setPanel((p) => {
                      if (!p) return p;
                      const next = [...p.accionesExistentes];
                      next[idx] = { ...next[idx], toDelete: !next[idx].toDelete };
                      return { ...p, accionesExistentes: next };
                    })
                  }
                  className={`px-2 py-1.5 rounded text-xs ${
                    a.toDelete
                      ? "bg-muted text-foreground"
                      : "bg-red-50 text-red-700 hover:bg-red-100"
                  }`}
                >
                  {a.toDelete ? (
                    <>
                      <RotateCw className="w-3 h-3 inline mr-1" />
                      {t("common.undo")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 inline mr-1" />
                      {t("common.delete")}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acciones nuevas / iniciales */}
      <div className="space-y-2">
        <p className="text-xs font-semibold">
          {panel.mode === "abrir"
            ? t("actas.expediente.acciones_iniciales")
            : t("actas.expediente.acciones_nuevas")}
        </p>
        {(panel.mode === "abrir" ? panel.acciones : panel.accionesNuevas).map((a, idx) => (
          <div key={a.key} className="rounded-lg border border-border p-3 text-sm space-y-2 bg-background">
            <div className="grid sm:grid-cols-2 gap-2">
              <textarea
                value={a.descripcion}
                onChange={(e) =>
                  setPanel((p) => {
                    if (!p) return p;
                    const list = panel.mode === "abrir" ? [...p.acciones] : [...p.accionesNuevas];
                    list[idx] = { ...list[idx], descripcion: e.target.value };
                    return panel.mode === "abrir"
                      ? { ...p, acciones: list }
                      : { ...p, accionesNuevas: list };
                  })
                }
                rows={2}
                placeholder={t("actas.expediente.accion_descripcion_ph")}
                className="px-2 py-1.5 rounded border border-border bg-background text-xs"
              />
              {responsableSelect(a.responsable_user_id, (v) =>
                setPanel((p) => {
                  if (!p) return p;
                  const list = panel.mode === "abrir" ? [...p.acciones] : [...p.accionesNuevas];
                  list[idx] = { ...list[idx], responsable_user_id: v };
                  return panel.mode === "abrir"
                    ? { ...p, acciones: list }
                    : { ...p, accionesNuevas: list };
                }),
              )}
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                type="date"
                value={a.plazo}
                onChange={(e) =>
                  setPanel((p) => {
                    if (!p) return p;
                    const list = panel.mode === "abrir" ? [...p.acciones] : [...p.accionesNuevas];
                    list[idx] = { ...list[idx], plazo: e.target.value };
                    return panel.mode === "abrir"
                      ? { ...p, acciones: list }
                      : { ...p, accionesNuevas: list };
                  })
                }
                className="px-2 py-1.5 rounded border border-border bg-background text-xs"
              />
              <input
                value={a.observaciones}
                onChange={(e) =>
                  setPanel((p) => {
                    if (!p) return p;
                    const list = panel.mode === "abrir" ? [...p.acciones] : [...p.accionesNuevas];
                    list[idx] = { ...list[idx], observaciones: e.target.value };
                    return panel.mode === "abrir"
                      ? { ...p, acciones: list }
                      : { ...p, accionesNuevas: list };
                  })
                }
                placeholder={t("actas.expediente.accion_observaciones_ph")}
                className="px-2 py-1.5 rounded border border-border bg-background text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  setPanel((p) => {
                    if (!p) return p;
                    const list = panel.mode === "abrir"
                      ? p.acciones.filter((_, i) => i !== idx)
                      : p.accionesNuevas.filter((_, i) => i !== idx);
                    return panel.mode === "abrir"
                      ? { ...p, acciones: list }
                      : { ...p, accionesNuevas: list };
                  })
                }
                className="px-2 py-1.5 rounded text-xs bg-muted hover:bg-muted/80"
              >
                <Trash2 className="w-3 h-3 inline mr-1" />
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            setPanel((p) => {
              if (!p) return p;
              return panel.mode === "abrir"
                ? { ...p, acciones: [...p.acciones, draftAccion()] }
                : { ...p, accionesNuevas: [...p.accionesNuevas, draftAccion()] };
            })
          }
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          {t("actas.expediente.accion_anadir")}
        </Button>
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <Button onClick={onGuardar} disabled={saving} className="gap-1.5">
          <Save className="w-4 h-4" />
          {saving ? t("common.saving") : t("common.save")}
        </Button>
        <Button variant="ghost" onClick={() => setPanel(null)}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

type EmailModalState = {
  open: boolean;
  junta: Array<{
    id: number;
    nombre: string | null;
    username: string | null;
    email: string;
    rol_destacado: string;
  }>;
  socios: Array<{
    id: number;
    nombre: string | null;
    username: string | null;
    email: string;
    roles: string[];
  }>;
  seleccionados: Record<number, boolean>;
  busqueda: string;
  emailsLibres: string;
  asunto: string;
  mensaje: string;
  loadingJunta: boolean;
  loadingSocios: boolean;
  enviando: boolean;
  resultMsg: string | null;
};

function EmailActaModal({
  modal,
  setModal,
  onBuscarSocios,
  onEnviar,
  t,
}: {
  modal: EmailModalState;
  setModal: (v: EmailModalState | ((p: EmailModalState) => EmailModalState)) => void;
  onBuscarSocios: (q: string) => void;
  onEnviar: () => void;
  t: (key: string) => string;
}) {
  const nombre = (u: { nombre: string | null; username: string | null }) =>
    u.nombre?.trim() || u.username?.trim() || "—";
  const totalSel = Object.values(modal.seleccionados).filter(Boolean).length;
  const emailsLibresCount = modal.emailsLibres
    .split(/[,;\s]+/)
    .filter((x) => x.trim().length > 0).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setModal((p) => ({ ...p, open: false }));
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            {t("actas.email.title")}
          </h3>
          <button
            type="button"
            onClick={() => setModal((p) => ({ ...p, open: false }))}
            className="p-1 rounded hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t("actas.email.asunto")}
            </label>
            <input
              value={modal.asunto}
              onChange={(e) => setModal((p) => ({ ...p, asunto: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              {t("actas.email.mensaje")}
            </label>
            <textarea
              value={modal.mensaje}
              onChange={(e) => setModal((p) => ({ ...p, mensaje: e.target.value }))}
              rows={3}
              placeholder={t("actas.email.mensaje_ph")}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>

          <div className="border border-border rounded-xl p-3 bg-muted/20">
            <p className="text-sm font-semibold mb-2">
              {t("actas.email.junta_label")} ({modal.junta.length})
            </p>
            {modal.loadingJunta ? (
              <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
            ) : modal.junta.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("actas.email.junta_vacia")}</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {modal.junta.map((u) => (
                  <li key={u.id} className="text-sm flex items-center gap-2">
                    <input
                      id={`junta-${u.id}`}
                      type="checkbox"
                      checked={!!modal.seleccionados[u.id]}
                      onChange={(e) =>
                        setModal((p) => ({
                          ...p,
                          seleccionados: { ...p.seleccionados, [u.id]: e.target.checked },
                        }))
                      }
                    />
                    <label htmlFor={`junta-${u.id}`} className="cursor-pointer flex-1">
                      <span className="font-medium">{nombre(u)}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        ({u.rol_destacado}) · {u.email}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border border-border rounded-xl p-3 space-y-2">
            <p className="text-sm font-semibold">{t("actas.email.socios_label")}</p>
            <input
              value={modal.busqueda}
              onChange={(e) => onBuscarSocios(e.target.value)}
              placeholder={t("actas.email.socios_buscar")}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
            {modal.loadingSocios ? (
              <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
            ) : modal.busqueda.trim().length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("actas.email.socios_hint")}</p>
            ) : modal.socios.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("actas.email.socios_sin_resultados")}</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {modal.socios.map((u) => (
                  <li key={u.id} className="text-sm flex items-center gap-2">
                    <input
                      id={`socio-${u.id}`}
                      type="checkbox"
                      checked={!!modal.seleccionados[u.id]}
                      onChange={(e) =>
                        setModal((p) => ({
                          ...p,
                          seleccionados: { ...p.seleccionados, [u.id]: e.target.checked },
                        }))
                      }
                    />
                    <label htmlFor={`socio-${u.id}`} className="cursor-pointer flex-1">
                      <span className="font-medium">{nombre(u)}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        {u.roles && u.roles.length > 0 ? `(${u.roles.join(",")}) · ` : ""}
                        {u.email}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              {t("actas.email.emails_libres")}
            </label>
            <textarea
              value={modal.emailsLibres}
              onChange={(e) => setModal((p) => ({ ...p, emailsLibres: e.target.value }))}
              rows={2}
              placeholder="ej1@correo.com, ej2@correo.com"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            {t("actas.email.total_destinatarios")}: <b>{totalSel + emailsLibresCount}</b>
          </div>

          {modal.resultMsg && (
            <p className="text-sm bg-muted/40 rounded-xl px-3 py-2">{modal.resultMsg}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="ghost" onClick={() => setModal((p) => ({ ...p, open: false }))}>
            {t("common.close")}
          </Button>
          <Button onClick={onEnviar} disabled={modal.enviando} className="gap-1.5">
            <Mail className="w-4 h-4" />
            {modal.enviando ? t("actas.email.enviando") : t("actas.email.enviar")}
          </Button>
        </div>
      </div>
    </div>
  );
}

type ActaFormValues = {
  titulo: string;
  fecha: string;
  asistentes: string;
  resumen: string;
  observaciones: string;
};

/**
 * Formulario único de acta, reutilizado por las tres pantallas de edición:
 *  - Crear acta nueva (desde convocatoria).
 *  - Editar acta en borrador.
 *  - Editar acta completa.
 *
 * `modo === "crear"` muestra el selector de convocatoria (slot) y la vista
 * previa de puntos (slot). `modo === "editar"` muestra los campos rellenos.
 * En ambos casos, el estado (borrador/completa) se elige con `selectorEstado`
 * o se muestra fijo con `estadoFijo`.
 */
function ActaFormCard({
  form,
  onChange,
  t,
  modo,
  saving,
  onGuardar,
  onCancelar,
  guardarLabel,
  titulo,
  selectorConvocatoria,
  slotPuntos,
  selectorEstado,
}: {
  form: ActaFormValues;
  onChange: (
    v: ActaFormValues | ((p: ActaFormValues) => ActaFormValues),
  ) => void;
  t: (key: string) => string;
  modo: "crear" | "editar";
  saving: boolean;
  onGuardar: () => void;
  onCancelar: () => void;
  guardarLabel: string;
  titulo: string;
  selectorConvocatoria?: React.ReactNode;
  slotPuntos?: React.ReactNode;
  selectorEstado?: React.ReactNode;
}) {
  const contenedor =
    modo === "crear"
      ? "bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4 mb-8"
      : "border border-border rounded-xl p-4 space-y-3 bg-muted/20";
  return (
    <div className={contenedor}>
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {selectorConvocatoria}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold mb-1 text-muted-foreground">
            {t("actas.field.titulo")}
          </label>
          <input
            value={form.titulo}
            onChange={(e) => onChange((p) => ({ ...p, titulo: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-muted-foreground">
            {t("actas.field.fecha")}
          </label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => onChange((p) => ({ ...p, fecha: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 text-muted-foreground">
          {t("actas.field.asistentes")}
        </label>
        <textarea
          value={form.asistentes}
          onChange={(e) => onChange((p) => ({ ...p, asistentes: e.target.value }))}
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background resize-y"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 text-muted-foreground">
          {t("actas.field.resumen")}
        </label>
        <textarea
          value={form.resumen}
          onChange={(e) => onChange((p) => ({ ...p, resumen: e.target.value }))}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background resize-y"
        />
      </div>
      {slotPuntos}
      {selectorEstado}
      <div>
        <label className="block text-sm font-semibold mb-1 text-muted-foreground">
          {t("actas.field.observaciones")}
        </label>
        <textarea
          value={form.observaciones}
          onChange={(e) => onChange((p) => ({ ...p, observaciones: e.target.value }))}
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background resize-y"
        />
      </div>
      <div className="flex gap-2">
        <Button size={modo === "crear" ? "default" : "sm"} onClick={onGuardar} disabled={saving}>
          {saving ? t("common.saving") : guardarLabel}
        </Button>
        <Button size={modo === "crear" ? "default" : "sm"} variant="ghost" onClick={onCancelar}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

function FirmaActaModal({
  modal,
  onChangeActa,
  onCambiarModo,
  onCambiarOtroAnyoMes,
  onClose,
  onPickFile,
  onCambiarAnyoMes,
  onResetAnyoMes,
  onConfirmar,
  t,
  apiBase,
}: {
  modal: {
    open: boolean;
    selectedActaId: number | null;
    modo: "existente" | "otro";
    actas: Acta[];
    loadingActas: boolean;
    pdfDataUrl: string;
    pdfName: string;
    pdfSize: number;
    duplicados: DuplicadoMes[];
    loadingDuplicados: boolean;
    anyoMes: string;
    anyoMesDefault: string;
    anyoMesElegido: string;
    otroAnyoMes: string;
    enviando: boolean;
    errorPdf: string | null;
    resultMsg: string | null;
  };
  onChangeActa: (id: number) => void;
  onCambiarModo: (modo: "existente" | "otro") => void;
  onCambiarOtroAnyoMes: (v: string) => void;
  onClose: () => void;
  onPickFile: (file: File) => void;
  onCambiarAnyoMes: (v: string) => void;
  onResetAnyoMes: () => void;
  onConfirmar: () => void;
  t: (key: string) => string;
  apiBase: string;
}) {
  const hayDuplicados = modal.duplicados.length > 0;
  const tamanoMB = modal.pdfSize > 0 ? (modal.pdfSize / (1024 * 1024)).toFixed(2) : "0";
  const anios = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() + 1 - i);
  const meses = [
    "01", "02", "03", "04", "05", "06",
    "07", "08", "09", "10", "11", "12",
  ];
  const mesLabel = (m: string) => t(`actas.firma.mes.${m}`);
  // Estado local de los selectores de año/mes. Se mantiene aunque solo haya
  // una parte elegida (p. ej. solo el año) y se sincroniza con el padre
  // cuando ambos están presentes. Así la selección "se sostiene" al
  // escoger año y mes por separado.
  const [anyoPick, setAnyoPick] = useState("");
  const [mesPick, setMesPick] = useState("");
  const [otroAnyoPick, setOtroAnyoPick] = useState("");
  const [otroMesPick, setOtroMesPick] = useState("");

  // Sincroniza los pickers locales cuando el valor proviene del padre
  // (apertura del modal, cambio de acta, reset a la fecha del acta...).
  useEffect(() => {
    const [a = "", m = ""] = (modal.anyoMesElegido || "").split("-");
    if (a) setAnyoPick(a);
    if (m) setMesPick(m);
  }, [modal.anyoMesElegido]);
  useEffect(() => {
    const [a = "", m = ""] = (modal.otroAnyoMes || "").split("-");
    if (a) setOtroAnyoPick(a);
    if (m) setOtroMesPick(m);
  }, [modal.otroAnyoMes]);

  const setAnyomes = (anyo: string, mes: string) => {
    setAnyoPick(anyo);
    setMesPick(mes);
    if (anyo && mes) onCambiarAnyoMes(`${anyo}-${mes}`);
  };
  const setOtroAnyomes = (anyo: string, mes: string) => {
    setOtroAnyoPick(anyo);
    setOtroMesPick(mes);
    if (anyo && mes) onCambiarOtroAnyoMes(`${anyo}-${mes}`);
  };
  const modoOtro = modal.modo === "otro";
  const actaSel =
    modal.selectedActaId != null && modal.selectedActaId > 0
      ? modal.actas.find((a) => a.id === modal.selectedActaId) ?? null
      : null;
  const otroTituloPreview =
    otroAnyoPick && otroMesPick
      ? t("actas.firma.otro_anio_mes_titulo")
          .replace("{mes}", mesLabel(otroMesPick))
          .replace("{anyo}", otroAnyoPick)
      : "";
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" />
            {t("actas.firma.modal_title")}
          </h3>
          <Button size="sm" variant="ghost" onClick={onClose} className="gap-1">
            <X className="w-4 h-4" />
            {t("common.close")}
          </Button>
        </div>

        <div className="p-4 space-y-4 text-sm">
          <div className="border border-border rounded-xl px-3 py-3 space-y-2">
            <label className="block text-sm font-semibold text-muted-foreground">
              {t("actas.firma.acta_destino")}
            </label>
            {modal.loadingActas ? (
              <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
            ) : (
              <select
                value={modoOtro ? "otro" : modal.selectedActaId != null ? String(modal.selectedActaId) : ""}
                onChange={(e) => {
                  if (e.target.value === "otro") {
                    onCambiarModo("otro");
                    return;
                  }
                  const id = parseInt(e.target.value, 10);
                  if (Number.isFinite(id)) {
                    onCambiarModo("existente");
                    onChangeActa(id);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              >
                <option value="">{t("actas.firma.acta_destino_placeholder")}</option>
                {modal.actas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.numero != null ? `#${a.numero} - ` : ""}
                    {a.titulo}
                    {a.fecha ? ` (${a.fecha})` : ""}
                    {` · ${t(`actas.estado.${a.estado}`)}`}
                  </option>
                ))}
                <option value="otro">{t("actas.firma.otro_anio_mes")}</option>
              </select>
            )}
          </div>

          {modoOtro ? (
            <div className="border border-border rounded-xl px-3 py-3 space-y-2">
              <p className="text-xs text-muted-foreground">{t("actas.firma.otro_anio_mes_hint")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={otroAnyoPick || ""}
                  onChange={(e) => setOtroAnyomes(e.target.value, otroMesPick || "")}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="">{t("actas.firma.anio_placeholder")}</option>
                  {anios.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <select
                  value={otroMesPick || ""}
                  onChange={(e) => setOtroAnyomes(otroAnyoPick || "", e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="">{t("actas.firma.mes_placeholder")}</option>
                  {meses.map((m) => (
                    <option key={m} value={m}>
                      {mesLabel(m)}
                    </option>
                  ))}
                </select>
                {modal.otroAnyoMes && (
                  <span className="text-xs text-muted-foreground">
                    {t("actas.firma.archivo_en")}: <b>{modal.otroAnyoMes}</b>
                  </span>
                )}
              </div>
              {otroTituloPreview && (
                <p className="text-xs text-muted-foreground">
                  {otroTituloPreview}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="bg-muted/30 rounded-xl px-3 py-2">
                <p className="font-medium">
                  {actaSel
                    ? `${actaSel.numero != null ? `#${actaSel.numero} - ` : ""}${actaSel.titulo}`
                    : t("actas.firma.sin_acta_seleccionada")}
                </p>
                {actaSel?.fecha && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("actas.field.fecha")}: {actaSel.fecha}
                    {modal.anyoMes ? ` · ${t("actas.firma.anyo_mes")}: ${modal.anyoMes}` : ""}
                  </p>
                )}
              </div>

          <p className="text-muted-foreground">{t("actas.firma.intro")}</p>

              <div className="border border-border rounded-xl px-3 py-3 space-y-2">
                <label className="block text-sm font-semibold text-muted-foreground">
                  {t("actas.firma.anyo_mes")}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={anyoPick || ""}
                    onChange={(e) => setAnyomes(e.target.value, mesPick || "")}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="">{t("actas.firma.anio_placeholder")}</option>
                    {anios.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <select
                    value={mesPick || ""}
                    onChange={(e) => setAnyomes(anyoPick || "", e.target.value)}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="">{t("actas.firma.mes_placeholder")}</option>
                    {meses.map((m) => (
                      <option key={m} value={m}>
                        {mesLabel(m)}
                      </option>
                    ))}
                  </select>
                  {modal.anyoMesElegido && (
                    <span className="text-xs text-muted-foreground">
                      {t("actas.firma.archivo_en")}: <b>{modal.anyoMesElegido}</b>
                    </span>
                  )}
                  {modal.anyoMesDefault && modal.anyoMesElegido !== modal.anyoMesDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        const [a = "", m = ""] = (modal.anyoMesDefault || "").split("-");
                        setAnyoPick(a);
                        setMesPick(m);
                        onResetAnyoMes();
                      }}
                      className="text-xs underline text-primary hover:no-underline"
                    >
                      {t("actas.firma.usar_fecha_acta").replace("{mes}", modal.anyoMesDefault)}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("actas.firma.anyo_mes_hint")}
                </p>
              </div>

              {!modal.loadingDuplicados && hayDuplicados && (
                <div className="border border-amber-300 bg-amber-50 text-amber-900 rounded-xl px-3 py-2 space-y-1.5">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    {t("actas.firma.aviso_duplicados_title").replace(
                      "{mes}",
                      modal.anyoMes || "",
                    )}{" "}
                    ({modal.duplicados.length})
                  </p>
                  <p className="text-xs">{t("actas.firma.aviso_duplicados_intro")}</p>
                  <ul className="text-xs space-y-0.5 list-disc list-inside">
                    {modal.duplicados.map((d) => (
                      <li key={d.id}>
                        {d.numero != null ? `#${d.numero} · ` : ""}
                        {d.titulo}
                        {d.fecha ? ` (${d.fecha})` : ""}
                        {d.pdf_filename ? ` — ${d.pdf_filename}` : ""}
                        {d.pdf_url && (
                          <>
                            {" "}
                            <a
                              href={`${apiBase}${d.pdf_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-900 underline hover:no-underline"
                            >
                              {t("actas.firma.ver")}
                            </a>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <label
            htmlFor="acta-firma-pdf"
            className="block border-2 border-dashed border-border rounded-xl px-4 py-6 text-center cursor-pointer hover:bg-muted/20"
          >
            <FileText className="w-8 h-8 mx-auto text-primary mb-2" />
            {modal.pdfName ? (
              <div className="space-y-1">
                <p className="font-semibold">{modal.pdfName}</p>
                <p className="text-xs text-muted-foreground">{tamanoMB} MB</p>
              </div>
            ) : (
              <>
                <p className="font-medium">{t("actas.firma.elegir_pdf")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("actas.firma.max_tamano")}
                </p>
              </>
            )}
            <input
              id="acta-firma-pdf"
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
              }}
            />
          </label>

          {modal.errorPdf && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 whitespace-pre-wrap break-words font-mono">
              {modal.errorPdf}
            </p>
          )}
          {modal.resultMsg && (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              {modal.resultMsg}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={modal.enviando}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={onConfirmar}
            disabled={
              modal.enviando ||
              !modal.pdfDataUrl ||
              (modoOtro ? !modal.otroAnyoMes : modal.selectedActaId == null)
            }
            className="gap-1.5"
          >
            <PenLine className="w-4 h-4" />
            {modal.enviando
              ? t("common.saving")
              : modoOtro
                ? t("actas.firma.elaborar_acta")
                : t("actas.firma.confirmar")}
          </Button>
        </div>
      </div>
    </div>
  );
}
