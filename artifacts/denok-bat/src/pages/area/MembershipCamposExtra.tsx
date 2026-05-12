import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/translations";
import type { AsociacionGrupoCamposUi } from "@/lib/asociacionGruposCampos";

type Props = {
  grupos: AsociacionGrupoCamposUi[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

export default function MembershipCamposExtra({ grupos, values, onChange }: Props) {
  const { t, lang } = useTranslation();
  if (!grupos.length) return null;

  return (
    <div className="space-y-5 rounded-xl border border-border p-4 bg-muted/10">
      <p className="text-sm font-semibold text-foreground">{t("perfil.membership_extra_section")}</p>
      {grupos.map((g) => (
        <div key={g.id} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {lang === "eu" ? g.titulo_eu : g.titulo_es}
          </p>
          <div className="grid grid-cols-1 gap-3">
            {g.campos.map((c) => {
              const fieldKey = `${g.id}.${c.id}`;
              const val = values[fieldKey] ?? "";
              const label = lang === "eu" ? c.label_eu : c.label_es;
              return c.tipo === "textarea" ? (
                <div key={fieldKey}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <Textarea
                    value={val}
                    onChange={(e) => onChange(fieldKey, e.target.value)}
                    rows={3}
                    className="resize-y min-h-[72px]"
                  />
                </div>
              ) : (
                <div key={fieldKey}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <Input value={val} onChange={(e) => onChange(fieldKey, e.target.value)} className="h-11" />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
