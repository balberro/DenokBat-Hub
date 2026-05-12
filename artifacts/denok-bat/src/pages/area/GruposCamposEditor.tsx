import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AsociacionCampoExtraUi, AsociacionGrupoCamposUi } from "@/lib/asociacionGruposCampos";
import { parseGruposCamposJsonUi } from "@/lib/asociacionGruposCampos";
import { Plus, Trash2 } from "lucide-react";

function newGrupo(): AsociacionGrupoCamposUi {
  const id = `g_${Date.now()}`;
  return { id, titulo_es: "", titulo_eu: "", campos: [] };
}

function newCampo(): AsociacionCampoExtraUi {
  const id = `c_${Date.now()}`;
  return { id, label_es: "", label_eu: "", tipo: "text" };
}

type Props = {
  value: string;
  onChange: (json: string) => void;
};

export default function GruposCamposEditor({ value, onChange }: Props) {
  const { t, lang } = useTranslation();
  const [rawMode, setRawMode] = useState(false);
  const [draft, setDraft] = useState<AsociacionGrupoCamposUi[]>([]);

  useEffect(() => {
    const p = parseGruposCamposJsonUi(value);
    if (p === null && value.trim()) {
      setRawMode(true);
    } else {
      setRawMode(false);
      setDraft(p ?? []);
    }
  }, [value]);

  function pushChange(next: AsociacionGrupoCamposUi[]) {
    setDraft(next);
    onChange(JSON.stringify(next));
  }

  if (rawMode) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{t("asoc.grupos_invalid_json")}</p>
        <textarea
          className="w-full min-h-[140px] font-mono text-xs px-3 py-2 rounded-xl border border-border bg-background"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => setRawMode(false)}>
          {t("asoc.grupos_try_ui_editor")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {draft.map((g, gi) => (
        <div key={g.id} className="rounded-xl border border-border p-4 space-y-3 bg-muted/10">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {t("asoc.grupo_heading")} {gi + 1}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive shrink-0"
              onClick={() => pushChange(draft.filter((_, i) => i !== gi))}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("asoc.grupo_id")}</label>
              <Input
                value={g.id}
                onChange={(e) => {
                  const next = draft.slice();
                  next[gi] = { ...g, id: e.target.value };
                  pushChange(next);
                }}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("asoc.grupo_titulo_es")}</label>
              <Input
                value={g.titulo_es}
                onChange={(e) => {
                  const next = draft.slice();
                  next[gi] = { ...g, titulo_es: e.target.value };
                  pushChange(next);
                }}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("asoc.grupo_titulo_eu")}</label>
              <Input
                value={g.titulo_eu}
                onChange={(e) => {
                  const next = draft.slice();
                  next[gi] = { ...g, titulo_eu: e.target.value };
                  pushChange(next);
                }}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{t("asoc.campos_en_grupo")}</p>
            {g.campos.map((c, ci) => (
              <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border-t border-border/60 pt-2">
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">{t("asoc.campo_id")}</label>
                  <Input
                    value={c.id}
                    onChange={(e) => {
                      const next = draft.slice();
                      const campos = g.campos.slice();
                      campos[ci] = { ...c, id: e.target.value };
                      next[gi] = { ...g, campos };
                      pushChange(next);
                    }}
                    className="mt-0.5 font-mono text-xs"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-muted-foreground">{t("asoc.campo_label_es")}</label>
                  <Input
                    value={c.label_es}
                    onChange={(e) => {
                      const next = draft.slice();
                      const campos = g.campos.slice();
                      campos[ci] = { ...c, label_es: e.target.value };
                      next[gi] = { ...g, campos };
                      pushChange(next);
                    }}
                    className="mt-0.5"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-muted-foreground">{t("asoc.campo_label_eu")}</label>
                  <Input
                    value={c.label_eu}
                    onChange={(e) => {
                      const next = draft.slice();
                      const campos = g.campos.slice();
                      campos[ci] = { ...c, label_eu: e.target.value };
                      next[gi] = { ...g, campos };
                      pushChange(next);
                    }}
                    className="mt-0.5"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">{t("asoc.campo_tipo")}</label>
                  <select
                    value={c.tipo}
                    onChange={(e) => {
                      const next = draft.slice();
                      const campos = g.campos.slice();
                      campos[ci] = { ...c, tipo: e.target.value === "textarea" ? "textarea" : "text" };
                      next[gi] = { ...g, campos };
                      pushChange(next);
                    }}
                    className="mt-0.5 flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="text">{t("asoc.campo_tipo_text")}</option>
                    <option value="textarea">{t("asoc.campo_tipo_textarea")}</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      const next = draft.slice();
                      next[gi] = { ...g, campos: g.campos.filter((_, j) => j !== ci) };
                      pushChange(next);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                const next = draft.slice();
                next[gi] = { ...g, campos: [...g.campos, newCampo()] };
                pushChange(next);
              }}
            >
              <Plus className="w-4 h-4" />
              {t("asoc.add_campo")}
            </Button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1"
          onClick={() => pushChange([...draft, newGrupo()])}
        >
          <Plus className="w-4 h-4" />
          {t("asoc.add_grupo")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setRawMode(true)}>
          {t("asoc.grupos_edit_raw")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{lang === "eu" ? t("asoc.grupos_hint_eu") : t("asoc.grupos_hint_es")}</p>
    </div>
  );
}
