import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n/translations";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEFAULT_TITLE = {
  es: "Aviso legal",
  eu: "Lege oharra",
};

const DEFAULT_BODY = {
  es: `Titular: Asociación Denok Bat Elkartea.

Objeto: Este sitio web ofrece información sobre la asociación, sus actividades, servicios y canales de relación con socios y usuarios.

Condiciones de uso: La persona usuaria se compromete a utilizar el sitio web de forma adecuada, lícita y respetuosa con los derechos de terceros.

Propiedad intelectual: Los contenidos, textos, imágenes y elementos gráficos pertenecen a Denok Bat o se utilizan con autorización, salvo indicación expresa.

Responsabilidad: Denok Bat procura mantener la información actualizada, aunque no garantiza la ausencia de errores puntuales. Para cualquier aclaración puede contactar con la asociación.`,
  eu: `Titularra: Asociación Denok Bat Elkartea.

Xedea: Webgune honek elkarteari, jarduerei, zerbitzuei eta bazkideekin nahiz erabiltzaileekin harremanetan jartzeko kanalei buruzko informazioa eskaintzen du.

Erabilera-baldintzak: Erabiltzaileak webgunea modu egokian, zilegian eta hirugarrenen eskubideak errespetatuz erabiltzeko konpromisoa hartzen du.

Jabetza intelektuala: Edukiak, testuak, irudiak eta elementu grafikoak Denok Bat-enak dira edo baimenarekin erabiltzen dira, berariaz besterik adierazten ez bada.

Erantzukizuna: Denok Bat-ek informazioa eguneratuta mantentzen saiatzen da, baina ez du bermatzen unean uneko akatsik ez egotea. Argibideren bat behar izanez gero, elkartearekin harremanetan jar zaitezke.`,
};

export default function AvisoLegal() {
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
          titleEs: String(d?.["legal.notice_title_es"] ?? ""),
          titleEu: String(d?.["legal.notice_title_eu"] ?? ""),
          bodyEs: String(d?.["legal.notice_body_es"] ?? ""),
          bodyEu: String(d?.["legal.notice_body_eu"] ?? ""),
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
