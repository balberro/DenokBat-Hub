import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import AdminGaleria from "./AdminGaleria";

const API_ROOT = "/api";

const MAX_PDF_BYTES = 25 * 1024 * 1024;

type Cargo = {
  id: number;
  codigo: string;
  nombre: string;
  nombreEu: string | null;
  ambito: string;
  activo: number;
};

type Socio = {
  id: number;
  nombre: string;
  apellidos: string | null;
  avatarUrl: string | null;
};

type Historico = {
  id: number;
  socioId: number;
  cargoId: number;
  fechaInicio: string;
  fechaFin: string | null;
  descripcion: string | null;
  descripcionEu: string | null;
};
type HistoricoDraft = {
  socioId: string;
  cargoId: string;
  fechaInicio: string;
  fechaFin: string;
  descripcion: string;
  descripcionEu: string;
};
type Estatuto = {
  id: number;
  titulo: string;
  tituloEu: string | null;
  pdfUrl: string;
  pdfUrlEu: string | null;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
};
type EstatutoDraft = {
  titulo: string;
  tituloEu: string;
  pdfUrl: string;
  pdfUrlEu: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
};
type ActaAsamblea = {
  id: number;
  titulo: string;
  tituloEu: string | null;
  pdfUrl: string;
  fechaActa: string;
};
type ActaAsambleaDraft = {
  titulo: string;
  tituloEu: string;
  pdfUrl: string;
  fechaActa: string;
};

type AdminData = {
  textos: {
    quienesSomosTitle: string;
    quienesSomosTitleEu: string;
    quienesSomosSubtitle: string;
    quienesSomosSubtitleEu: string;
    presentacionTitle: string;
    historiaEs: string;
    historiaEu: string;
    estatutosIntroEs: string;
    estatutosIntroEu: string;
  };
  hitos: Array<{ year: string; texto: string; textoEu: string; icon: string; imageUrl?: string }>;
  cargos: Cargo[];
  historico: Historico[];
  socios: Socio[];
  estatutos: Estatuto[];
  actasAsamblea: ActaAsamblea[];
};

const DEFAULT_HITOS = [
  { year: "", texto: "", textoEu: "", icon: "", imageUrl: "" },
  { year: "", texto: "", textoEu: "", icon: "", imageUrl: "" },
  { year: "", texto: "", textoEu: "", icon: "", imageUrl: "" },
  { year: "", texto: "", textoEu: "", icon: "", imageUrl: "" },
];

type EditorTab = "presentacion" | "estatutos" | "organigrama" | "galeria" | "actas";

const EDITOR_TABS: { key: EditorTab; label: string }[] = [
  { key: "presentacion", label: "nosotros.tab.presentacion" },
  { key: "estatutos", label: "nosotros.tab.estatutos" },
  { key: "organigrama", label: "nosotros.tab.organigrama" },
  { key: "galeria", label: "nosotros.tab.galeria" },
  { key: "actas", label: "nosotros.tab.actas" },
];

