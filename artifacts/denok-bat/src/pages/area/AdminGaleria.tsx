import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Search } from "lucide-react";
import { useTranslation } from "@/i18n/translations";
import { useStore } from "@/store/use-store";

type GaleriaItem = {
  id: number;
  titulo: string;
  tituloEu: string;
  fecha: string;
  tema: "Evento" | "Actividad";
  mediaUrl?: string | null;
};

const GALERIA: GaleriaItem[] = [
  { id: 1, titulo: "Excursión a Bilbao", tituloEu: "Bilbaoko Txangoa", fecha: "2026-03-08", tema: "Evento", mediaUrl: null },
  { id: 2, titulo: "Fiesta de Carnavales", tituloEu: "Inauterietako Jaia", fecha: "2026-02-14", tema: "Evento", mediaUrl: null },
  { id: 3, titulo: "Clase de Yoga - Enero", tituloEu: "Yoga Klasea - Urtarrila", fecha: "2026-01-15", tema: "Actividad", mediaUrl: null },
  { id: 4, titulo: "Torneo de Mus", tituloEu: "Mus Txapelketa", fecha: "2026-02-05", tema: "Actividad", mediaUrl: null },
  { id: 5, titulo: "Almuerzo de Navidad", tituloEu: "Gabonetako Bazkaria", fecha: "2025-12-20", tema: "Evento", mediaUrl: null },
  { id: 6, titulo: "Senderismo Otoño", tituloEu: "Udazkeneko Mendi-ibilaldia", fecha: "2025-10-12", tema: "Actividad", mediaUrl: null },
];


function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input value={value} onChange={e => onChange(e.target.value)}

        placeholder={t("common.search")}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
    </div>
  );
}

/**
 * ÚNICO editor de la galería de fotos (álbumes).
 *
 * Se comparte entre el editor de la página «Nosotros» (pestaña Galería) y la
 * página de Divulgación (pestaña Galería). Ambos usan la misma fuente de datos
 * (`/api/galeria`), de modo que lo que se edita aquí se refleja en los dos sitios.
 */
export default function AdminGaleria({ lang, canCreate }: { lang: string; canCreate: boolean }) {
  const { t } = useTranslation();
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
      alert(t("galeria.error_titulo"));
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
      alert(t("galeria.error_foto_tarjeta"));
      return;
    }
    if (mediaUrls.length === 0 && existingAlbumItems.length > 0) {
      mediaUrls = existingAlbumItems
        .map((g) => g.mediaUrl)
        .filter((u): u is string => Boolean(u));
    }
    if (mediaUrls.length === 0) {
      alert(t("galeria.error_foto_album"));
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
          {editingId === null ? t("galeria.nuevo") : t("galeria.editar_elemento")}
        </h2>
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder={t("galeria.titulo_es")} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
            <input value={form.tituloEu} onChange={(e) => setForm((p) => ({ ...p, tituloEu: e.target.value }))} placeholder={t("galeria.titulo_eu")} className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm" />
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
              <option value="Evento">{t("galeria.evento")}</option>
              <option value="Actividad">{t("galeria.actividad")}</option>
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
            <Button variant="outline" onClick={() => setMode("list")}>{t("common.back")}</Button>
            <Button onClick={saveGaleria}>{editingId === null ? t("common.save") : t("galeria.actualizar")}</Button>
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
                {new Date(album.cover.fecha).toLocaleDateString("es-ES")} · {t(album.cover.tema === "Evento" ? "galeria.evento" : "galeria.actividad")} · {album.items.length} {t("galeria.fotos")}
              </p>
            </div>
            <Button variant="outline" onClick={() => setMode("list")}>{t("common.back")}</Button>
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
                    aria-label={t("common.previous")}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    aria-label={t("common.next")}
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
        <h2 className="text-2xl font-bold text-foreground">{t("galeria.titulo")}</h2>
        {canCreate && <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" />{t("galeria.anadir_fotos")}</Button>}
      </div>
      <div className="flex gap-3 flex-wrap items-center">

        <SearchBar value={search} onChange={setSearch} />
        <div className="flex gap-2 shrink-0">




          {(["todo", "Evento", "Actividad"] as const).map(filtro => (
            <button key={filtro} onClick={() => setTema(filtro)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tema === filtro ? "bg-primary text-white" : "bg-white border border-border text-foreground hover:border-primary/30"}`}>
              {filtro === "todo" ? t("galeria.todo") : filtro === "Evento" ? t("galeria.evento") : t("galeria.actividad")}
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
                {new Date(cover.fecha).toLocaleDateString("es-ES", { month: "short", year: "numeric" })} · {t(cover.tema === "Evento" ? "galeria.evento" : "galeria.actividad")} · {items.length} {t("galeria.fotos")}
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
                  {t("common.edit")}
                </Button>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
