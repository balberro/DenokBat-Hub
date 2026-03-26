import { useTranslation } from "@/i18n/translations";
import { MapPin, Phone, Mail } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  const { t } = useTranslation();

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
              {t('home.hero_subtitle')}
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-display font-bold mb-6 text-primary-foreground">{t('nav.contact')}</h3>
            <ul className="space-y-4 text-lg text-gray-300">
              <li className="flex items-start gap-3">
                <MapPin className="w-6 h-6 text-primary shrink-0 mt-1" />
                <span>Calle Mayor 12, Planta Baja<br/>20001 Donostia-San Sebastián</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-6 h-6 text-primary shrink-0" />
                <span>943 123 456</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-primary shrink-0" />
                <span>contacto@denokbat.org</span>
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
          <p>© {new Date().getFullYear()} Denok Bat. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Aviso Legal</a>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