export default function AdminNosotros() {
  const { lang, t } = useTranslation();
  const token = useStore((s) => s.token);
  const [tab, setTab] = useState<EditorTab>("presentacion");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    quienesSomosTitle: "",
    quienesSomosTitleEu: "",
    quienesSomosSubtitle: "",
    quienesSomosSubtitleEu: "",
    presentacionTitle: "",
    historiaEs: "",
    historiaEu: "",
    estatutosIntroEs: "",
    estatutosIntroEu: "",
  });
  const [hitos, setHitos] = useState(DEFAULT_HITOS);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [historicoDrafts, setHistoricoDrafts] = useState<Record<number, HistoricoDraft>>({});
  const [estatutos, setEstatutos] = useState<Estatuto[]>([]);
  const [estatutoDrafts, setEstatutoDrafts] = useState<Record<number, EstatutoDraft>>({});
  const [actas, setActas] = useState<ActaAsamblea[]>([]);
  const [actaDrafts, setActaDrafts] = useState<Record<number, ActaAsambleaDraft>>({});
  const [newRow, setNewRow] = useState({
    socioId: "",
    cargoId: "",
    fechaInicio: "",
    fechaFin: "",
    descripcion: "",
    descripcionEu: "",
  });
  const [newCargo, setNewCargo] = useState({
    codigo: "",
    nombre: "",
    nombreEu: "",
    ambito: "directivo",
  });
  const [newEstatuto, setNewEstatuto] = useState<EstatutoDraft>({
    titulo: "",
    tituloEu: "",
    pdfUrl: "",
    pdfUrlEu: "",
    vigenciaDesde: "",
    vigenciaHasta: "",
  });
  const [nuevoEstatutoPdfName, setNuevoEstatutoPdfName] = useState("");
  const [nuevoEstatutoPdfEuName, setNuevoEstatutoPdfEuName] = useState("");
  const [newActa, setNewActa] = useState<ActaAsambleaDraft>({
    titulo: "",
    tituloEu: "",
    pdfUrl: "",
    fechaActa: "",
  });
  const [nuevaActaPdfName, setNuevaActaPdfName] = useState("");

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
    }),
    [token],
  );

  const showSuccess = (text: string) => setNotice({ type: "success", text });
  const showError = (text: string) => setNotice({ type: "error", text });








  // Extrae el mensaje de error del body JSON YA leído (no releer el Response,
  // su body solo puede consumirse una vez).
  const errorFromBody = (body: unknown, r: Response) => {
    const d = body as { error?: string; detalle?: string } | null;
    if (d && typeof d === "object") {
      if (d.detalle) return `${d.error ?? "Error"}: ${d.detalle}`;
      if (d.error) return d.error;
    }
    return `HTTP ${r.status} ${r.statusText}`.trim();
  };

  // Lee el PDF como dataURL comprobando antes el tamaño máximo.
  const handlePdfSelect = async (file: File | null, onLoaded: (dataUrl: string) => void): Promise<boolean> => {
    if (!file) return false;
    if (file.size > MAX_PDF_BYTES) {
      showError(`El PDF pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. Máximo permitido: 25 MB.`);
      return false;
    }
    const dataUrl = await readFileAsDataUrl(file);
    onLoaded(dataUrl);
    return true;
  };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros`, { headers: authHeaders });
      if (!r.ok) throw new Error("load failed");
      const data = (await r.json()) as AdminData;
      setForm({
        quienesSomosTitle: String(data?.textos?.quienesSomosTitle ?? ""),
        quienesSomosTitleEu: String(data?.textos?.quienesSomosTitleEu ?? ""),
        quienesSomosSubtitle: String(data?.textos?.quienesSomosSubtitle ?? ""),
        quienesSomosSubtitleEu: String(data?.textos?.quienesSomosSubtitleEu ?? ""),
        presentacionTitle: String(data?.textos?.presentacionTitle ?? ""),
        historiaEs: String(data?.textos?.historiaEs ?? ""),
        historiaEu: String(data?.textos?.historiaEu ?? ""),
        estatutosIntroEs: String(data?.textos?.estatutosIntroEs ?? ""),
        estatutosIntroEu: String(data?.textos?.estatutosIntroEu ?? ""),
      });
      const incomingHitos = Array.isArray(data?.hitos) ? data.hitos : [];
      setHitos([...incomingHitos, ...DEFAULT_HITOS].slice(0, 8).map((h) => ({
        year: String(h?.year ?? ""),
        texto: String(h?.texto ?? ""),
        textoEu: String(h?.textoEu ?? ""),
        icon: String(h?.icon ?? ""),
        imageUrl: String(h?.imageUrl ?? ""),
      })));
      setCargos(Array.isArray(data?.cargos) ? data.cargos : []);
      setSocios(Array.isArray(data?.socios) ? data.socios : []);
      const historicoRows = Array.isArray(data?.historico) ? data.historico : [];
      setHistorico(historicoRows);
      const drafts: Record<number, HistoricoDraft> = {};
      for (const h of historicoRows) {
        drafts[h.id] = {
          socioId: String(h.socioId),
          cargoId: String(h.cargoId),
          fechaInicio: String(h.fechaInicio ?? ""),
          fechaFin: String(h.fechaFin ?? ""),
          descripcion: String(h.descripcion ?? ""),
          descripcionEu: String(h.descripcionEu ?? ""),
        };
      }
      setHistoricoDrafts(drafts);
      const estatutosRows = Array.isArray(data?.estatutos) ? data.estatutos : [];
      setEstatutos(estatutosRows);
      const estatutosDraftMap: Record<number, EstatutoDraft> = {};
      for (const e of estatutosRows) {
        estatutosDraftMap[e.id] = {
          titulo: String(e.titulo ?? ""),
          tituloEu: String(e.tituloEu ?? ""),
          pdfUrl: String(e.pdfUrl ?? ""),
          pdfUrlEu: String(e.pdfUrlEu ?? ""),
          vigenciaDesde: String(e.vigenciaDesde ?? ""),
          vigenciaHasta: String(e.vigenciaHasta ?? ""),
        };
      }
      setEstatutoDrafts(estatutosDraftMap);
      const actasRows = Array.isArray(data?.actasAsamblea) ? data.actasAsamblea : [];
      setActas(actasRows);
      const actasDraftMap: Record<number, ActaAsambleaDraft> = {};
      for (const a of actasRows) {
        actasDraftMap[a.id] = {
          titulo: String(a.titulo ?? ""),
          tituloEu: String(a.tituloEu ?? ""),
          pdfUrl: String(a.pdfUrl ?? ""),
          fechaActa: String(a.fechaActa ?? ""),
        };
      }
      setActaDrafts(actasDraftMap);
      return data;
    } catch {
      setNotice({ type: "error", text: "Error cargando datos de Nosotros." });
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const saveConfig = async () => {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    try {
      const validHitos = hitos
        .map((h) => ({
          year: String(h.year ?? "").trim(),
          texto: String(h.texto ?? "").trim(),
          textoEu: String(h.textoEu ?? "").trim(),
          icon: String(h.icon ?? "").trim(),
          imageUrl: String(h.imageUrl ?? "").trim(),
        }))
        .filter((h) => h.year || h.texto || h.textoEu || h.icon || h.imageUrl);

      const r = await fetch(`${API_ROOT}/admin/nosotros/config`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          textos: form,
          hitos: validHitos,
        }),
      });
      if (!r.ok) throw new Error("save config failed");
      showSuccess("Configuración de Nosotros guardada.");
    } catch {
      showError("Error guardando configuración de Nosotros.");
    } finally {
      setSaving(false);
    }
  };

  const addHistorico = async () => {
    if (!token) return;
    if (!newRow.socioId || !newRow.cargoId || !newRow.fechaInicio) {
      showError("Para asignar cargo histórico: socio, cargo y fecha de inicio son obligatorios.");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/historico`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          socioId: Number(newRow.socioId),
          cargoId: Number(newRow.cargoId),
          fechaInicio: newRow.fechaInicio,
          fechaFin: newRow.fechaFin || null,
          descripcion: newRow.descripcion || "",
          descripcionEu: newRow.descripcionEu || "",
        }),
      });
      if (!r.ok) throw new Error("create historico failed");
      setNewRow({ socioId: "", cargoId: "", fechaInicio: "", fechaFin: "", descripcion: "", descripcionEu: "" });
      await load();
      showSuccess("Cargo histórico asignado.");
    } catch {
      showError("Error creando histórico de cargo.");
    } finally {
      setSaving(false);
    }
  };

  const deleteHistorico = async (id: number) => {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/historico/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!r.ok) throw new Error("delete historico failed");
      await load();
      showSuccess("Asignación histórica eliminada.");
    } catch {
      showError("Error eliminando asignación histórica.");
    } finally {
      setSaving(false);
    }
  };

  const updateHistorico = async (id: number) => {
    if (!token) return;
    const draft = historicoDrafts[id];
    if (!draft || !draft.socioId || !draft.cargoId || !draft.fechaInicio) {
      showError("Para editar histórico: socio, cargo y fecha inicio son obligatorios.");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/historico/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          socioId: Number(draft.socioId),
          cargoId: Number(draft.cargoId),
          fechaInicio: draft.fechaInicio,
          fechaFin: draft.fechaFin || null,
          descripcion: draft.descripcion || "",
          descripcionEu: draft.descripcionEu || "",
        }),
      });
      if (!r.ok) throw new Error("update historico failed");
      await load();
      showSuccess("Histórico actualizado.");
    } catch {
      showError("Error actualizando histórico.");
    } finally {
      setSaving(false);
    }
  };

  const addCargo = async () => {
    if (!token) return;
    if (!newCargo.codigo || !newCargo.nombre) {
      showError("Para crear cargo: código y nombre son obligatorios.");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/cargos`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newCargo),
      });
      if (!r.ok) throw new Error("add cargo failed");
      setNewCargo({ codigo: "", nombre: "", nombreEu: "", ambito: "directivo" });
      await load();
      showSuccess("Cargo añadido.");
    } catch {
      showError("Error creando cargo.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCargo = async (id: number) => {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/cargos/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!r.ok) throw new Error("delete cargo failed");
      await load();
      showSuccess("Cargo eliminado.");
    } catch {
      showError("No se pudo eliminar el cargo (puede estar en uso en histórico).");
    } finally {
      setSaving(false);
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addEstatuto = async () => {
    if (!token) return;
    if (!newEstatuto.titulo || !newEstatuto.vigenciaDesde || !newEstatuto.pdfUrl) {
      showError("Para crear estatuto: título, PDF y vigencia desde son obligatorios.");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/estatutos`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          titulo: newEstatuto.titulo,
          tituloEu: newEstatuto.tituloEu,
          pdfUrl: newEstatuto.pdfUrl,
          pdfUrlEu: newEstatuto.pdfUrlEu,
          vigenciaDesde: newEstatuto.vigenciaDesde,
          vigenciaHasta: newEstatuto.vigenciaHasta || null,
        }),
      });
      const created = (await r.json().catch(() => null)) as Estatuto | null;
      if (!r.ok) {
        showError(`Error creando estatuto. ${errorFromBody(created, r)}`);
        return;
      }
      setNewEstatuto({ titulo: "", tituloEu: "", pdfUrl: "", pdfUrlEu: "", vigenciaDesde: "", vigenciaHasta: "" });
      setNuevoEstatutoPdfName("");
      setNuevoEstatutoPdfEuName("");
      const reloaded = await load();
      const savedId = Number(created?.id);
      const confirmed = savedId && Array.isArray(reloaded?.estatutos) && reloaded.estatutos.some((e) => e.id === savedId);
      showSuccess(confirmed ? "Estatuto guardado correctamente." : "El estatuto se ha guardado, pero no se ha podido confirmar en el listado.");
    } catch {
      showError("Error creando estatuto.");
    } finally {
      setSaving(false);
    }
  };

  const updateEstatuto = async (id: number) => {
    if (!token) return;
    const draft = estatutoDrafts[id];
    if (!draft || !draft.titulo || !draft.vigenciaDesde || !draft.pdfUrl) {
      showError("Para guardar estatuto: título, PDF y vigencia desde son obligatorios.");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/estatutos/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          titulo: draft.titulo,
          tituloEu: draft.tituloEu,
          pdfUrl: draft.pdfUrl,
          pdfUrlEu: draft.pdfUrlEu,
          vigenciaDesde: draft.vigenciaDesde,
          vigenciaHasta: draft.vigenciaHasta || null,
        }),
      });
      const updated = (await r.json().catch(() => null)) as Estatuto | null;
      if (!r.ok) {
        showError(`Error actualizando estatuto. ${errorFromBody(updated, r)}`);
        return;
      }
      await load();
      showSuccess(updated?.id === id ? "Estatuto actualizado correctamente." : "El estatuto se ha actualizado, pero no se ha podido confirmar en el listado.");
    } catch {
      showError("Error actualizando estatuto.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEstatuto = async (id: number) => {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/estatutos/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!r.ok) throw new Error("delete estatuto failed");
      await load();
      showSuccess("Estatuto eliminado.");
    } catch {
      showError("Error eliminando estatuto.");
    } finally {
      setSaving(false);
    }
  };

  const addActa = async () => {
    if (!token) return;
    if (!newActa.titulo || !newActa.fechaActa || !newActa.pdfUrl) {
      showError("Para crear acta: título, fecha y PDF son obligatorios.");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/actas`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newActa),
      });
      const created = (await r.json().catch(() => null)) as ActaAsamblea | null;
      if (!r.ok) {
        showError(`Error creando acta. ${errorFromBody(created, r)}`);
        return;
      }
      setNewActa({ titulo: "", tituloEu: "", pdfUrl: "", fechaActa: "" });
      setNuevaActaPdfName("");
      await load();
      showSuccess(created?.id ? "Acta guardada correctamente." : "El acta se ha guardado, pero no se ha podido confirmar en el listado.");
    } catch {
      showError("Error creando acta.");
    } finally {
      setSaving(false);
    }
  };

  const updateActa = async (id: number) => {
    if (!token) return;
    const draft = actaDrafts[id];
    if (!draft || !draft.titulo || !draft.fechaActa || !draft.pdfUrl) {
      showError("Para guardar acta: título, fecha y PDF son obligatorios.");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/actas/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(draft),
      });
      const updated = (await r.json().catch(() => null)) as ActaAsamblea | null;
      if (!r.ok) {
        showError(`Error actualizando acta. ${errorFromBody(updated, r)}`);
        return;
      }
      await load();
      showSuccess(updated?.id === id ? "Acta actualizada correctamente." : "El acta se ha actualizado, pero no se ha podido confirmar en el listado.");
    } catch {
      showError("Error actualizando acta.");
    } finally {
      setSaving(false);
    }
  };

  const deleteActa = async (id: number) => {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API_ROOT}/admin/nosotros/actas/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!r.ok) throw new Error("delete acta failed");
      await load();
      showSuccess("Acta eliminada.");
    } catch {
      showError("Error eliminando acta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Editor Nosotros</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cada pestaña corresponde a una sección de la página pública «Nosotros»: Presentación, Estatutos, Organigrama, Galería y Actas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {EDITOR_TABS.map((tabBtn) => (
          <button
            key={tabBtn.key}
            type="button"
            onClick={() => setTab(tabBtn.key)}
            className={`px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors ${
              tab === tabBtn.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            }`}
          >
            {t(tabBtn.label)}
          </button>
        ))}
      </div>

      {notice && (
        <p
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl border ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          <span>{notice.type === "success" ? "✓" : "✗"}</span>
          {notice.text}
        </p>
      )}

      {tab === "presentacion" && (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">

        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Título principal (ES)</label>
          <input
            value={form.quienesSomosTitle}
            onChange={(e) => setForm((p) => ({ ...p, quienesSomosTitle: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Título principal (EU)</label>
          <input
            value={form.quienesSomosTitleEu}
            onChange={(e) => setForm((p) => ({ ...p, quienesSomosTitleEu: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Subtítulo (ES)</label>
          <input
            value={form.quienesSomosSubtitle}
            onChange={(e) => setForm((p) => ({ ...p, quienesSomosSubtitle: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Subtítulo (EU)</label>
          <input
            value={form.quienesSomosSubtitleEu}
            onChange={(e) => setForm((p) => ({ ...p, quienesSomosSubtitleEu: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Título de Presentación</label>
          <input
            value={form.presentacionTitle}
            onChange={(e) => setForm((p) => ({ ...p, presentacionTitle: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Nuestra historia (ES)</label>
          <textarea
            value={form.historiaEs}
            onChange={(e) => setForm((p) => ({ ...p, historiaEs: e.target.value }))}
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Nuestra historia (EU)</label>
          <textarea
            value={form.historiaEu}
            onChange={(e) => setForm((p) => ({ ...p, historiaEu: e.target.value }))}
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Texto introductorio de Estatutos (ES)</label>
          <textarea
            value={form.estatutosIntroEs}
            onChange={(e) => setForm((p) => ({ ...p, estatutosIntroEs: e.target.value }))}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            disabled={loading || saving}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">Texto introductorio de Estatutos (EU)</label>
          <textarea
            value={form.estatutosIntroEu}
            onChange={(e) => setForm((p) => ({ ...p, estatutosIntroEu: e.target.value }))}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            disabled={loading || saving}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Hitos (tarjetas)</h2>
          {hitos.map((h, i) => (
            <div key={i} className="grid sm:grid-cols-5 gap-2">
              <input
                value={h.year}
                onChange={(e) => setHitos((prev) => prev.map((it, idx) => (idx === i ? { ...it, year: e.target.value } : it)))}
                placeholder="Año"
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                disabled={loading || saving}
              />
              <input
                value={h.texto}
                onChange={(e) => setHitos((prev) => prev.map((it, idx) => (idx === i ? { ...it, texto: e.target.value } : it)))}
                placeholder="Texto ES"
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                disabled={loading || saving}
              />
              <input
                value={h.textoEu}
                onChange={(e) => setHitos((prev) => prev.map((it, idx) => (idx === i ? { ...it, textoEu: e.target.value } : it)))}
                placeholder="Texto EU"
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                disabled={loading || saving}
              />
              <input
                value={h.icon}
                onChange={(e) => setHitos((prev) => prev.map((it, idx) => (idx === i ? { ...it, icon: e.target.value } : it)))}
                placeholder="Emoji"
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                disabled={loading || saving}
              />
              <input
                value={h.imageUrl}
                onChange={(e) => setHitos((prev) => prev.map((it, idx) => (idx === i ? { ...it, imageUrl: e.target.value } : it)))}
                placeholder="URL imagen (opcional)"
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                disabled={loading || saving}
              />
            </div>
          ))}
        </div>

        <Button onClick={saveConfig} disabled={loading || saving}>{saving ? "Guardando..." : "Guardar presentación e hitos"}</Button>
      </div>
      )}

      {tab === "organigrama" && (
      <>
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Organigrama (Fundadores / Dirección / Delegados)</h2>
        <p className="text-sm text-muted-foreground">
          Las personas vienen de socios sincronizados con Odoo (`res.partner`). Primero sincroniza socios y luego asigna cargos aquí.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <select
            value={newRow.socioId}
            onChange={(e) => setNewRow((p) => ({ ...p, socioId: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground lg:col-span-2"
            disabled={loading || saving}
          >
            <option value="">Selecciona socio</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {`${s.nombre} ${s.apellidos ?? ""}`.trim()}
              </option>
            ))}
          </select>
          <select
            value={newRow.cargoId}
            onChange={(e) => setNewRow((p) => ({ ...p, cargoId: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
            disabled={loading || saving}
          >
            <option value="">Cargo</option>
            {cargos.map((c) => (
              <option key={c.id} value={c.id}>{`${c.nombre} (${c.ambito})`}</option>
            ))}
          </select>
          <input type="date" value={newRow.fechaInicio} onChange={(e) => setNewRow((p) => ({ ...p, fechaInicio: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input type="date" value={newRow.fechaFin} onChange={(e) => setNewRow((p) => ({ ...p, fechaFin: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <Button onClick={addHistorico} disabled={loading || saving}>Asignar</Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <textarea value={newRow.descripcion} onChange={(e) => setNewRow((p) => ({ ...p, descripcion: e.target.value }))} rows={2} placeholder="Descripción ES del cargo en tarjeta" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none" disabled={loading || saving} />
          <textarea value={newRow.descripcionEu} onChange={(e) => setNewRow((p) => ({ ...p, descripcionEu: e.target.value }))} rows={2} placeholder="Descripción EU del cargo en tarjeta" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none" disabled={loading || saving} />
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">Editar histórico de cargos</h3>
          {historico.map((h) => {
            const socio = socios.find((s) => s.id === h.socioId);
            const cargo = cargos.find((c) => c.id === h.cargoId);
            const draft = historicoDrafts[h.id] ?? {
              socioId: String(h.socioId),
              cargoId: String(h.cargoId),
              fechaInicio: String(h.fechaInicio ?? ""),
              fechaFin: String(h.fechaFin ?? ""),
              descripcion: String(h.descripcion ?? ""),
              descripcionEu: String(h.descripcionEu ?? ""),
            };
            return (
              <div key={h.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{`${socio?.nombre ?? ""} ${socio?.apellidos ?? ""}`.trim()}</p>
                  <p className="text-sm text-muted-foreground">{cargo?.nombre ?? "Cargo"} · {h.fechaInicio} {h.fechaFin ? `→ ${h.fechaFin}` : "→ actual"}</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2">
                  <select
                    value={draft.socioId}
                    onChange={(e) => setHistoricoDrafts((p) => ({ ...p, [h.id]: { ...draft, socioId: e.target.value } }))}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-foreground lg:col-span-2"
                    disabled={loading || saving}
                  >
                    <option value="">Socio</option>
                    {socios.map((s) => (
                      <option key={s.id} value={s.id}>{`${s.nombre} ${s.apellidos ?? ""}`.trim()}</option>
                    ))}
                  </select>
                  <select
                    value={draft.cargoId}
                    onChange={(e) => setHistoricoDrafts((p) => ({ ...p, [h.id]: { ...draft, cargoId: e.target.value } }))}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    disabled={loading || saving}
                  >
                    <option value="">Cargo</option>
                    {cargos.map((c) => (
                      <option key={c.id} value={c.id}>{`${c.nombre} (${c.ambito})`}</option>
                    ))}
                  </select>
                  <input type="date" value={draft.fechaInicio} onChange={(e) => setHistoricoDrafts((p) => ({ ...p, [h.id]: { ...draft, fechaInicio: e.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <input type="date" value={draft.fechaFin} onChange={(e) => setHistoricoDrafts((p) => ({ ...p, [h.id]: { ...draft, fechaFin: e.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <div className="flex gap-2">
                    <Button onClick={() => updateHistorico(h.id)} disabled={loading || saving}>Guardar</Button>
                    <Button variant="outline" onClick={() => deleteHistorico(h.id)} disabled={loading || saving}>Eliminar</Button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <textarea value={draft.descripcion} onChange={(e) => setHistoricoDrafts((p) => ({ ...p, [h.id]: { ...draft, descripcion: e.target.value } }))} rows={2} placeholder="Descripción ES" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none" disabled={loading || saving} />
                  <textarea value={draft.descripcionEu} onChange={(e) => setHistoricoDrafts((p) => ({ ...p, [h.id]: { ...draft, descripcionEu: e.target.value } }))} rows={2} placeholder="Descripción EU" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none" disabled={loading || saving} />
                </div>
              </div>
            );
          })}
          {historico.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay asignaciones históricas todavía.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Tabla de cargos</h2>
        <p className="text-sm text-muted-foreground">Formulario para añadir y quitar registros de la tabla de cargos.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input value={newCargo.codigo} onChange={(e) => setNewCargo((p) => ({ ...p, codigo: e.target.value }))} placeholder="Código (ej. delegado_zona)" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input value={newCargo.nombre} onChange={(e) => setNewCargo((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre ES" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input value={newCargo.nombreEu} onChange={(e) => setNewCargo((p) => ({ ...p, nombreEu: e.target.value }))} placeholder="Nombre EU" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <select value={newCargo.ambito} onChange={(e) => setNewCargo((p) => ({ ...p, ambito: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving}>
            <option value="fundador">fundador</option>
            <option value="directivo">directivo</option>
            <option value="delegado">delegado</option>
          </select>
          <Button onClick={addCargo} disabled={loading || saving}>Añadir cargo</Button>
        </div>

        <div className="space-y-2">
          {cargos.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{c.nombre} <span className="text-muted-foreground">({c.codigo})</span></p>
                <p className="text-sm text-muted-foreground">{c.ambito} · {c.nombreEu || "-"}</p>
              </div>
              <Button variant="outline" onClick={() => deleteCargo(c.id)} disabled={loading || saving}>Quitar</Button>
            </div>
          ))}
          {cargos.length === 0 && <p className="text-sm text-muted-foreground">No hay cargos.</p>}
        </div>
      </div>
      </>
      )}

      {tab === "estatutos" && (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Editor de Estatutos (PDF + vigencia)</h2>
        <p className="text-sm text-muted-foreground">Añade los estatutos actuales y anteriores con fechas de vigencia.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input value={newEstatuto.titulo} onChange={(e) => setNewEstatuto((p) => ({ ...p, titulo: e.target.value }))} placeholder="Título ES" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input value={newEstatuto.tituloEu} onChange={(e) => setNewEstatuto((p) => ({ ...p, tituloEu: e.target.value }))} placeholder="Título EU" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input type="date" value={newEstatuto.vigenciaDesde} onChange={(e) => setNewEstatuto((p) => ({ ...p, vigenciaDesde: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input type="date" value={newEstatuto.vigenciaHasta} onChange={(e) => setNewEstatuto((p) => ({ ...p, vigenciaHasta: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <Button onClick={addEstatuto} disabled={loading || saving}>{saving ? "Guardando..." : "Añadir estatuto"}</Button>
        </div>
        <div className="grid sm:grid-cols-[1fr_auto] gap-2">
          <input value={newEstatuto.pdfUrl} onChange={(e) => setNewEstatuto((p) => ({ ...p, pdfUrl: e.target.value }))} placeholder="URL PDF o DataURL" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input
            type="file"
            accept="application/pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) return;
              const ok = await handlePdfSelect(file, (pdf) => {
                setNewEstatuto((p) => ({ ...p, pdfUrl: pdf }));
                setNuevoEstatutoPdfName(file.name);
              });
              if (!ok) e.target.value = "";
            }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            disabled={loading || saving}
          />
          {nuevoEstatutoPdfName && (
            <p className="text-xs font-medium text-emerald-700">PDF adjuntado: {nuevoEstatutoPdfName}</p>
          )}
        </div>
        <div className="grid sm:grid-cols-[1fr_auto] gap-2">
          <input value={newEstatuto.pdfUrlEu} onChange={(e) => setNewEstatuto((p) => ({ ...p, pdfUrlEu: e.target.value }))} placeholder="URL PDF EU (opcional)" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input
            type="file"
            accept="application/pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) return;
              const ok = await handlePdfSelect(file, (pdf) => {
                setNewEstatuto((p) => ({ ...p, pdfUrlEu: pdf }));
                setNuevoEstatutoPdfEuName(file.name);
              });
              if (!ok) e.target.value = "";
            }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            disabled={loading || saving}
          />
          {nuevoEstatutoPdfEuName && (
            <p className="text-xs font-medium text-emerald-700">PDF EU adjuntado: {nuevoEstatutoPdfEuName}</p>
          )}
        </div>

        <div className="space-y-2">
          {estatutos.map((e) => {
            const draft = estatutoDrafts[e.id] ?? {
              titulo: e.titulo,
              tituloEu: e.tituloEu ?? "",
              pdfUrl: e.pdfUrl,
              pdfUrlEu: e.pdfUrlEu ?? "",
              vigenciaDesde: e.vigenciaDesde,
              vigenciaHasta: e.vigenciaHasta ?? "",
            };
            return (
              <div key={e.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  <input value={draft.titulo} onChange={(ev) => setEstatutoDrafts((p) => ({ ...p, [e.id]: { ...draft, titulo: ev.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <input value={draft.tituloEu} onChange={(ev) => setEstatutoDrafts((p) => ({ ...p, [e.id]: { ...draft, tituloEu: ev.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <input type="date" value={draft.vigenciaDesde} onChange={(ev) => setEstatutoDrafts((p) => ({ ...p, [e.id]: { ...draft, vigenciaDesde: ev.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <input type="date" value={draft.vigenciaHasta} onChange={(ev) => setEstatutoDrafts((p) => ({ ...p, [e.id]: { ...draft, vigenciaHasta: ev.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <div className="flex gap-2">
                    <Button onClick={() => updateEstatuto(e.id)} disabled={loading || saving}>{saving ? "Guardando..." : "Guardar"}</Button>
                    <Button variant="outline" onClick={() => deleteEstatuto(e.id)} disabled={loading || saving}>Eliminar</Button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                  <input value={draft.pdfUrl} onChange={(ev) => setEstatutoDrafts((p) => ({ ...p, [e.id]: { ...draft, pdfUrl: ev.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={async (ev) => {
                      const file = ev.target.files?.[0] ?? null;
                      if (!file) return;
                      const ok = await handlePdfSelect(file, (pdf) => {
                        setEstatutoDrafts((p) => ({ ...p, [e.id]: { ...draft, pdfUrl: pdf } }));
                      });
                      if (!ok) ev.target.value = "";
                    }}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    disabled={loading || saving}
                  />
                </div>
                <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                  <input value={draft.pdfUrlEu} onChange={(ev) => setEstatutoDrafts((p) => ({ ...p, [e.id]: { ...draft, pdfUrlEu: ev.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={async (ev) => {
                      const file = ev.target.files?.[0] ?? null;
                      if (!file) return;
                      const ok = await handlePdfSelect(file, (pdf) => {
                        setEstatutoDrafts((p) => ({ ...p, [e.id]: { ...draft, pdfUrlEu: pdf } }));
                      });
                      if (!ok) ev.target.value = "";
                    }}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    disabled={loading || saving}
                  />
                </div>
              </div>
            );
          })}
          {estatutos.length === 0 && <p className="text-sm text-muted-foreground">No hay estatutos cargados.</p>}
        </div>
      </div>
      )}

      {tab === "galeria" && (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Galería</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona los álbumes de fotos que se muestran en la pestaña «Galería» de la página de Nosotros y en Divulgación (editor compartido).
        </p>
        <AdminGaleria lang={lang} canCreate={true} />
      </div>
      )}

      {tab === "actas" && (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Editor de Actas de Asamblea</h2>
        <p className="text-sm text-muted-foreground">Guarda actas en PDF con fecha del acta. Se mostrarán en índice por fecha descendente.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input value={newActa.titulo} onChange={(e) => setNewActa((p) => ({ ...p, titulo: e.target.value }))} placeholder="Título ES" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input value={newActa.tituloEu} onChange={(e) => setNewActa((p) => ({ ...p, tituloEu: e.target.value }))} placeholder="Título EU" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input type="date" value={newActa.fechaActa} onChange={(e) => setNewActa((p) => ({ ...p, fechaActa: e.target.value }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <input value={newActa.pdfUrl} onChange={(e) => setNewActa((p) => ({ ...p, pdfUrl: e.target.value }))} placeholder="URL PDF o DataURL" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
          <Button onClick={addActa} disabled={loading || saving}>{saving ? "Guardando..." : "Añadir acta"}</Button>
        </div>
        <input
          type="file"
          accept="application/pdf"
          onChange={async (e) => {
            const file = e.target.files?.[0] ?? null;
            if (!file) return;
            const ok = await handlePdfSelect(file, (pdf) => {
              setNewActa((p) => ({ ...p, pdfUrl: pdf }));
              setNuevaActaPdfName(file.name);
            });
            if (!ok) e.target.value = "";
          }}
          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
          disabled={loading || saving}
        />
        {nuevaActaPdfName && (
          <p className="text-xs font-medium text-emerald-700">PDF adjuntado: {nuevaActaPdfName}</p>
        )}

        <div className="space-y-2">
          {actas.map((a) => {
            const draft = actaDrafts[a.id] ?? {
              titulo: a.titulo,
              tituloEu: a.tituloEu ?? "",
              pdfUrl: a.pdfUrl,
              fechaActa: a.fechaActa,
            };
            return (
              <div key={a.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  <input value={draft.titulo} onChange={(ev) => setActaDrafts((p) => ({ ...p, [a.id]: { ...draft, titulo: ev.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <input value={draft.tituloEu} onChange={(ev) => setActaDrafts((p) => ({ ...p, [a.id]: { ...draft, tituloEu: ev.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <input type="date" value={draft.fechaActa} onChange={(ev) => setActaDrafts((p) => ({ ...p, [a.id]: { ...draft, fechaActa: ev.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <input value={draft.pdfUrl} onChange={(ev) => setActaDrafts((p) => ({ ...p, [a.id]: { ...draft, pdfUrl: ev.target.value } }))} className="px-3 py-2 rounded-lg border border-border bg-background text-foreground" disabled={loading || saving} />
                  <div className="flex gap-2">
                    <Button onClick={() => updateActa(a.id)} disabled={loading || saving}>{saving ? "Guardando..." : "Guardar"}</Button>
                    <Button variant="outline" onClick={() => deleteActa(a.id)} disabled={loading || saving}>Eliminar</Button>
                  </div>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={async (ev) => {
                    const file = ev.target.files?.[0] ?? null;
                    if (!file) return;
                    const ok = await handlePdfSelect(file, (pdf) => {
                      setActaDrafts((p) => ({ ...p, [a.id]: { ...draft, pdfUrl: pdf } }));
                    });
                    if (!ok) ev.target.value = "";
                  }}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  disabled={loading || saving}
                />
              </div>
            );
          })}
          {actas.length === 0 && <p className="text-sm text-muted-foreground">No hay actas cargadas.</p>}
        </div>
      </div>
      )}
    </div>
  );
}
