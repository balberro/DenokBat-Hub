import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/i18n/translations";
import { baseDictionary, getMergedDictionary, saveOverrides, OVERRIDES_KEY } from "@/i18n/translations";
import type { Translations } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, Save, CheckCircle, AlertCircle } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  nav: "Navegación",
  menu: "Menú usuario",
  common: "Comunes",
  form: "Formularios",
  auth: "Acceso",
  contact: "Contacto",
  home: "Inicio",
  perfil: "Perfil",
  eventos: "Eventos",
  inscripciones: "Inscripciones",
  pagos: "Pagos",
  sugerencias: "Sugerencias",
  grupo: "Grupo delegado",
  grupo_inscripcion: "Inscripción grupo",
  admin: "Admin general",
  admin_roles: "Roles",
  socios: "Socios",
  textos: "Textos/Traducción",
  demo: "Sistema",
};

function getCategory(key: string): string {
  const prefix = key.split('.')[0];
  return CATEGORY_LABELS[prefix] ?? prefix;
}

function getOverrides(): Translations {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function normalizeOverrides(source: Translations): Translations {
  const normalized: Translations = {};
  for (const [key, entry] of Object.entries(source)) {
    const base = baseDictionary[key];
    if (!base) continue;
    if (entry.es !== base.es || entry.eu !== base.eu) {
      normalized[key] = entry;
    }
  }
  return normalized;
}

export default function AdminTextos() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [savedEdits, setSavedEdits] = useState<Translations>(() => normalizeOverrides(getOverrides()));
  const [edits, setEdits] = useState<Translations>(() => normalizeOverrides(getOverrides()));
  const [saved, setSaved] = useState(false);

  const allKeys = Object.keys(baseDictionary);

  const categories = useMemo(() => {
    const cats = new Set(allKeys.map(getCategory));
    return ["all", ...Array.from(cats).sort()];
  }, []);

  const filteredKeys = useMemo(() => {
    return allKeys.filter((key) => {
      const cat = getCategory(key);
      const matchCat = selectedCategory === "all" || CATEGORY_LABELS[key.split('.')[0]] === selectedCategory || cat === selectedCategory;
      if (!matchCat) return false;
      if (!search) return true;
      const base = baseDictionary[key];
      const edit = edits[key];
      return (
        key.toLowerCase().includes(search.toLowerCase()) ||
        (edit?.es ?? base.es).toLowerCase().includes(search.toLowerCase()) ||
        (edit?.eu ?? base.eu).toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [search, selectedCategory, edits]);

  const handleChange = (key: string, lang: 'es' | 'eu', value: string) => {
    setEdits((prev) => ({
      ...prev,
      [key]: {
        es: prev[key]?.es ?? baseDictionary[key].es,
        eu: prev[key]?.eu ?? baseDictionary[key].eu,
        [lang]: value,
      },
    }));
  };

  const handleReset = (key: string) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSaveAll = () => {
    const realOverrides = normalizeOverrides(edits);
    saveOverrides(realOverrides);
    setSavedEdits(realOverrides);
    setEdits(realOverrides);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetAll = () => {
    if (!confirm("¿Restablecer todos los textos al valor original?")) return;
    setEdits({});
    setSavedEdits({});
    saveOverrides({});
  };

  const isModified = (key: string) => {
    const base = baseDictionary[key];
    const current = edits[key] ?? base;
    const savedValue = savedEdits[key] ?? base;
    return current.es !== savedValue.es || current.eu !== savedValue.eu;
  };

  const modifiedCount = allKeys.filter(isModified).length;

  const isOverridden = (key: string) => {
    const e = edits[key];
    if (!e) return false;
    const base = baseDictionary[key];
    return e.es !== base.es || e.eu !== base.eu;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("textos.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-xl">{t("textos.subtitle")}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleResetAll} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
            <RotateCcw className="w-3.5 h-3.5" />{t("textos.reset_all")}
          </Button>
          <Button onClick={handleSaveAll} className="gap-2" disabled={modifiedCount === 0}>
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {t("textos.save_all")}
            {modifiedCount > 0 && (
              <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{modifiedCount}</span>
            )}
          </Button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4" />
          {t("textos.saved")}
        </div>
      )}

      {modifiedCount > 0 && !saved && (
        <div className="mb-4 flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4" />
          {modifiedCount} texto{modifiedCount !== 1 ? 's' : ''} modificado{modifiedCount !== 1 ? 's' : ''} sin guardar
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">{t("textos.all")}</option>
          {categories.filter((c) => c !== "all").map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-48">{t("textos.key")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">🇪🇸 {t("textos.spanish")}</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">🟢 {t("textos.basque")}</span>
              </th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredKeys.map((key) => {
              const base = baseDictionary[key];
              const current = edits[key];
              const esVal = current?.es ?? base.es;
              const euVal = current?.eu ?? base.eu;
              const modified = isModified(key);
              const overridden = isOverridden(key);

              return (
                <tr key={key} className={`hover:bg-muted/10 transition-colors ${modified ? "bg-yellow-50/50" : ""}`}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-mono text-xs text-muted-foreground">{key}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{getCategory(key)}</p>
                    {modified && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-md">{t("textos.modified")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea
                      value={esVal}
                      onChange={(e) => handleChange(key, 'es', e.target.value)}
                      rows={esVal.length > 60 ? 3 : 1}
                      className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${overridden && esVal !== base.es ? "border-yellow-400 bg-yellow-50" : "border-border bg-muted/20"}`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea
                      value={euVal}
                      onChange={(e) => handleChange(key, 'eu', e.target.value)}
                      rows={euVal.length > 60 ? 3 : 1}
                      className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${overridden && euVal !== base.eu ? "border-yellow-400 bg-yellow-50" : "border-border bg-muted/20"}`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    {modified && (
                      <button
                        onClick={() => handleReset(key)}
                        title={t("textos.reset")}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredKeys.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">{t("common.no_data")}</div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3">{filteredKeys.length} entradas</p>
    </div>
  );
}
