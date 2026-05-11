import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Download, Plus, Search, Calendar, FileText, Newspaper, BookOpen, ImageIcon, ChevronDown, Pencil } from "lucide-react";
import { useStore, getUserRoles } from "@/store/use-store";

type Tab = "hoja" | "pulunpe" | "noticias" | "articulos" | "galeria";
type NoticiaImagen = {
  src: string;
  side: "left" | "right";
  anchorBlock: number;
};
type NoticiaItem = {
  id: number;
  titulo: string;
  tituloEu: string;
  fecha: string;
  descripcion: string;
  descripcionEu: string;
  categoria: string;
  contenido: string;
  contenidoEu: string;
  resumen: string;
  resumenEu: string;
  imagenes: NoticiaImagen[];
};
type HojaItem = {
  id: number;
  titulo: string;
  tituloEu: string;
  fecha: string;
  descripcion: string;
  descripcionEu?: string | null;
  anio: number;
  mes: number;
  fotoUrl: string | null;
  pdfUrl: string | null;
  estado?: string | null;
};
type PulunpeItem = {
  id: number;
  titulo: string;
  tituloEu: string;
  fecha: string;
  descripcion: string;
  descripcionEu?: string | null;
  anio: number;
  mes: number;
  fotoUrl: string | null;
  pdfUrl: string | null;
};
type GaleriaItem = {
  id: number;
  titulo: string;
  tituloEu: string;
  fecha: string;
  tema: "Evento" | "Actividad";
  mediaUrl?: string | null;
};

const HOJAS: HojaItem[] = [
  { id: 1, titulo: "Hoja Informativa nº 47", tituloEu: "Informazio Orria 47", fecha: "2026-03-01", descripcion: "En este número: renovación de cuotas anuales y nuevas actividades de primavera.", descripcionEu: "Ale honetan: kuoten berritze eta udaberriko jarduera berriak.", anio: 2026, mes: 3, fotoUrl: null, pdfUrl: null, estado: "publicado" },
  { id: 2, titulo: "Hoja Informativa nº 46", tituloEu: "Informazio Orria 46", fecha: "2026-02-01", descripcion: "Resumen de enero: inscripciones abiertas y actos de Santa Águeda.", descripcionEu: "Urtarrileko laburpena: izena ematea irekita eta Santa Ageda ekintzak.", anio: 2026, mes: 2, fotoUrl: null, pdfUrl: null, estado: "publicado" },
  { id: 3, titulo: "Hoja Informativa nº 45", tituloEu: "Informazio Orria 45", fecha: "2026-01-01", descripcion: "Número especial de inicio de año con objetivos y calendario.", descripcionEu: "Urte hasierako ale berezia helburuekin eta egutegiarekin.", anio: 2026, mes: 1, fotoUrl: null, pdfUrl: null, estado: "publicado" },
];

const PULUNPES: PulunpeItem[] = [
  { id: 1, titulo: "Pulunpe Primavera 2026", tituloEu: "Pulunpe Udaberria 2026", fecha: "2026-03-15", descripcion: "Edición de primavera con reportaje sobre el torneo de mus y la excursión a Donostia.", anio: 2026, mes: 3, fotoUrl: null, pdfUrl: null },
  { id: 2, titulo: "Pulunpe Invierno 2026", tituloEu: "Pulunpe Negua 2026", fecha: "2026-01-15", descripcion: "Repaso de las actividades navideñas y agenda del primer trimestre.", anio: 2026, mes: 1, fotoUrl: null, pdfUrl: null },
  { id: 3, titulo: "Pulunpe Otoño 2025", tituloEu: "Pulunpe Udazkena 2025", fecha: "2025-10-15", descripcion: "Resumen del verano y programación de otoño.", anio: 2025, mes: 10, fotoUrl: null, pdfUrl: null },
];

const NOTICIAS = [
  { id: 1, titulo: "Renovación de las instalaciones deportivas", tituloEu: "Kiroldegiko instalazioen berritzea", fecha: "2026-03-10", descripcion: "Las nuevas instalaciones deportivas estarán listas para el próximo trimestre.", descripcionEu: "Kirol instalazio berriak hurrengo hiruhilekoan prest egongo dira.", categoria: "Instalaciones" },
  { id: 2, titulo: "Acuerdo con farmacias del municipio", tituloEu: "Udaleko farmaziekin akordioa", fecha: "2026-02-20", descripcion: "Los socios obtendrán un 10% de descuento presentando su carnet.", descripcionEu: "Bazkideek %10 deskontua izango dute txartela aurkeztuz.", categoria: "Servicios" },
  { id: 3, titulo: "Éxito del torneo de mus 2026", tituloEu: "2026ko mus txapelketaren arrakasta", fecha: "2026-02-05", descripcion: "Más de 40 participantes en la primera ronda del torneo anual.", descripcionEu: "40 parte-hartzaile baino gehiago urteko txapelketaren lehen txandan.", categoria: "Actividades" },
  { id: 4, titulo: "Nueva web de la asociación", tituloEu: "Elkartearen web berria", fecha: "2026-01-15", descripcion: "Estrenamos la nueva página web bilingüe con acceso al área de socios.", descripcionEu: "Bazkideen eremurako sarbidea duen web elebidunen orri berria estreinatzen dugu.", categoria: "Digital" },
];

type ArticuloItem = {
  id: number;
  titulo: string;
  tituloEu: string;
  fecha: string;
  categoria: string;
  fotoUrl: string | null;
  pdfUrlEs: string | null;
  pdfUrlEu: string | null;
};
const ARTICULOS: ArticuloItem[] = [
  { id: 1, titulo: "El Camino de Santiago en bicicleta", tituloEu: "Donostia bidea bizikletaz", fecha: "2026-03-01", categoria: "Experiencias", fotoUrl: null, pdfUrlEs: null, pdfUrlEu: null },
  { id: 2, titulo: "Recetas tradicionales vascas", tituloEu: "Euskal sukaldaritza tradizionala", fecha: "2026-02-01", categoria: "Gastronomía", fotoUrl: null, pdfUrlEs: null, pdfUrlEu: null },
];

const GALERIA: GaleriaItem[] = [
  { id: 1, titulo: "Excursión a Bilbao", tituloEu: "Bilbaoko Txangoa", fecha: "2026-03-08", tema: "Evento", mediaUrl: null },
  { id: 2, titulo: "Fiesta de Carnavales", tituloEu: "Inauterietako Jaia", fecha: "2026-02-14", tema: "Evento", mediaUrl: null },
  { id: 3, titulo: "Clase de Yoga - Enero", tituloEu: "Yoga Klasea - Urtarrila", fecha: "2026-01-15", tema: "Actividad", mediaUrl: null },
  { id: 4, titulo: "Torneo de Mus", tituloEu: "Mus Txapelketa", fecha: "2026-02-05", tema: "Actividad", mediaUrl: null },
  { id: 5, titulo: "Almuerzo de Navidad", tituloEu: "Gabonetako Bazkaria", fecha: "2025-12-20", tema: "Evento", mediaUrl: null },
  { id: 6, titulo: "Senderismo Otoño", tituloEu: "Udazkeneko Mendi-ibilaldia", fecha: "2025-10-12", tema: "Actividad", mediaUrl: null },
];

function SearchBar({ value, onChange, lang }: { value: string; onChange: (v: string) => void; lang: string }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={lang === "eu" ? "Bilatu..." : "Buscar..."}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
    </div>
  );
}

