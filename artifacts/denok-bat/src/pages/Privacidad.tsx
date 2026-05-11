import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n/translations";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEFAULT_TITLE = {
  es: "Política de privacidad",
  eu: "Pribatutasun politika",
};

const DEFAULT_BODY = {
  es: `Responsable: Asociación Denok Bat Elkartea.

Finalidad: Gestionar su inscripción como usuario, permitirle el acceso al área privada y enviarle comunicaciones relacionadas con nuestra actividad.

Legitimación: Ejecución de un contrato (inscripción) y consentimiento del interesado.

Destinatarios: No se cederán datos a terceros, salvo obligación legal.

Derechos: Tiene derecho a acceder, rectificar y suprimir sus datos, así como otros derechos detallados en esta política de privacidad.

Información adicional: Si necesita más información, puede contactar con la asociación a través de los canales habilitados en la web.`,
  eu: `Arduraduna: Asociación Denok Bat Elkartea.

Helburua: Erabiltzaile gisa zure izen-ematea kudeatzea, eremu pribatura sarbidea ematea eta gure jarduerarekin lotutako komunikazioak bidaltzea.

Legitimazioa: Kontratu baten betearazpena (izen-ematea) eta interesdunaren baimena.

Hartzaileak: Ez zaizkie datuak hirugarrenei lagako, legezko betebeharra dagoenean izan ezik.

Eskubideak: Zure datuak eskuratzeko, zuzentzeko eta ezabatzeko eskubidea duzu, baita pribatutasun-politika honetan zehaztutako beste eskubide batzuk ere.

Informazio osagarria: Informazio gehiago behar baduzu, webgunean gaitutako kanalen bidez jar zaitezke elkartearekin harremanetan.`,
};

export default function Privacidad() {
  const { lang } = useTranslation();
  const [cfg, setCfg] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/config/public`);
        if (!r.ok) return;
        const d = await r.json();
        if (!active) return;
        setCfg({
          titleEs: String(d?.["privacy.policy_title_es"] ?? ""),
          titleEu: String(d?.["privacy.policy_title_eu"] ?? ""),
          bodyEs: String(d?.["privacy.policy_body_es"] ?? ""),
          bodyEu: String(d?.["privacy.policy_body_eu"] ?? ""),
        });
      } catch {
        // keep defaults
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const title = useMemo(() => {
    if (lang === "eu") return cfg.titleEu || DEFAULT_TITLE.eu;
    return cfg.titleEs || DEFAULT_TITLE.es;
  }, [cfg, lang]);

  const body = useMemo(() => {
    if (lang === "eu") return cfg.bodyEu || DEFAULT_BODY.eu;
    return cfg.bodyEs || DEFAULT_BODY.es;
  }, [cfg, lang]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      <h1 className="text-4xl font-bold text-foreground mb-6">{title}</h1>
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
        <div className="prose prose-gray max-w-none whitespace-pre-wrap text-muted-foreground">
          {body}
        </div>
      </div>
    </div>
  );
}
