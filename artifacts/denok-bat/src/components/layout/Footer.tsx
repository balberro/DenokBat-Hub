import { useTranslation } from "@/i18n/translations";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Footer() {
  const { t, lang } = useTranslation();
  const [cfg, setCfg] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/config/public`);
        const d = await r.json();
        if (!active || !r.ok) return;
        setCfg({
          logoText: String(d?.["footer.logo_text"] ?? ""),
          logoTextEu: String(d?.["footer.logo_text_eu"] ?? ""),
          address: String(d?.["footer.contact.address"] ?? ""),
          phone: String(d?.["footer.contact.phone"] ?? ""),
          email: String(d?.["footer.contact.email"] ?? ""),
          whatsapp: String(d?.["footer.contact.whatsapp"] ?? ""),
        });
      } catch {
        // keep defaults
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const footerLogoText = lang === "eu"
    ? (cfg.logoTextEu || "")
    : (cfg.logoText || "");

  return (
    <footer className="bg-foreground text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          <div>
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`} 
              alt="Logo" 
              className="h-16 w-auto mb-6 bg-white p-2 rounded-xl"
            />
            <p className="text-gray-300 text-lg">
              {footerLogoText}
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-display font-bold mb-6 text-primary-foreground">{t('nav.contact')}</h3>
            <ul className="space-y-4 text-lg text-gray-300">
              <li className="flex items-start gap-3">
                <MapPin className="w-6 h-6 text-primary shrink-0 mt-1" />
                <span className="whitespace-pre-line">{cfg.address || "-"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-6 h-6 text-primary shrink-0" />
                <span>{cfg.phone || "-"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-primary shrink-0" />
                <span>{cfg.email || "-"}</span>
              </li>
              <li className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-primary shrink-0" />
                <span>{cfg.whatsapp || "-"}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-2xl font-display font-bold mb-6 text-primary-foreground">Enlaces útiles</h3>
            <ul className="space-y-3 text-lg text-gray-300">
              <li><Link href="/quienes-somos" className="hover:text-primary transition-colors">{t('nav.about')}</Link></li>
              <li><Link href="/actividades" className="hover:text-primary transition-colors">{t('nav.activities')}</Link></li>
              <li><Link href="/servicios" className="hover:text-primary transition-colors">{t('nav.services')}</Link></li>
              <li><Link href="/sugerencias" className="hover:text-primary transition-colors">{t('nav.suggestions')}</Link></li>
            </ul>
          </div>

        </div>
        
        <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400">
          <p>© {new Date().getFullYear()} Denok Bat. {t("footer.rights_reserved")}</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">{t("footer.legal_notice")}</a>
            <Link href="/privacidad" className="hover:text-white transition-colors">{t("footer.privacy")}</Link>
            <a href="#" className="hover:text-white transition-colors">{t("footer.cookies")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