function HojaTab({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const token = useStore((s) => s.token);
  const [hojas, setHojas] = useState<HojaItem[]>([]);
  const [mode, setMode] = useState<"main" | "form" | "pdf" | "index">("main");
  const [selectedPdf, setSelectedPdf] = useState<HojaItem | null>(null);
  const [indexResults, setIndexResults] = useState<HojaItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ anio: "all", mes: "all", titulo: "" });
  const [form, setForm] = useState({
    titulo: "",
    tituloEu: "",
    anio: String(new Date().getFullYear()),
    mes: String(new Date().getMonth() + 1),
    descripcion: "",
    descripcionEu: "",
    fotoFile: null as File | null,
    pdfFile: null as File | null,
  });

  const sortHojas = (items: HojaItem[]) => {
    const toYear = (h: HojaItem) => Number(h.anio ?? Number(h.fecha.slice(0, 4)));
    const toMonth = (h: HojaItem) => Number(h.mes ?? Number(h.fecha.slice(5, 7)));
    return [...items].sort((a, b) => {
      const yearDiff = toYear(b) - toYear(a);
      if (yearDiff !== 0) return yearDiff;
      const monthDiff = toMonth(b) - toMonth(a);
      if (monthDiff !== 0) return monthDiff;
      return b.id - a.id;
    });
  };

  const latest = hojas[0] ?? null;
  const previous = hojas.slice(1);

  useEffect(() => {
    let active = true;
    const loadHojas = async () => {
      try {
        const r = await fetch("/api/hojas");
        const d = await r.json();
        if (!active || !r.ok) return;
        if (Array.isArray(d.items)) setHojas(sortHojas(d.items));
      } catch {
        if (active) setHojas([]);
      }
    };
    loadHojas();
    return () => { active = false; };
  }, []);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      titulo: "",
      tituloEu: "",
      anio: String(new Date().getFullYear()),
      mes: String(new Date().getMonth() + 1),
      descripcion: "",
      descripcionEu: "",
      fotoFile: null,
      pdfFile: null,
    });
    setMode("form");
  };

  const openEdit = (row: HojaItem) => {
    setEditingId(row.id);
    setForm({
      titulo: row.titulo,
      tituloEu: row.tituloEu ?? "",
      anio: String(row.anio ?? Number(row.fecha.slice(0, 4))),
      mes: String(row.mes ?? Number(row.fecha.slice(5, 7))),
      descripcion: row.descripcion ?? "",
      descripcionEu: row.descripcionEu ?? "",
      fotoFile: null,
      pdfFile: null,
    });
    setMode("form");
  };

  const openPdfView = (row: HojaItem) => {
    if (!row.pdfUrl) return;
    setSelectedPdf(row);
    setMode("pdf");
  };

  const runSearch = () => {
    const filtered = previous.filter((h) => {
      const hAnio = Number(h.fecha.slice(0, 4));
      const hMes = Number(h.fecha.slice(5, 7));
      const matchAnio = filters.anio === "all" || hAnio === Number(filters.anio);
      const matchMes = filters.mes === "all" || hMes === Number(filters.mes);
      const needle = filters.titulo.trim().toLowerCase();
      const title = (lang === "eu" ? h.tituloEu : h.titulo).toLowerCase();
      const matchTitulo = needle === "" || title.includes(needle);
      return matchAnio && matchMes && matchTitulo;
    });
    setIndexResults(filtered);
    setMode("index");
  };

  const saveHoja = async () => {
    if (!form.titulo.trim()) {
      alert(lang === "eu" ? "Izenburua derrigorrezkoa da" : "El titulo es obligatorio");
      return;
    }
    if (!form.fotoFile && editingId === null) {
      alert(lang === "eu" ? "Argazkia derrigorrezkoa da" : "La foto es obligatoria");
      return;
    }
    if (!form.pdfFile && editingId === null) {
      alert(lang === "eu" ? "PDFa derrigorrezkoa da" : "El PDF es obligatorio");
      return;
    }
    const anioNum = Number(form.anio);
    const mesNum = Number(form.mes);
    if (Number.isNaN(anioNum) || Number.isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      alert(lang === "eu" ? "Urtea eta hilabetea baliodunak izan behar dira" : "Ano y mes deben ser validos");
      return;
    }
    const fecha = `${anioNum}-${String(mesNum).padStart(2, "0")}-01`;
    let fotoUrl: string | null = null;
    let pdfUrl: string | null = null;
    if (form.fotoFile) fotoUrl = await readFileAsDataUrl(form.fotoFile);
    if (form.pdfFile) pdfUrl = await readFileAsDataUrl(form.pdfFile);

    const payload = {
      titulo: form.titulo.trim(),
      tituloEu: form.tituloEu.trim() || form.titulo.trim(),
      fecha,
      anio: anioNum,
      mes: mesNum,
      descripcion: form.descripcion.trim(),
      descripcionEu: form.descripcionEu.trim(),
      ...(fotoUrl ? { fotoUrl } : {}),
      ...(pdfUrl ? { pdfUrl } : {}),
    };
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    if (editingId === null) {
      const r = await fetch("/api/hojas", { method: "POST", headers, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail = data?.detalle ? `\nDetalle: ${String(data.detalle)}` : "";
        alert(`Error: ${data.error ?? r.statusText}${detail}`);
        return;
      }
      setHojas((prev) => sortHojas([data as HojaItem, ...prev]));
      alert(lang === "eu" ? "Informazio orria ondo sortu da datu-basean." : "Hoja informativa creada correctamente en base de datos.");
    } else {
      const r = await fetch(`/api/hojas/${editingId}`, { method: "PUT", headers, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 404) {
          const createResp = await fetch("/api/hojas", { method: "POST", headers, body: JSON.stringify(payload) });
          const created = await createResp.json().catch(() => ({}));
          if (!createResp.ok) {
            const detail = created?.detalle ? `\nDetalle: ${String(created.detalle)}` : "";
            alert(`Error: ${created.error ?? createResp.statusText}${detail}`);
            return;
          }
          setHojas((prev) => sortHojas([created as HojaItem, ...prev.filter((h) => h.id !== editingId)]));
          alert(lang === "eu" ? "Informazio orria ondo sortu da datu-basean." : "Hoja informativa creada correctamente en base de datos.");
          setMode("main");
          setEditingId(null);
          return;
        }
        const detail = data?.detalle ? `\nDetalle: ${String(data.detalle)}` : "";
        alert(`Error: ${data.error ?? r.statusText}${detail}`);
        return;
      }
      setHojas((prev) => sortHojas(prev.map((h) => (h.id === data.id ? (data as HojaItem) : h))));
      alert(lang === "eu" ? "Informazio orria ondo eguneratu da datu-basean." : "Hoja informativa actualizada correctamente en base de datos.");
    }
    setMode("main");
    setEditingId(null);
  };

  if (mode === "pdf" && selectedPdf?.pdfUrl) {
    const pdfSrc = selectedPdf.pdfUrl.startsWith("http")
      ? selectedPdf.pdfUrl
      : `${window.location.origin}${selectedPdf.pdfUrl.startsWith("/") ? "" : "/"}${selectedPdf.pdfUrl}`;
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Informazio Orria PDF" : "PDF de Hoja Informativa"}</h2>
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <iframe src={pdfSrc} title={selectedPdf.titulo} className="w-full h-[70vh]" />
        </div>
        <div className="flex items-center justify-between">
          <a href={pdfSrc} download target="_blank" rel="noreferrer">
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />{lang === "eu" ? "Deskargatu" : "Descargar"}</Button>
          </a>
          <Button onClick={() => setMode("main")}>{lang === "eu" ? "Itzuli" : "Volver"}</Button>
        </div>
      </div>
    );
  }

  if (mode === "index") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Aurkibidea" : "Indice de resultados"}</h2>
        <div className="space-y-3">
          {indexResults.length === 0 ? (
            <p className="text-muted-foreground">{lang === "eu" ? "Ez da emaitzarik aurkitu." : "No se encontraron resultados."}</p>
          ) : (
            indexResults.map((h) => (
              <div key={h.id} className="bg-white rounded-2xl border border-border p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{lang === "eu" ? h.tituloEu : h.titulo}</p>
                  <p className="text-sm text-muted-foreground">{new Date(h.fecha).toLocaleDateString("es-ES", { year: "numeric", month: "long" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => openPdfView(h)}>
                    {lang === "eu" ? "Hautatu" : "Seleccionar"}
                  </Button>
                  {canCreate && (
                    <Button type="button" variant="outline" className="gap-2" onClick={() => openEdit(h)}>
                      <Pencil className="w-4 h-4" />
                      {lang === "eu" ? "Editatu" : "Editar"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setMode("main")}>{lang === "eu" ? "Itzuli" : "Volver"}</Button>
        </div>
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          {editingId === null ? (lang === "eu" ? "Informazio Orri berria" : "Nueva Hoja Informativa") : (lang === "eu" ? "Informazio Orria editatu" : "Editar Hoja Informativa")}
        </h2>
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (ES)" : "Titulo (ES)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input value={form.tituloEu} onChange={(e) => setForm((p) => ({ ...p, tituloEu: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (EU)" : "Titulo (EU)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="number" min="1900" max="2100" value={form.anio} onChange={(e) => setForm((p) => ({ ...p, anio: e.target.value }))} placeholder={lang === "eu" ? "Urtea" : "Ano"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <select value={form.mes} onChange={(e) => setForm((p) => ({ ...p, mes: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>{new Date(2026, m - 1, 1).toLocaleDateString("es-ES", { month: "long" })}</option>
              ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder={lang === "eu" ? "Deskribapena (ES)" : "Descripcion (ES)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input value={form.descripcionEu} onChange={(e) => setForm((p) => ({ ...p, descripcionEu: e.target.value }))} placeholder={lang === "eu" ? "Deskribapena (EU)" : "Descripcion (EU)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, fotoFile: e.target.files?.[0] ?? null }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" required={editingId === null} />
            <input type="file" accept="application/pdf" onChange={(e) => setForm((p) => ({ ...p, pdfFile: e.target.files?.[0] ?? null }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" required={editingId === null} />
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setMode("main")}>{lang === "eu" ? "Ezeztatu" : "Volver"}</Button>
            <Button onClick={saveHoja}>{editingId === null ? (lang === "eu" ? "Sortu" : "Crear") : (lang === "eu" ? "Gorde" : "Guardar")}</Button>
          </div>
        </div>
      </div>
    );
  }

  const years = Array.from(new Set(previous.map((h) => Number(h.fecha.slice(0, 4))))).sort((a, b) => b - a);
  const months = Array.from(new Set(previous.map((h) => Number(h.fecha.slice(5, 7))))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Informazio Orria" : "Hoja Informativa"}</h2>
        {canCreate && (
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            {lang === "eu" ? "Berria" : "Nueva"}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="h-full">
          <h3 className="text-lg font-bold text-foreground mb-3">{lang === "eu" ? "Azken Informazio Orria" : "Última Hoja Informativa"}</h3>
          {latest ? (
            <button type="button" onClick={() => openPdfView(latest)} className="w-full h-full text-left bg-white rounded-2xl border border-primary/20 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col">
              <div className="w-full h-52 bg-primary/10 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                {latest.fotoUrl ? <img src={latest.fotoUrl} alt={latest.titulo} className="w-full h-full object-cover" /> : <Newspaper className="w-10 h-10 text-primary" />}
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {(lang === "eu" ? "Urtea" : "Ano")}: {latest.anio ?? Number(latest.fecha.slice(0, 4))} · {(lang === "eu" ? "Hilabetea" : "Mes")}: {new Date(2026, (latest.mes ?? Number(latest.fecha.slice(5, 7))) - 1, 1).toLocaleDateString("es-ES", { month: "long" })}
              </p>
              <h4 className="text-xl font-bold text-foreground mb-2">{lang === "eu" ? latest.tituloEu : latest.titulo}</h4>
              <p className="text-muted-foreground text-sm">{lang === "eu" ? (latest.descripcionEu ?? latest.descripcion) : latest.descripcion}</p>
              {canCreate && (
                <div className="mt-auto pt-4 flex justify-end">
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={(e) => { e.stopPropagation(); openEdit(latest); }}>
                    <Pencil className="w-4 h-4" />
                    {lang === "eu" ? "Editatu" : "Editar"}
                  </Button>
                </div>
              )}
            </button>
          ) : (
            <p className="text-muted-foreground">{lang === "eu" ? "Ez dago informazio orririk." : "No hay hojas informativas."}</p>
          )}
        </div>
        <div className="h-full">
          <h3 className="text-lg font-bold text-foreground mb-3">{lang === "eu" ? "Aurreko orriak" : "Hojas anteriores"}</h3>
          <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <select value={filters.anio} onChange={(e) => setFilters((p) => ({ ...p, anio: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm">
                <option value="all">{lang === "eu" ? "Urte guztiak" : "Todos los años"}</option>
                {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
              <select value={filters.mes} onChange={(e) => setFilters((p) => ({ ...p, mes: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm">
                <option value="all">{lang === "eu" ? "Hilabete guztiak" : "Todos los meses"}</option>
                {months.map((m) => <option key={m} value={String(m)}>{new Date(2026, m - 1, 1).toLocaleDateString("es-ES", { month: "long" })}</option>)}
              </select>
              <input value={filters.titulo} onChange={(e) => setFilters((p) => ({ ...p, titulo: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (gutxi gorabehera)" : "Titulo aproximado"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={runSearch}>{lang === "eu" ? "Bilatu" : "Buscar"}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PulunpeTab({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const token = useStore((s) => s.token);
  const [pulunpes, setPulunpes] = useState<PulunpeItem[]>(PULUNPES);
  const [mode, setMode] = useState<"main" | "form" | "pdf" | "index">("main");
  const [selectedPdf, setSelectedPdf] = useState<PulunpeItem | null>(null);
  const [indexResults, setIndexResults] = useState<PulunpeItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ anio: "all", mes: "all", titulo: "" });
  const [form, setForm] = useState({
    titulo: "",
    tituloEu: "",
    anio: String(new Date().getFullYear()),
    mes: String(new Date().getMonth() + 1),
    descripcion: "",
    descripcionEu: "",
    fotoFile: null as File | null,
    pdfFile: null as File | null,
  });

  const sortPulunpes = (items: PulunpeItem[]) => {
    const toYear = (p: PulunpeItem) => Number(p.anio ?? Number(p.fecha.slice(0, 4)));
    const toMonth = (p: PulunpeItem) => Number(p.mes ?? Number(p.fecha.slice(5, 7)));
    return [...items].sort((a, b) => {
      const yearDiff = toYear(b) - toYear(a);
      if (yearDiff !== 0) return yearDiff;
      const monthDiff = toMonth(b) - toMonth(a);
      if (monthDiff !== 0) return monthDiff;
      return b.id - a.id;
    });
  };

  const latest = pulunpes[0] ?? null;
  const previous = pulunpes.slice(1);

  useEffect(() => {
    let active = true;
    const loadPulunpes = async () => {
      try {
        const r = await fetch("/api/pulunpes");
        const d = await r.json();
        if (!active || !r.ok) return;
        if (Array.isArray(d.items) && d.items.length > 0) {
          setPulunpes(sortPulunpes(d.items));
        }
      } catch {
        // fallback local
      }
    };
    loadPulunpes();
    return () => { active = false; };
  }, []);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      titulo: "",
      tituloEu: "",
      anio: String(new Date().getFullYear()),
      mes: String(new Date().getMonth() + 1),
      descripcion: "",
      descripcionEu: "",
      fotoFile: null,
      pdfFile: null,
    });
    setMode("form");
  };

  const openEdit = (row: PulunpeItem) => {
    setEditingId(row.id);
    setForm({
      titulo: row.titulo,
      tituloEu: row.tituloEu ?? "",
      anio: String(row.anio ?? Number(row.fecha.slice(0, 4))),
      mes: String(row.mes ?? Number(row.fecha.slice(5, 7))),
      descripcion: row.descripcion ?? "",
      descripcionEu: row.descripcionEu ?? "",
      fotoFile: null,
      pdfFile: null,
    });
    setMode("form");
  };

  const openPdfView = (row: PulunpeItem) => {
    if (!row.pdfUrl) return;
    setSelectedPdf(row);
    setMode("pdf");
  };

  const runSearch = () => {
    const filtered = previous.filter((p) => {
      const pAnio = Number(p.fecha.slice(0, 4));
      const pMes = Number(p.fecha.slice(5, 7));
      const matchAnio = filters.anio === "all" || pAnio === Number(filters.anio);
      const matchMes = filters.mes === "all" || pMes === Number(filters.mes);
      const needle = filters.titulo.trim().toLowerCase();
      const title = (lang === "eu" ? p.tituloEu : p.titulo).toLowerCase();
      const matchTitulo = needle === "" || title.includes(needle);
      return matchAnio && matchMes && matchTitulo;
    });
    setIndexResults(filtered);
    setMode("index");
  };

  const savePulunpe = async () => {
    if (!form.titulo.trim()) {
      alert(lang === "eu" ? "Izenburua derrigorrezkoa da" : "El titulo es obligatorio");
      return;
    }
    if (!form.fotoFile && editingId === null) {
      alert(lang === "eu" ? "Argazkia derrigorrezkoa da" : "La foto es obligatoria");
      return;
    }
    if (!form.pdfFile && editingId === null) {
      alert(lang === "eu" ? "PDFa derrigorrezkoa da" : "El PDF es obligatorio");
      return;
    }

    const anioNum = Number(form.anio);
    const mesNum = Number(form.mes);
    if (Number.isNaN(anioNum) || Number.isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      alert(lang === "eu" ? "Urtea eta hilabetea baliodunak izan behar dira" : "Ano y mes deben ser validos");
      return;
    }
    const fecha = `${anioNum}-${String(mesNum).padStart(2, "0")}-01`;
    let fotoUrl: string | null = null;
    let pdfUrl: string | null = null;
    if (form.fotoFile) fotoUrl = await readFileAsDataUrl(form.fotoFile);
    if (form.pdfFile) pdfUrl = await readFileAsDataUrl(form.pdfFile);

    const payload = {
      titulo: form.titulo.trim(),
      tituloEu: form.tituloEu.trim() || form.titulo.trim(),
      fecha,
      anio: anioNum,
      mes: mesNum,
      descripcion: form.descripcion.trim(),
      descripcionEu: form.descripcionEu.trim(),
      ...(fotoUrl ? { fotoUrl } : {}),
      ...(pdfUrl ? { pdfUrl } : {}),
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    if (editingId === null) {
      const r = await fetch("/api/pulunpes", { method: "POST", headers, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail = data?.detalle ? `\nDetalle: ${String(data.detalle)}` : "";
        alert(`Error: ${data.error ?? r.statusText}${detail}`);
        return;
      }
      setPulunpes((prev) => sortPulunpes([data as PulunpeItem, ...prev]));
      alert(lang === "eu" ? "Pulunpea ondo sortu da datu-basean." : "Pulunpe creado correctamente en base de datos.");
    } else {
      const r = await fetch(`/api/pulunpes/${editingId}`, { method: "PUT", headers, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail = data?.detalle ? `\nDetalle: ${String(data.detalle)}` : "";
        alert(`Error: ${data.error ?? r.statusText}${detail}`);
        return;
      }
      setPulunpes((prev) => sortPulunpes(prev.map((p) => (p.id === data.id ? (data as PulunpeItem) : p))));
      alert(lang === "eu" ? "Pulunpea ondo eguneratu da datu-basean." : "Pulunpe actualizado correctamente en base de datos.");
    }

    setMode("main");
    setEditingId(null);
    setForm({
      titulo: "",
      tituloEu: "",
      anio: String(new Date().getFullYear()),
      mes: String(new Date().getMonth() + 1),
      descripcion: "",
      descripcionEu: "",
      fotoFile: null,
      pdfFile: null,
    });
  };

  if (mode === "pdf" && selectedPdf && selectedPdf.pdfUrl) {
    const pdfSrc = selectedPdf.pdfUrl.startsWith("http")
      ? selectedPdf.pdfUrl
      : `${window.location.origin}${selectedPdf.pdfUrl.startsWith("/") ? "" : "/"}${selectedPdf.pdfUrl}`;
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Pulunpe PDF" : "PDF de Pulunpe"}</h2>
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <iframe src={pdfSrc} title={selectedPdf.titulo} className="w-full h-[70vh]" />
        </div>
        <div className="flex items-center justify-between">
          <a href={pdfSrc} download target="_blank" rel="noreferrer">
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />{lang === "eu" ? "Deskargatu" : "Descargar"}</Button>
          </a>
          <Button onClick={() => setMode("main")}>{lang === "eu" ? "Itzuli" : "Volver"}</Button>
        </div>
      </div>
    );
  }

  if (mode === "index") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Aurkibidea" : "Indice de resultados"}</h2>
        <div className="space-y-3">
          {indexResults.length === 0 ? (
            <p className="text-muted-foreground">{lang === "eu" ? "Ez da emaitzarik aurkitu." : "No se encontraron resultados."}</p>
          ) : (
            indexResults.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-border p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{lang === "eu" ? p.tituloEu : p.titulo}</p>
                  <p className="text-sm text-muted-foreground">{new Date(p.fecha).toLocaleDateString("es-ES", { year: "numeric", month: "long" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => openPdfView(p)}>
                    {lang === "eu" ? "Hautatu" : "Seleccionar"}
                  </Button>
                  {canCreate && (
                    <Button type="button" variant="outline" className="gap-2" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4" />
                      {lang === "eu" ? "Editatu" : "Editar"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setMode("main")}>{lang === "eu" ? "Itzuli" : "Volver"}</Button>
        </div>
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          {editingId === null ? (lang === "eu" ? "Pulunpe berria" : "Nuevo Pulunpe") : (lang === "eu" ? "Pulunpea editatu" : "Editar Pulunpe")}
        </h2>
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (ES)" : "Titulo (ES)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input value={form.tituloEu} onChange={(e) => setForm((p) => ({ ...p, tituloEu: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (EU)" : "Titulo (EU)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="number" min="1900" max="2100" value={form.anio} onChange={(e) => setForm((p) => ({ ...p, anio: e.target.value }))} placeholder={lang === "eu" ? "Urtea" : "Ano"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <select value={form.mes} onChange={(e) => setForm((p) => ({ ...p, mes: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>{new Date(2026, m - 1, 1).toLocaleDateString("es-ES", { month: "long" })}</option>
              ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder={lang === "eu" ? "Deskribapena (ES)" : "Descripcion (ES)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input value={form.descripcionEu} onChange={(e) => setForm((p) => ({ ...p, descripcionEu: e.target.value }))} placeholder={lang === "eu" ? "Deskribapena (EU)" : "Descripcion (EU)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, fotoFile: e.target.files?.[0] ?? null }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" required={editingId === null} />
            <input type="file" accept="application/pdf" onChange={(e) => setForm((p) => ({ ...p, pdfFile: e.target.files?.[0] ?? null }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" required={editingId === null} />
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setMode("main")}>{lang === "eu" ? "Ezeztatu" : "Volver"}</Button>
            <Button onClick={savePulunpe}>{editingId === null ? (lang === "eu" ? "Sortu" : "Crear") : (lang === "eu" ? "Gorde" : "Guardar")}</Button>
          </div>
        </div>
      </div>
    );
  }

  const years = Array.from(new Set(previous.map((p) => Number(p.fecha.slice(0, 4))))).sort((a, b) => b - a);
  const months = Array.from(new Set(previous.map((p) => Number(p.fecha.slice(5, 7))))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Pulunpe</h2>
        {canCreate && (
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            {lang === "eu" ? "Pulunpe berria" : "Nuevo Pulunpe"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="h-full">
          <h3 className="text-lg font-bold text-foreground mb-3">{lang === "eu" ? "Azken Pulunpea" : "Ultimo Pulunpe"}</h3>
          {latest ? (
            <button
              type="button"
              onClick={() => openPdfView(latest)}
              className="w-full h-full text-left bg-white rounded-2xl border border-primary/20 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="w-full h-52 bg-secondary/10 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                {latest.fotoUrl ? (
                  <img src={latest.fotoUrl} alt={latest.titulo} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-10 h-10 text-secondary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {(lang === "eu" ? "Urtea" : "Ano")}: {latest.anio ?? Number(latest.fecha.slice(0, 4))} · {(lang === "eu" ? "Hilabetea" : "Mes")}: {new Date(2026, (latest.mes ?? Number(latest.fecha.slice(5, 7))) - 1, 1).toLocaleDateString("es-ES", { month: "long" })}
              </p>
              <h4 className="text-xl font-bold text-foreground mb-2">{lang === "eu" ? latest.tituloEu : latest.titulo}</h4>
              <p className="text-muted-foreground text-sm">{lang === "eu" ? (latest.descripcionEu ?? latest.descripcion) : latest.descripcion}</p>
              {canCreate && (
                <div className="mt-auto pt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(latest);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    {lang === "eu" ? "Editatu" : "Editar"}
                  </Button>
                </div>
              )}
            </button>
          ) : (
            <p className="text-muted-foreground">{lang === "eu" ? "Ez dago Pulunperik." : "No hay Pulunpes."}</p>
          )}
        </div>

        <div className="h-full">
          <h3 className="text-lg font-bold text-foreground mb-3">{lang === "eu" ? "Aurreko Pulunpeak" : "Pulunpes anteriores"}</h3>
          <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <select value={filters.anio} onChange={(e) => setFilters((p) => ({ ...p, anio: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm">
                <option value="all">{lang === "eu" ? "Urte guztiak" : "Todos los años"}</option>
                {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
              <select value={filters.mes} onChange={(e) => setFilters((p) => ({ ...p, mes: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm">
                <option value="all">{lang === "eu" ? "Hilabete guztiak" : "Todos los meses"}</option>
                {months.map((m) => <option key={m} value={String(m)}>{new Date(2026, m - 1, 1).toLocaleDateString("es-ES", { month: "long" })}</option>)}
              </select>
              <input value={filters.titulo} onChange={(e) => setFilters((p) => ({ ...p, titulo: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (gutxi gorabehera)" : "Titulo aproximado"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={runSearch}>{lang === "eu" ? "Bilatu" : "Buscar"}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoticiasTab({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const token = useStore((s) => s.token);
  const initialNoticias: NoticiaItem[] = NOTICIAS.map((n) => ({
    ...n,
    contenido: n.descripcion,
    contenidoEu: n.descripcionEu,
    resumen: n.descripcion,
    resumenEu: n.descripcionEu,
    imagenes: [],
  }));
  const [noticias, setNoticias] = useState<NoticiaItem[]>(initialNoticias);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"list" | "editor" | "detail">("list");
  const [selectedNoticia, setSelectedNoticia] = useState<NoticiaItem | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    tituloEu: "",
    categoria: "General",
    contenido: "",
    contenidoEu: "",
    imagenes: [] as NoticiaImagen[],
  });
  const [draggingImageIdx, setDraggingImageIdx] = useState<number | null>(null);

  const normalizeImagenes = (value: unknown): NoticiaImagen[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => {
        if (typeof entry === "string") {
          const src = entry.trim();
          if (!src || src === "[object Object]") return null;
          return { src, side: "right" as const, anchorBlock: 1 };
        }
        if (entry && typeof entry === "object") {
          const src = String((entry as any).src ?? "").trim();
          if (!src || src === "[object Object]") return null;
          const side = (entry as any).side === "left" ? "left" : "right";
          const rawAnchor = Number((entry as any).anchorBlock);
          const anchorBlock = Number.isFinite(rawAnchor) && rawAnchor >= 1
            ? Math.floor(rawAnchor)
            : (Number.isFinite(rawAnchor) && rawAnchor === 0
              ? 1
              : ((entry as any).position === "bottom" ? 9999 : (entry as any).position === "middle" ? 2 : 1));
          return { src, side, anchorBlock };
        }
        return null;
      })
      .filter((img): img is NoticiaImagen => Boolean(img));
  };

  const splitTextBlocks = (text: string): string[] => {
    const normalized = String(text ?? "").replace(/\r\n/g, "\n");
    // Cada salto de linea cuenta como separador de bloque para que
    // los anclajes (bloque 1, 2, 3...) coincidan con lo que edita el usuario.
    const blocks = normalized
      .split(/\n+/)
      .map((b) => b.trim())
      .filter(Boolean);
    return blocks.length > 0 ? blocks : [String(text ?? "")];
  };

  const isImageUrl = (url: string): boolean =>
    /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(url) || url.includes("/uploads/");

  const urlTokenRegex = /((?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;

  const normalizeLinkUrl = (url: string): string => {
    const cleaned = String(url ?? "").trim().replace(/[),.;!?]+$/g, "");
    if (!cleaned) return "";
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return `https://${cleaned}`;
  };

  const extractUrls = (text: string): string[] => {
    const matches = String(text ?? "").match(urlTokenRegex) ?? [];
    return matches
      .map((u) => normalizeLinkUrl(u))
      .filter(Boolean);
  };

  const renderBlockWithLinks = (block: string) => {
    const urlRegex = /((?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;
    const parts = block.split(urlRegex);
    if (parts.length === 1) return <p>{block}</p>;
    return (
      <div className="space-y-2">
        {parts.map((part, idx) => {
          // split con grupo capturador deja las URLs en índices impares.
          if (idx % 2 === 0) return part ? <p key={`txt-${idx}`}>{part}</p> : null;
          const url = normalizeLinkUrl(part);
          if (!url) return null;
          return (
            <a
              key={`url-${idx}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block bg-white rounded-2xl border border-border overflow-hidden hover:shadow-sm transition-shadow"
            >
              <div className="p-3 flex items-center gap-3">
                {isImageUrl(url) ? (
                  <div className="w-24 h-24 rounded-xl border border-border bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {lang === "eu" ? "Esteka" : "Enlace"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{url}</p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    let active = true;
    const loadNoticias = async () => {
      try {
        const r = await fetch("/api/noticias?page=1&limit=100");
        const d = await r.json();
        if (!active || !r.ok) return;
        if (Array.isArray(d.items)) {
          const mapped = d.items.map((n: any) => ({
            ...n,
            contenido: n.contenido ?? n.descripcion ?? "",
            contenidoEu: n.contenidoEu ?? n.descripcionEu ?? "",
            resumen: n.resumen ?? n.descripcion ?? "",
            resumenEu: n.resumenEu ?? n.descripcionEu ?? "",
            imagenes: normalizeImagenes(n.imagenes),
          })) as NoticiaItem[];
          setNoticias(mapped);
        }
      } catch {
        // keep defaults
      }
    };
    loadNoticias();
    return () => { active = false; };
  }, []);

  const toSummary = (text: string) => {
    const plain = text.replace(/\s+/g, " ").trim();
    if (plain.length <= 180) return plain;
    return `${plain.slice(0, 177)}...`;
  };

  const filtered = noticias
    .filter(n => (lang === "eu" ? n.tituloEu : n.titulo).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const topNoticias = filtered;

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const openEditor = (item?: NoticiaItem) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        titulo: item.titulo,
        tituloEu: item.tituloEu ?? "",
        categoria: item.categoria ?? "General",
        contenido: item.contenido ?? "",
        contenidoEu: item.contenidoEu ?? "",
        imagenes: normalizeImagenes(item.imagenes),
      });
      setMode("editor");
      return;
    }
    setEditingId(null);
    setForm({
      titulo: "",
      tituloEu: "",
      categoria: "General",
      contenido: "",
      contenidoEu: "",
      imagenes: [],
    });
    setMode("editor");
  };

  const saveNoticia = async () => {
    if (!form.titulo.trim() || !form.contenido.trim()) {
      alert(lang === "eu" ? "Izenburua eta edukia derrigorrezkoak dira" : "Titulo y contenido son obligatorios");
      return;
    }
    const payload = {
      titulo: form.titulo.trim(),
      tituloEu: form.tituloEu.trim() || form.titulo.trim(),
      categoria: form.categoria,
      contenido: form.contenido.trim(),
      contenidoEu: form.contenidoEu.trim() || form.contenido.trim(),
      resumen: toSummary(form.contenido),
      resumenEu: toSummary(form.contenidoEu || form.contenido),
      imagenes: form.imagenes,
    };
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const endpoint = editingId === null ? "/api/noticias" : `/api/noticias/${editingId}`;
    const method = editingId === null ? "POST" : "PUT";
    const r = await fetch(endpoint, { method, headers, body: JSON.stringify(payload) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detail = data?.detalle ? `\nDetalle: ${String(data.detalle)}` : "";
      alert(`Error: ${data.error ?? r.statusText}${detail}`);
      return;
    }
    const noticiaGuardada = {
      ...(data as NoticiaItem),
      contenido: (data as any).contenido ?? payload.contenido,
      contenidoEu: (data as any).contenidoEu ?? payload.contenidoEu,
      resumen: (data as any).resumen ?? payload.resumen,
      resumenEu: (data as any).resumenEu ?? payload.resumenEu,
      imagenes: normalizeImagenes((data as any).imagenes),
    } as NoticiaItem;
    if (editingId === null) {
      setNoticias((prev) => [noticiaGuardada, ...prev]);
      alert(lang === "eu" ? "Berria ondo gorde da datu-basean." : "Noticia guardada correctamente en base de datos.");
    } else {
      setNoticias((prev) => prev.map((n) => (n.id === noticiaGuardada.id ? noticiaGuardada : n)));
      setSelectedNoticia(noticiaGuardada);
      alert(lang === "eu" ? "Berria ondo eguneratu da datu-basean." : "Noticia actualizada correctamente en base de datos.");
    }
    setEditingId(null);
    setMode("list");
  };

  if (mode === "detail" && selectedNoticia) {
    const relatedLinks = Array.from(new Set([
      ...extractUrls(selectedNoticia.contenido),
      ...extractUrls(selectedNoticia.contenidoEu),
    ]));
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? selectedNoticia.tituloEu : selectedNoticia.titulo}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Calendar className="w-3.5 h-3.5" />{new Date(selectedNoticia.fecha).toLocaleDateString("es-ES")}</p>
          </div>
          {canCreate && (
            <Button variant="outline" className="gap-2 shrink-0" onClick={() => openEditor(selectedNoticia)}>
              <Pencil className="w-4 h-4" />
              {lang === "eu" ? "Editatu" : "Editar"}
            </Button>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-foreground whitespace-pre-wrap leading-7">
            {(() => {
              const fullText = lang === "eu" ? selectedNoticia.contenidoEu : selectedNoticia.contenido;
              const blocks = splitTextBlocks(String(fullText ?? ""));
              const renderImgs = (imgs: NoticiaImagen[]) => imgs.map((img, i) => (
                <div
                  key={`${img.src}-${img.anchorBlock}-${i}`}
                  className={`rounded-xl border border-border bg-muted/20 p-1 mb-3 ${
                    img.side === "left" ? "float-left mr-4" : "float-right ml-4"
                  }`}
                  style={{ width: "20rem", height: "20rem" }}
                >
                  <img src={img.src} alt={`img-${i}`} className="w-full h-full object-contain rounded-lg" />
                </div>
              ));
              return (
                <>
                  {blocks.map((block, idx) => (
                    <div key={`block-${idx}`} className="mb-2">
                      {renderImgs(selectedNoticia.imagenes.filter((img) => img.anchorBlock === (idx + 1)))}
                      {renderBlockWithLinks(block)}
                    </div>
                  ))}
                  {renderImgs(selectedNoticia.imagenes.filter((img) => img.anchorBlock > blocks.length))}
                  <div className="clear-both" />
                </>
              );
            })()}
            <div className="clear-both" />
          </div>
        </div>
        {relatedLinks.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">
              {lang === "eu" ? "Lotutako estekak" : "Enlaces relacionados"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedLinks.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-sm transition-shadow"
                >
                  <div className="p-3 flex items-center gap-3">
                    {isImageUrl(url) ? (
                      <div className="w-20 h-20 rounded-xl border border-border bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={url} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {lang === "eu" ? "Esteka" : "Enlace"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{url}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={() => setMode("list")}>{lang === "eu" ? "Itzuli" : "Volver"}</Button>
        </div>
      </div>
    );
  }

  if (mode === "editor") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          {editingId === null ? (lang === "eu" ? "Berri berria" : "Nueva noticia") : (lang === "eu" ? "Berria editatu" : "Editar noticia")}
        </h2>
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (ES)" : "Titulo (ES)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
            <input value={form.tituloEu} onChange={(e) => setForm((p) => ({ ...p, tituloEu: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (EU)" : "Titulo (EU)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
          </div>
          <select value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm">
            {["General", "Instalaciones", "Servicios", "Actividades", "Digital"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <textarea value={form.contenido} onChange={(e) => setForm((p) => ({ ...p, contenido: e.target.value }))} rows={6} placeholder={lang === "eu" ? "Edukia (ES)" : "Contenido (ES)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
          <textarea value={form.contenidoEu} onChange={(e) => setForm((p) => ({ ...p, contenidoEu: e.target.value }))} rows={6} placeholder={lang === "eu" ? "Edukia (EU)" : "Contenido (EU)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              const input = e.currentTarget;
              const files = Array.from(e.target.files ?? []);
              if (files.length === 0) return;
              const loaded = await Promise.all(files.map(async (f) => ({ src: await readFileAsDataUrl(f), side: "right" as const, anchorBlock: 1 })));
              setForm((p) => ({ ...p, imagenes: [...p.imagenes, ...loaded] }));
              input.value = "";
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm"
          />
          {form.imagenes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {lang === "eu" ? "Irudiak (arrastatu ordena aldatzeko)" : "Imagenes (arrastra para cambiar el orden)"}
              </p>
              {(() => {
                const blocks = splitTextBlocks(form.contenido || "");
                return (
              <div className="space-y-2">
                {form.imagenes.map((img, idx) => (
                  <div
                    key={`${img.src}-${idx}`}
                    draggable
                    onDragStart={() => setDraggingImageIdx(idx)}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={() => {
                      if (draggingImageIdx === null || draggingImageIdx === idx) return;
                      setForm((p) => {
                        const next = [...p.imagenes];
                        const [moved] = next.splice(draggingImageIdx, 1);
                        next.splice(idx, 0, moved);
                        return { ...p, imagenes: next };
                      });
                      setDraggingImageIdx(null);
                    }}
                    className="rounded-xl border border-border p-2 flex items-center gap-3 bg-muted/10"
                  >
                    <div className="w-16 h-16 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden">
                      <img src={img.src} alt={`preview-${idx}`} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setForm((p) => ({ ...p, imagenes: p.imagenes.map((it, i) => i === idx ? { ...it, side: it.side === "left" ? "right" : "left" } : it) }))}
                      >
                        {img.side === "left" ? (lang === "eu" ? "Ezkerrean" : "Izquierda") : (lang === "eu" ? "Eskuinean" : "Derecha")}
                      </Button>
                      <select
                        value={String(img.anchorBlock)}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            imagenes: p.imagenes.map((it, i) =>
                              i === idx ? { ...it, anchorBlock: Number(e.target.value) } : it
                            ),
                          }))
                        }
                        className="px-2 py-1.5 rounded-lg border border-border bg-white text-xs"
                      >
                        {blocks.map((_, bIdx) => (
                          <option key={bIdx} value={String(bIdx + 1)}>
                            {lang === "eu" ? `Blokea ${bIdx + 1}` : `Bloque ${bIdx + 1}`}
                          </option>
                        ))}
                        <option value={String(blocks.length + 1)}>
                          {lang === "eu" ? "Azkenean" : "Al final"}
                        </option>
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setForm((p) => ({ ...p, imagenes: p.imagenes.filter((_, i) => i !== idx) }))}
                      >
                        {lang === "eu" ? "Kendu" : "Quitar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
                );
              })()}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setMode("list")}>{lang === "eu" ? "Itzuli" : "Volver"}</Button>
            <Button onClick={saveNoticia}>{editingId === null ? (lang === "eu" ? "Gorde" : "Guardar") : (lang === "eu" ? "Eguneratu" : "Actualizar")}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Berriak" : "Noticias"}</h2>
        {canCreate && <Button size="sm" className="gap-2" onClick={() => openEditor()}><Plus className="w-4 h-4" />{lang === "eu" ? "Berria" : "Nueva"}</Button>}
      </div>
      <SearchBar value={search} onChange={setSearch} lang={lang} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {topNoticias.map((n, i) => (
          <button
            key={n.id}
            type="button"
            onClick={() => { setSelectedNoticia(n); setMode("detail"); }}
            className={`text-left bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all group ${i === 0 ? "ring-2 ring-primary/20" : ""}`}
          >
            <div className="h-28 bg-linear-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              {n.imagenes[0]?.src ? (
                <img src={n.imagenes[0].src} alt="preview noticia" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
              ) : (
                <Newspaper className="w-10 h-10 text-primary/70" />
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-accent text-accent-foreground rounded-full text-[11px] font-bold">{n.categoria}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(n.fecha).toLocaleDateString("es-ES")}
                </span>
              </div>
              <p className="font-semibold text-sm text-foreground line-clamp-1">{lang === "eu" ? n.tituloEu : n.titulo}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lang === "eu" ? n.resumenEu : n.resumen}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ArticulosTab({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const MAX_PDF_MB = 20;
  const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;
  const token = useStore((s) => s.token);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"list" | "editor" | "pdf">("list");
  const [articulos, setArticulos] = useState<ArticuloItem[]>(ARTICULOS);
  const [selectedPdf, setSelectedPdf] = useState<{ title: string; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedPdfEsName, setSelectedPdfEsName] = useState("");
  const [selectedPdfEuName, setSelectedPdfEuName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    tituloEu: "",
    categoria: "General",
    fotoFile: null as File | null,
    pdfEsFile: null as File | null,
    pdfEuFile: null as File | null,
  });
  const filtered = articulos.filter(a => (lang === "eu" ? a.tituloEu : a.titulo).toLowerCase().includes(search.toLowerCase()));
  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    let active = true;
    const loadArticulos = async () => {
      try {
        const r = await fetch("/api/articulos?page=1&limit=200");
        const d = await r.json();
        if (!active || !r.ok) return;
        if (Array.isArray(d.items)) {
          const mapped = d.items.map((row: any) => ({
            id: Number(row.id),
            titulo: String(row.titulo ?? ""),
            tituloEu: String(row.tituloEu ?? row.titulo ?? ""),
            fecha: String(row.fecha ?? new Date().toISOString().slice(0, 10)),
            categoria: String(row.categoria ?? "General"),
            fotoUrl: row.fotoUrl ? String(row.fotoUrl) : null,
            pdfUrlEs: row.pdfUrlEs ? String(row.pdfUrlEs) : null,
            pdfUrlEu: row.pdfUrlEu ? String(row.pdfUrlEu) : null,
          })) as ArticuloItem[];
          setArticulos(mapped);
        }
      } catch {
        // fallback a mock local
      }
    };
    loadArticulos();
    return () => { active = false; };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormError("");
    setSelectedPdfEsName("");
    setSelectedPdfEuName("");
    setForm({
      titulo: "",
      tituloEu: "",
      categoria: "General",
      fotoFile: null,
      pdfEsFile: null,
      pdfEuFile: null,
    });
    setMode("editor");
  };

  const openEdit = (item: ArticuloItem) => {
    setEditingId(item.id);
    setFormError("");
    setSelectedPdfEsName("");
    setSelectedPdfEuName("");
    setForm({
      titulo: item.titulo,
      tituloEu: item.tituloEu,
      categoria: item.categoria,
      fotoFile: null,
      pdfEsFile: null,
      pdfEuFile: null,
    });
    setMode("editor");
  };

  const saveArticulo = async () => {
    if (saving) return;
    if (!form.titulo.trim()) {
      const msg = lang === "eu" ? "Izenburua derrigorrezkoa da" : "El titulo es obligatorio";
      setFormError(msg);
      alert(msg);
      return;
    }
    if (form.pdfEsFile && form.pdfEsFile.size > MAX_PDF_BYTES) {
      const msg = lang === "eu" ? `PDF (ES) handiegia da (${MAX_PDF_MB}MB gehienez)` : `El PDF (ES) es demasiado grande (max ${MAX_PDF_MB}MB)`;
      setFormError(msg);
      alert(msg);
      return;
    }
    if (form.pdfEuFile && form.pdfEuFile.size > MAX_PDF_BYTES) {
      const msg = lang === "eu" ? `PDF (EU) handiegia da (${MAX_PDF_MB}MB gehienez)` : `El PDF (EU) es demasiado grande (max ${MAX_PDF_MB}MB)`;
      setFormError(msg);
      alert(msg);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
    const existing = editingId ? articulos.find((a) => a.id === editingId) ?? null : null;
    const nextFotoUrl = form.fotoFile ? await readFileAsDataUrl(form.fotoFile) : existing?.fotoUrl ?? null;
    const nextPdfEs = form.pdfEsFile ? await readFileAsDataUrl(form.pdfEsFile) : existing?.pdfUrlEs ?? null;
    const nextPdfEu = form.pdfEuFile ? await readFileAsDataUrl(form.pdfEuFile) : existing?.pdfUrlEu ?? null;
    if (!nextFotoUrl) {
      const msg = lang === "eu" ? "Argazkia falta da." : "Falta la foto de la tarjeta.";
      setFormError(msg);
      alert(msg);
      return;
    }
    if (!nextPdfEs || !nextPdfEu) {
      const missingEs = !nextPdfEs;
      const missingEu = !nextPdfEu;
      const msg = lang === "eu"
        ? (missingEs && missingEu
          ? "PDF ES eta PDF EU falta dira."
          : missingEs
            ? "PDF ES falta da."
            : "PDF EU falta da.")
        : (missingEs && missingEu
          ? "Faltan PDF (ES) y PDF (EU)."
          : missingEs
            ? "Falta PDF (ES)."
            : "Falta PDF (EU).");
      setFormError(msg);
      alert(msg);
      return;
    }
    const payload = {
      titulo: form.titulo.trim(),
      tituloEu: (form.tituloEu.trim() || form.titulo.trim()),
      categoria: form.categoria.trim() || "General",
      fotoUrl: nextFotoUrl,
      pdfUrlEs: nextPdfEs,
      pdfUrlEu: nextPdfEu,
    };
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const endpoint = editingId === null ? "/api/articulos" : `/api/articulos/${editingId}`;
    const method = editingId === null ? "POST" : "PUT";
    const r = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        ...payload,
        fecha: editingId
          ? (articulos.find((a) => a.id === editingId)?.fecha ?? new Date().toISOString().slice(0, 10))
          : new Date().toISOString().slice(0, 10),
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detail = data?.detalle ? `\nDetalle: ${String(data.detalle)}` : "";
      const msg = `Error: ${data.error ?? r.statusText}${detail}`;
      setFormError(msg);
      alert(msg);
      return;
    }
    const saved: ArticuloItem = {
      id: Number((data as any).id),
      titulo: String((data as any).titulo ?? payload.titulo),
      tituloEu: String((data as any).tituloEu ?? payload.tituloEu),
      categoria: String((data as any).categoria ?? payload.categoria),
      fecha: String((data as any).fecha ?? new Date().toISOString().slice(0, 10)),
      fotoUrl: (data as any).fotoUrl ? String((data as any).fotoUrl) : payload.fotoUrl,
      pdfUrlEs: (data as any).pdfUrlEs ? String((data as any).pdfUrlEs) : payload.pdfUrlEs,
      pdfUrlEu: (data as any).pdfUrlEu ? String((data as any).pdfUrlEu) : payload.pdfUrlEu,
    };
    if (editingId === null) {
      setArticulos((prev) => [saved, ...prev]);
    } else {
      setArticulos((prev) => prev.map((a) => (a.id === editingId ? saved : a)));
    }
    setMode("list");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const fullMsg = `${lang === "eu" ? "Errorea artikulua gordetzean" : "Error al guardar artículo"}.\n${msg}`;
      setFormError(fullMsg);
      alert(fullMsg);
    } finally {
      setSaving(false);
    }
  };

  if (mode === "pdf" && selectedPdf) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">{selectedPdf.title}</h2>
          <div className="flex items-center gap-2">
            <a href={selectedPdf.url} download target="_blank" rel="noreferrer">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {lang === "eu" ? "Deskargatu" : "Descargar"}
              </Button>
            </a>
            <Button variant="outline" onClick={() => setMode("list")}>{lang === "eu" ? "Itzuli" : "Volver"}</Button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-3">
          <div className="h-[75vh] rounded-xl border border-border overflow-hidden bg-background">
            <iframe src={selectedPdf.url} title={selectedPdf.title} className="w-full h-full" />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "editor") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          {editingId === null ? (lang === "eu" ? "Artikulu berria" : "Nuevo artículo") : (lang === "eu" ? "Artikulua editatu" : "Editar artículo")}
        </h2>
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (ES)" : "Titulo (ES)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
            <input value={form.tituloEu} onChange={(e) => setForm((p) => ({ ...p, tituloEu: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (EU)" : "Titulo (EU)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
          </div>
          <input value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))} placeholder={lang === "eu" ? "Kategoria" : "Categoria"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
          <div className="space-y-1 rounded-xl border border-border p-3 bg-muted/10">
            <label className="text-sm font-semibold text-foreground">{lang === "eu" ? "Txartelerako argazkia igo" : "Subir foto para tarjeta"}</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setForm((p) => ({ ...p, fotoFile: file }));
              }}
              required={editingId === null}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {editingId === null
                ? (lang === "eu" ? "Argazkia derrigorrezkoa da." : "La foto es obligatoria.")
                : (lang === "eu" ? "Argazki berririk hautatzen ez baduzu, oraingoa mantenduko da." : "Si no eliges una foto nueva, se mantiene la actual.")}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{lang === "eu" ? "PDF (ES)" : "PDF (ES)"}</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const input = e.currentTarget;
                  const file = input.files?.[0] ?? null;
                  setForm((p) => ({ ...p, pdfEsFile: file }));
                  setSelectedPdfEsName(file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "");
                  input.value = "";
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {selectedPdfEsName
                  ? `${lang === "eu" ? "Hautatua" : "Seleccionado"}: ${selectedPdfEsName}`
                  : (editingId !== null
                    ? (lang === "eu" ? "Oraingo PDF ES mantentzen da (berria hautatzen ez bada)." : "Se mantiene el PDF ES actual si no seleccionas uno nuevo.")
                    : (lang === "eu" ? "Ez da PDF ES hautatu." : "No hay PDF ES seleccionado."))}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{lang === "eu" ? "PDF (EU)" : "PDF (EU)"}</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const input = e.currentTarget;
                  const file = input.files?.[0] ?? null;
                  setForm((p) => ({ ...p, pdfEuFile: file }));
                  setSelectedPdfEuName(file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "");
                  input.value = "";
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {selectedPdfEuName
                  ? `${lang === "eu" ? "Hautatua" : "Seleccionado"}: ${selectedPdfEuName}`
                  : (editingId !== null
                    ? (lang === "eu" ? "Oraingo PDF EU mantentzen da (berria hautatzen ez bada)." : "Se mantiene el PDF EU actual si no seleccionas uno nuevo.")
                    : (lang === "eu" ? "Ez da PDF EU hautatu." : "No hay PDF EU seleccionado."))}
              </p>
            </div>
          </div>
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">
              {formError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setMode("list")}>{lang === "eu" ? "Itzuli" : "Volver"}</Button>
            <Button onClick={saveArticulo} disabled={saving}>
              {saving ? (lang === "eu" ? "Gordetzen..." : "Guardando...") : (editingId === null ? (lang === "eu" ? "Gorde" : "Guardar") : (lang === "eu" ? "Eguneratu" : "Actualizar"))}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Artikuluak" : "Artículos"}</h2>
        {canCreate && <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" />{lang === "eu" ? "Berria" : "Nuevo"}</Button>}
      </div>
      <SearchBar value={search} onChange={setSearch} lang={lang} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              const preferred = lang === "eu" ? (a.pdfUrlEu ?? a.pdfUrlEs) : (a.pdfUrlEs ?? a.pdfUrlEu);
              if (!preferred) return;
              setSelectedPdf({ title: lang === "eu" ? a.tituloEu : a.titulo, url: preferred });
              setMode("pdf");
            }}
            className="text-left bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all group"
          >
            <div className="h-28 bg-linear-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              {a.fotoUrl ? (
                <img src={a.fotoUrl} alt={lang === "eu" ? a.tituloEu : a.titulo} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
              ) : (
                <BookOpen className="w-10 h-10 text-primary/70 group-hover:scale-105 transition-transform" />
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-accent text-accent-foreground rounded-full text-[11px] font-bold">{a.categoria}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(a.fecha).toLocaleDateString("es-ES", { year: "numeric", month: "short" })}
                </span>
              </div>
              <p className="font-semibold text-sm text-foreground line-clamp-1">{lang === "eu" ? a.tituloEu : a.titulo}</p>
              {canCreate && (
                <Button variant="outline" size="sm" className="gap-2 mt-3 w-full" onClick={(e) => { e.stopPropagation(); openEdit(a); }}>
                  <Pencil className="w-3.5 h-3.5" />
                  {lang === "eu" ? "Editatu" : "Editar"}
                </Button>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GaleriaTab({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const token = useStore((s) => s.token);
  const [search, setSearch] = useState("");
  const [tema, setTema] = useState<"todo" | "Evento" | "Actividad">("todo");
  const [mode, setMode] = useState<"list" | "editor" | "album">("list");
  const [galeria, setGaleria] = useState<GaleriaItem[]>(GALERIA);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedAlbumKey, setSelectedAlbumKey] = useState<string | null>(null);
  const [selectedAlbumIndex, setSelectedAlbumIndex] = useState(0);
  const [form, setForm] = useState<{
    titulo: string;
    tituloEu: string;
    fecha: string;
    tema: "Evento" | "Actividad";
    coverFile: File | null;
    mediaFiles: File[];
  }>({
    titulo: "",
    tituloEu: "",
    fecha: new Date().toISOString().slice(0, 10),
    tema: "Evento",
    coverFile: null,
    mediaFiles: [],
  });

  useEffect(() => {
    let active = true;
    const loadGaleria = async () => {
      try {
        const r = await fetch("/api/galeria");
        const d = await r.json();
        if (!active || !r.ok) return;
        if (Array.isArray(d.items)) {
          const mapped = d.items.map((row: any) => ({
            id: Number(row.id),
            titulo: String(row.titulo ?? ""),
            tituloEu: String(row.tituloEu ?? row.titulo ?? ""),
            fecha: String(row.fecha ?? new Date().toISOString().slice(0, 10)),
            tema: (row.tema === "Actividad" ? "Actividad" : "Evento") as "Evento" | "Actividad",
            mediaUrl: row.mediaUrl ? String(row.mediaUrl) : null,
          })) as GaleriaItem[];
          setGaleria(mapped);
        }
      } catch {
        // fallback local
      }
    };
    loadGaleria();
    return () => { active = false; };
  }, []);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  const filtered = galeria.filter(g => {
    const matchTema = tema === "todo" || g.tema === tema;
    const matchSearch = (lang === "eu" ? g.tituloEu : g.titulo).toLowerCase().includes(search.toLowerCase());
    return matchTema && matchSearch;
  });
  const albumKeyOf = (g: GaleriaItem) => `${g.tema}__${g.fecha}__${g.titulo}`;
  const albumMap = new Map<string, GaleriaItem[]>();
  for (const item of filtered) {
    const key = albumKeyOf(item);
    const bucket = albumMap.get(key) ?? [];
    bucket.push(item);
    albumMap.set(key, bucket);
  }
  const albums = Array.from(albumMap.entries()).map(([key, items]) => ({
    key,
    cover: items[0],
    items,
  }));

  const openCreate = () => {
    setEditingId(null);
    setForm({
      titulo: "",
      tituloEu: "",
      fecha: new Date().toISOString().slice(0, 10),
      tema: "Evento",
      coverFile: null,
      mediaFiles: [],
    });
    setMode("editor");
  };

  const openEdit = (item: GaleriaItem) => {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo,
      tituloEu: item.tituloEu,
      fecha: item.fecha,
      tema: item.tema,
      coverFile: null,
      mediaFiles: [],
    });
    setMode("editor");
  };

  const saveGaleria = async () => {
    if (!form.titulo.trim()) {
      alert(lang === "eu" ? "Izenburua derrigorrezkoa da" : "El titulo es obligatorio");
      return;
    }
    const existing = editingId ? galeria.find((g) => g.id === editingId) ?? null : null;
    const existingAlbumItems = editingId !== null && existing
      ? galeria.filter((g) => `${g.tema}__${g.fecha}__${g.titulo}` === `${existing.tema}__${existing.fecha}__${existing.titulo}`)
      : [];
    let mediaUrls: string[] = [];
    if (form.mediaFiles.length > 0) {
      mediaUrls = await Promise.all(form.mediaFiles.map((f) => readFileAsDataUrl(f)));
    } else if (existing?.mediaUrl) {
      mediaUrls = [existing.mediaUrl];
    }
    const coverUrl = form.coverFile
      ? await readFileAsDataUrl(form.coverFile)
      : (existing?.mediaUrl ?? mediaUrls[0] ?? null);
    if (!coverUrl) {
      alert(lang === "eu" ? "Txarteleko argazkia derrigorrezkoa da" : "La foto de tarjeta es obligatoria");
      return;
    }
    if (mediaUrls.length === 0 && existingAlbumItems.length > 0) {
      mediaUrls = existingAlbumItems
        .map((g) => g.mediaUrl)
        .filter((u): u is string => Boolean(u));
    }
    if (mediaUrls.length === 0) {
      alert(lang === "eu" ? "Albumaren argazki bat gutxienez derrigorrezkoa da" : "Es obligatoria al menos una foto del álbum");
      return;
    }

    const payload = {
      titulo: form.titulo.trim(),
      tituloEu: form.tituloEu.trim() || form.titulo.trim(),
      fecha: form.fecha || new Date().toISOString().slice(0, 10),
      tema: form.tema,
      mediaUrl: coverUrl,
      mediaUrls,
      tipoMedia: "foto",
    };
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const endpoint = editingId === null ? "/api/galeria" : `/api/galeria/${editingId}`;
    const method = editingId === null ? "POST" : "PUT";
    const r = await fetch(endpoint, { method, headers, body: JSON.stringify(payload) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detail = data?.detalle ? `\nDetalle: ${String(data.detalle)}` : "";
      alert(`Error: ${data.error ?? r.statusText}${detail}`);
      return;
    }
    const responseItems = Array.isArray((data as any).items) ? (data as any).items : [data];
    const savedItems: GaleriaItem[] = responseItems.map((row: any, idx: number) => ({
      id: Number(row.id ?? editingId ?? Math.max(0, ...galeria.map((g) => g.id)) + 1 + idx),
      titulo: String(row.titulo ?? payload.titulo),
      tituloEu: String(row.tituloEu ?? payload.tituloEu),
      fecha: String(row.fecha ?? payload.fecha),
      tema: (row.tema === "Actividad" ? "Actividad" : "Evento"),
      mediaUrl: String(row.mediaUrl ?? mediaUrls[idx] ?? payload.mediaUrl ?? ""),
    }));
    if (editingId === null) {
      setGaleria((prev) => [...savedItems, ...prev]);
    } else {
      const current = galeria.find((g) => g.id === editingId) ?? null;
      const currentAlbumKey = current ? `${current.tema}__${current.fecha}__${current.titulo}` : null;
      setGaleria((prev) => {
        const base = currentAlbumKey
          ? prev.filter((g) => `${g.tema}__${g.fecha}__${g.titulo}` !== currentAlbumKey)
          : prev.filter((g) => g.id !== editingId);
        return [...savedItems, ...base];
      });
    }
    setMode("list");
  };

  if (mode === "editor") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          {editingId === null ? (lang === "eu" ? "Galeriako elementu berria" : "Nuevo elemento de galería") : (lang === "eu" ? "Galeriako elementua editatu" : "Editar elemento de galería")}
        </h2>
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (ES)" : "Titulo (ES)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
            <input value={form.tituloEu} onChange={(e) => setForm((p) => ({ ...p, tituloEu: e.target.value }))} placeholder={lang === "eu" ? "Izenburua (EU)" : "Titulo (EU)"} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="date" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setForm((p) => ({ ...p, coverFile: file }));
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select value={form.tema} onChange={(e) => setForm((p) => ({ ...p, tema: e.target.value as "Evento" | "Actividad" }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm">
              <option value="Evento">{lang === "eu" ? "Ekitaldia" : "Evento"}</option>
              <option value="Actividad">{lang === "eu" ? "Jarduera" : "Actividad"}</option>
            </select>
            <input
              type="file"
              accept="image/*"
              multiple
              {...({ webkitdirectory: "true", directory: "true" } as any)}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                setForm((p) => ({ ...p, mediaFiles: files }));
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setMode("list")}>{lang === "eu" ? "Itzuli" : "Volver"}</Button>
            <Button onClick={saveGaleria}>{editingId === null ? (lang === "eu" ? "Gorde" : "Guardar") : (lang === "eu" ? "Eguneratu" : "Actualizar")}</Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "album" && selectedAlbumKey) {
    const album = albums.find((a) => a.key === selectedAlbumKey);
    if (!album) {
      setMode("list");
    } else {
      const safeIndex = Math.min(Math.max(selectedAlbumIndex, 0), Math.max(album.items.length - 1, 0));
      const currentPhoto = album.items[safeIndex] ?? album.items[0];
      const goPrev = () => setSelectedAlbumIndex((prev) => (prev - 1 + album.items.length) % album.items.length);
      const goNext = () => setSelectedAlbumIndex((prev) => (prev + 1) % album.items.length);
      return (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? album.cover.tituloEu : album.cover.titulo}</h2>
              <p className="text-sm text-muted-foreground">
                {new Date(album.cover.fecha).toLocaleDateString("es-ES")} · {lang === "eu" ? (album.cover.tema === "Evento" ? "Ekitaldia" : "Jarduera") : album.cover.tema} · {album.items.length} {lang === "eu" ? "argazki" : "fotos"}
              </p>
            </div>
            <Button variant="outline" onClick={() => setMode("list")}>{lang === "eu" ? "Itzuli" : "Volver"}</Button>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4">
            <div className="relative rounded-xl overflow-hidden bg-muted/20 border border-border">
              <div className="aspect-video flex items-center justify-center">
                {currentPhoto?.mediaUrl ? (
                  <img
                    src={currentPhoto.mediaUrl}
                    alt={lang === "eu" ? currentPhoto.tituloEu : currentPhoto.titulo}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground">📷</div>
                )}
              </div>
              {album.items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    aria-label={lang === "eu" ? "Aurrekoa" : "Anterior"}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    aria-label={lang === "eu" ? "Hurrengoa" : "Siguiente"}
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            <div className="mt-3 text-sm text-muted-foreground text-center">
              {safeIndex + 1} / {album.items.length}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {album.items.map((photo, idx) => (
                <button
                  key={`thumb-${photo.id}-${idx}`}
                  type="button"
                  onClick={() => setSelectedAlbumIndex(idx)}
                  className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border ${
                    idx === safeIndex ? "border-primary ring-2 ring-primary/20" : "border-border"
                  }`}
                >
                  {photo.mediaUrl ? (
                    <img src={photo.mediaUrl} alt={lang === "eu" ? photo.tituloEu : photo.titulo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/20 text-muted-foreground">📷</div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {album.items.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => {
                  const idx = album.items.findIndex((p) => p.id === photo.id);
                  setSelectedAlbumIndex(idx >= 0 ? idx : 0);
                }}
                className="block text-left bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all"
              >
                <div className="aspect-square bg-muted/20">
                  {photo.mediaUrl ? (
                    <img src={photo.mediaUrl} alt={lang === "eu" ? photo.tituloEu : photo.titulo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">📷</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{lang === "eu" ? "Argazki Galeria" : "Galería de Fotos"}</h2>
        {canCreate && <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" />{lang === "eu" ? "Argazkiak" : "Añadir fotos"}</Button>}
      </div>
      <div className="flex gap-3 flex-wrap items-center">
        <SearchBar value={search} onChange={setSearch} lang={lang} />
        <div className="flex gap-2 shrink-0">
          {(["todo", "Evento", "Actividad"] as const).map(t => (
            <button key={t} onClick={() => setTema(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tema === t ? "bg-primary text-white" : "bg-white border border-border text-foreground hover:border-primary/30"}`}>
              {t === "todo" ? (lang === "eu" ? "Dena" : "Todo") : t === "Evento" ? (lang === "eu" ? "Ekitaldia" : "Evento") : (lang === "eu" ? "Jarduera" : "Actividad")}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {albums.map(({ key, cover, items }) => (
          <button key={key} type="button" onClick={() => { setSelectedAlbumKey(key); setSelectedAlbumIndex(0); setMode("album"); }} className="text-left bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all cursor-pointer group">
            <div className="h-32 bg-linear-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              {cover.mediaUrl ? (
                <img src={cover.mediaUrl} alt={lang === "eu" ? cover.tituloEu : cover.titulo} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
              ) : (
                <span className="text-5xl group-hover:scale-110 transition-transform duration-300">📷</span>
              )}
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm text-foreground line-clamp-1">{lang === "eu" ? cover.tituloEu : cover.titulo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(cover.fecha).toLocaleDateString("es-ES", { month: "short", year: "numeric" })} · {lang === "eu" ? (cover.tema === "Evento" ? "Ekitaldia" : "Jarduera") : cover.tema} · {items.length} {lang === "eu" ? "argazki" : "fotos"}
              </p>
              {canCreate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 mt-2 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(cover);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {lang === "eu" ? "Editatu" : "Editar"}
                </Button>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Divulgacion() {
  const { lang } = useTranslation();
  const user = useStore(s => s.user);
  const [tab, setTab] = useState<Tab>("hoja");
  const canCreateHoja = user ? getUserRoles(user).includes("directivo") : false;
  const canCreatePulunpe = user ? getUserRoles(user).includes("directivo") : false;
  const canCreateNoticias = user ? getUserRoles(user).includes("directivo") : false;
  const canCreateArticulos = user ? getUserRoles(user).includes("directivo") : false;
  const canCreateGaleria = user ? getUserRoles(user).includes("directivo") : false;

  const TABS: { key: Tab; label: string; labelEu: string; icon: ReactNode }[] = [
    { key: "hoja", label: "Hoja Informativa", labelEu: "Informazio Orria", icon: <Newspaper className="w-4 h-4" /> },
    { key: "pulunpe", label: "Pulunpe", labelEu: "Pulunpe", icon: <FileText className="w-4 h-4" /> },
    { key: "noticias", label: "Noticias", labelEu: "Berriak", icon: <Newspaper className="w-4 h-4" /> },
    { key: "articulos", label: "Artículos", labelEu: "Artikuluak", icon: <BookOpen className="w-4 h-4" /> },
    { key: "galeria", label: "Galería", labelEu: "Galeria", icon: <ImageIcon className="w-4 h-4" /> },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const validTabs: Tab[] = ["hoja", "pulunpe", "noticias", "articulos", "galeria"];
    if (tabParam && validTabs.includes(tabParam as Tab)) {
      setTab(tabParam as Tab);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-linear-to-b from-primary/5 to-background py-14 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-foreground mb-3">
            {lang === "eu" ? "Dibulgazioa" : "Divulgación"}
          </h1>
          <p className="text-xl text-muted-foreground">
            {lang === "eu" ? "Informazio orria, Pulunpea, berriak, artikuluak eta galeria" : "Hoja informativa, Pulunpe, noticias, artículos y galería"}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-1 mb-8 overflow-x-auto pb-1 border-b border-border">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.icon}
              {lang === "eu" ? t.labelEu : t.label}
            </button>
          ))}
        </div>

        {tab === "hoja" && <HojaTab lang={lang} canCreate={canCreateHoja} />}
        {tab === "pulunpe" && <PulunpeTab lang={lang} canCreate={canCreatePulunpe} />}
        {tab === "noticias" && <NoticiasTab lang={lang} canCreate={canCreateNoticias} />}
        {tab === "articulos" && <ArticulosTab lang={lang} canCreate={canCreateArticulos} />}
        {tab === "galeria" && <GaleriaTab lang={lang} canCreate={canCreateGaleria} />}
      </div>
    </div>
  );
}
