import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n/translations";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEFAULT_TITLE = {
  es: "Cookies",
  eu: "Cookieak",
};

const DEFAULT_BODY = {
  es: `Este sitio web puede utilizar cookies técnicas necesarias para su funcionamiento y, en su caso, cookies de análisis o preferencias cuando estén habilitadas.

Qué son las cookies: Son pequeños archivos que se almacenan en el dispositivo de la persona usuaria para recordar información de navegación o permitir determinadas funcionalidades.

Cookies necesarias: Permiten el funcionamiento básico del sitio, como mantener la sesión o recordar preferencias imprescindibles.

Gestión: Puede configurar o bloquear las cookies desde su navegador. Algunas funciones podrían no estar disponibles si se desactivan las cookies necesarias.

Actualizaciones: Esta política podrá actualizarse cuando cambien las herramientas utilizadas por el sitio web.`,
  eu: `Webgune honek funtzionamendurako beharrezkoak diren cookie teknikoak erabil ditzake eta, hala badagokio, analisi- edo lehentasun-cookieak gaituta daudenean.

Zer dira cookieak: Erabiltzailearen gailuan gordetzen diren fitxategi txikiak dira, nabigazio-informazioa gogoratzeko edo funtzionalitate jakin batzuk ahalbidetzeko.

Beharrezko cookieak: Webgunearen oinarrizko funtzionamendua ahalbidetzen dute, hala nola saioa mantentzea edo ezinbesteko lehentasunak gogoratzea.

Kudeaketa: Cookieak nabigatzailetik konfiguratu edo blokeatu ditzakezu. Beharrezko cookieak desgaituz gero, funtzio batzuk erabilgarri ez egon daitezke.

Eguneraketak: Politika hau eguneratu ahal izango da webguneak erabiltzen dituen tresnak aldatzen direnean.`,
};

export default function Cookies() {
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
          titleEs: String(d?.["legal.cookies_title_es"] ?? ""),
          titleEu: String(d?.["legal.cookies_title_eu"] ?? ""),
          bodyEs: String(d?.["legal.cookies_body_es"] ?? ""),
          bodyEu: String(d?.["legal.cookies_body_eu"] ?? ""),
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
