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

const ESTADOS = ["borrador", "completa", "firmada"] as const;
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
        setMsg(String(d?.error ?? t("common.error")));
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
          ...headerForm,
          puntos_overrides: overridesPayload,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
        return;
      }
      setMsg(t("actas.msg.creada"));
      setCreando(false);
      setConvocatoriaId("");
      setPreviewPuntos([]);
      setPreviewOverrides({});
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
        body: JSON.stringify(headerForm),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(String(d?.error ?? t("common.error")));
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
    pdfDataUrl: string;
    pdfName: string;
    pdfSize: number;
    duplicados: DuplicadoMes[];
    loadingDuplicados: boolean;
    anyoMes: string;
    enviando: boolean;
    errorPdf: string | null;
    resultMsg: string | null;
  };
  const [firmaModal, setFirmaModal] = useState<FirmaModalState>({
    open: false,
    pdfDataUrl: "",
    pdfName: "",
    pdfSize: 0,
    duplicados: [],
    loadingDuplicados: false,
    anyoMes: "",
    enviando: false,
    errorPdf: null,
    resultMsg: null,
  });

  async function abrirFirmaModal() {
    if (!token || !detalle) return;
    setFirmaModal({
      open: true,
      pdfDataUrl: "",
      pdfName: "",
      pdfSize: 0,
      duplicados: [],
      loadingDuplicados: true,
      anyoMes: "",
      enviando: false,
      errorPdf: null,
      resultMsg: null,
    });
    try {
      const r = await fetch(
        `${API_BASE}/api/admin/actas/${detalle.acta.id}/duplicados-mes`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const d = await r.json();
      if (r.ok) {
        setFirmaModal((p) => ({
          ...p,
          duplicados: (d.items as DuplicadoMes[]) ?? [],
          anyoMes: String(d.anyo_mes ?? ""),
          loadingDuplicados: false,
        }));
      } else {
        setFirmaModal((p) => ({ ...p, loadingDuplicados: false }));
      }
    } catch {
      setFirmaModal((p) => ({ ...p, loadingDuplicados: false }));
    }
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
    if (!token || !detalle) return;
    if (!firmaModal.pdfDataUrl) {
      setFirmaModal((p) => ({ ...p, errorPdf: t("actas.firma.error_sin_pdf") }));
      return;
    }
    setFirmaModal((p) => ({ ...p, enviando: true, resultMsg: null, errorPdf: null }));
    try {
      const r = await fetch(`${API_BASE}/api/admin/actas/${detalle.acta.id}/firmar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pdf_data_url: firmaModal.pdfDataUrl }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFirmaModal((p) => ({
          ...p,
          enviando: false,
          errorPdf: String(d?.error ?? t("common.error")),
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
      await loadDetalle(detalle.acta.id);
    } catch {
      setFirmaModal((p) => ({
        ...p,
        enviando: false,
        errorPdf: t("common.network_error"),
      }));
    }
  }

  const acta = detalle?.acta;
  const editable = puedeEscribir && acta?.estado === "borrador";
  const puedeFirmar = puedeEscribir && acta?.estado === "completa";

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
            <h1 className="text-3xl font-bold text-foreground">{t("menu.gestion_actas")}</h1>
            <p className="text-sm text-muted-foreground">{t("actas.intro")}</p>
          </div>
        </div>
        {puedeEscribir && !creando && (
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
        )}
      </div>

      {msg && (
        <p className="mb-4 text-sm text-muted-foreground bg-muted/40 rounded-xl px-4 py-2">
          {msg}
        </p>
      )}

      {creando && puedeEscribir && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4 mb-8">
          <h2 className="text-lg font-semibold">{t("actas.form.nueva_title")}</h2>
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
          <ActaHeaderFields
            form={headerForm}
            onChange={setHeaderForm}
            t={t}
            slotEntreResumenYObservaciones={
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

          <div className="flex gap-2">
            <Button onClick={() => void crearActa()} disabled={saving || !convocatoriaId}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setCreando(false);
                setConvocatoriaId("");
                setPreviewPuntos([]);
                setPreviewOverrides({});
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
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

      {firmaModal.open && detalle && (
        <FirmaActaModal
          modal={firmaModal}
          actaTitulo={detalle.acta.titulo}
          actaFecha={detalle.acta.fecha}
          onClose={cerrarFirmaModal}
          onPickFile={(file) => void leerPdfASeleccionar(file)}
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
                {puedeEscribir && editable && !editandoCabecera && (
                  <Button size="sm" variant="ghost" onClick={() => setEditandoCabecera(true)}>
                    {t("common.edit")}
                  </Button>
                )}
              </div>

              {/* Panel de flujo: borrador → completa → firmada */}
              <div className="border border-border rounded-2xl bg-muted/20 p-3 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                  {(["borrador", "completa", "firmada"] as const).map((st, idx) => {
                    const isActive = acta.estado === st;
                    const isDone =
                      (st === "borrador" && acta.estado !== "borrador") ||
                      (st === "completa" && acta.estado === "firmada");
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
                  <div className="flex flex-wrap gap-2">
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
                      {t("actas.action.imprimir_firma")}
                    </Button>
                    {puedeEscribir && puedeFirmar && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void abrirFirmaModal()}
                        disabled={saving}
                      >
                        <PenLine className="w-4 h-4" />
                        {t("actas.action.subir_pdf_firmada")}
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("actas.flujo.completa_hint")}
                    </p>
                  </div>
                )}

                {acta.estado === "firmada" && (
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

              {editandoCabecera && editable && (
                <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                  <ActaHeaderFields form={headerForm} onChange={setHeaderForm} t={t} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void guardarCabecera()} disabled={saving}>
                      {saving ? t("common.saving") : t("common.save")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditandoCabecera(false)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
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

function ActaHeaderFields({
  form,
  onChange,
  t,
  slotEntreResumenYObservaciones,
}: {
  form: {
    titulo: string;
    fecha: string;
    asistentes: string;
    resumen: string;
    observaciones: string;
  };
  onChange: (
    v:
      | {
          titulo: string;
          fecha: string;
          asistentes: string;
          resumen: string;
          observaciones: string;
        }
      | ((p: {
          titulo: string;
          fecha: string;
          asistentes: string;
          resumen: string;
          observaciones: string;
        }) => {
          titulo: string;
          fecha: string;
          asistentes: string;
          resumen: string;
          observaciones: string;
        }),
  ) => void;
  t: (key: string) => string;
  slotEntreResumenYObservaciones?: React.ReactNode;
}) {
  return (
    <>
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
      {slotEntreResumenYObservaciones}
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
    </>
  );
}

function FirmaActaModal({
  modal,
  actaTitulo,
  actaFecha,
  onClose,
  onPickFile,
  onConfirmar,
  t,
  apiBase,
}: {
  modal: {
    open: boolean;
    pdfDataUrl: string;
    pdfName: string;
    pdfSize: number;
    duplicados: DuplicadoMes[];
    loadingDuplicados: boolean;
    anyoMes: string;
    enviando: boolean;
    errorPdf: string | null;
    resultMsg: string | null;
  };
  actaTitulo: string;
  actaFecha: string | null;
  onClose: () => void;
  onPickFile: (file: File) => void;
  onConfirmar: () => void;
  t: (key: string) => string;
  apiBase: string;
}) {
  const hayDuplicados = modal.duplicados.length > 0;
  const tamanoMB = modal.pdfSize > 0 ? (modal.pdfSize / (1024 * 1024)).toFixed(2) : "0";
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
          <div className="bg-muted/30 rounded-xl px-3 py-2">
            <p className="font-medium">{actaTitulo}</p>
            {actaFecha && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("actas.field.fecha")}: {actaFecha}
                {modal.anyoMes ? ` · ${t("actas.firma.anyo_mes")}: ${modal.anyoMes}` : ""}
              </p>
            )}
          </div>

          <p className="text-muted-foreground">{t("actas.firma.intro")}</p>

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
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
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
            disabled={modal.enviando || !modal.pdfDataUrl}
            className="gap-1.5"
          >
            <PenLine className="w-4 h-4" />
            {modal.enviando ? t("common.saving") : t("actas.firma.confirmar")}
          </Button>
        </div>
      </div>
    </div>
  );
}
