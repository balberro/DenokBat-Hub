import { useStore } from '@/store/use-store';
import { useCallback } from 'react';

type Translations = Record<string, { es: string; eu: string }>;

const dictionary: Translations = {
  // Navigation
  'nav.home': { es: 'Inicio', eu: 'Hasiera' },
  'nav.about': { es: 'Quiénes somos', eu: 'Nor gara' },
  'nav.active_aging': { es: 'Envejecimiento activo', eu: 'Zahartze aktiboa' },
  'nav.activities': { es: 'Actividades', eu: 'Jarduerak' },
  'nav.events': { es: 'Eventos', eu: 'Gertaerak' },
  'nav.news': { es: 'Divulgación', eu: 'Dibulgazioa' },
  'nav.services': { es: 'Servicios', eu: 'Zerbitzuak' },
  'nav.suggestions': { es: 'Sugerencias', eu: 'Iradokizunak' },
  'nav.contact': { es: 'Contacto', eu: 'Harremana' },
  'nav.login': { es: 'Acceder', eu: 'Saioa hasi' },
  'nav.logout': { es: 'Cerrar sesión', eu: 'Saioa itxi' },
  'nav.dashboard': { es: 'Mi Panel', eu: 'Nire Panela' },

  // Common UI
  'common.read_more': { es: 'Leer más', eu: 'Gehiago irakurri' },
  'common.see_all': { es: 'Ver todo', eu: 'Guztia ikusi' },
  'common.enroll': { es: 'Inscribirse', eu: 'Izena eman' },
  'common.enrolled': { es: 'Inscrito', eu: 'Izena emanda' },
  'common.cancel': { es: 'Cancelar', eu: 'Utzi' },
  'common.save': { es: 'Guardar', eu: 'Gorde' },
  'common.loading': { es: 'Cargando...', eu: 'Kargatzen...' },
  'common.error': { es: 'Ha ocurrido un error', eu: 'Errore bat gertatu da' },
  'common.spots_available': { es: 'plazas disponibles', eu: 'plaza libre' },
  'common.full': { es: 'Completo', eu: 'Beteta' },

  // Home
  'home.hero_title': { es: 'Tu punto de encuentro', eu: 'Zure elkargunea' },
  'home.hero_subtitle': { es: 'Bienvenido a Denok Bat. Disfruta de actividades, eventos y servicios pensados para tu bienestar.', eu: 'Ongi etorri Denok Bat-era. Gozatu zure ongizaterako pentsatutako jarduera, gertaera eta zerbitzuez.' },
  'home.join_us': { es: 'Únete ahora', eu: 'Egin zaitez bazkide' },
  'home.upcoming_events': { es: 'Próximos eventos', eu: 'Hurrengo gertaerak' },
  'home.latest_news': { es: 'Últimas noticias', eu: 'Azken berriak' },

  // Forms
  'form.name': { es: 'Nombre', eu: 'Izena' },
  'form.email': { es: 'Correo electrónico', eu: 'Posta elektronikoa' },
  'form.message': { es: 'Mensaje', eu: 'Mezua' },
  'form.send': { es: 'Enviar', eu: 'Bidali' },
  'form.category': { es: 'Categoría', eu: 'Kategoria' },

  // Auth
  'auth.username': { es: 'Usuario', eu: 'Erabiltzailea' },
  'auth.password': { es: 'Contraseña', eu: 'Pasahitza' },
  'auth.login_cta': { es: 'Iniciar sesión', eu: 'Saioa hasi' },

  // Demo Mode
  'demo.banner': { es: 'Modo Demo (Sin conexión a Odoo)', eu: 'Demo modua (Odoo konexiorik gabe)' },
};

export function useTranslation() {
  const { lang, setLang } = useStore();

  const t = useCallback((key: string): string => {
    if (!dictionary[key]) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    return dictionary[key][lang];
  }, [lang]);

  // Helper for bilingual content from DB (e.g., item.nombre / item.nombreEu)
  const tb = useCallback(<T extends Record<string, any>>(item: T, key: string): string => {
    if (!item) return '';
    if (lang === 'eu' && item[`${key}Eu`]) {
      return item[`${key}Eu`];
    }
    return item[key] || '';
  }, [lang]);

  return { t, tb, lang, setLang };
}
