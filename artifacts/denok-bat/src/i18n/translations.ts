import { useStore } from '@/store/use-store';
import { useCallback } from 'react';

type Translations = Record<string, { es: string; eu: string }>;

const dictionary: Translations = {
  // Navigation
  'nav.home': { es: 'Inicio', eu: 'Hasiera' },
  'nav.about': { es: 'Nosotros', eu: 'Nor gara' },
  'nav.active_aging': { es: 'Envejecimiento activo', eu: 'Zahartze aktiboa' },
  'nav.activities': { es: 'Actividades', eu: 'Jarduerak' },
  'nav.events': { es: 'Eventos', eu: 'Gertaerak' },
  'nav.news': { es: 'Divulgación', eu: 'Dibulgazioa' },
  'nav.services': { es: 'Servicios', eu: 'Zerbitzuak' },
  'nav.suggestions': { es: 'Sugerencias', eu: 'Iradokizunak' },
  'nav.contact': { es: 'Contacto', eu: 'Harremana' },
  'nav.login': { es: 'Mi cuenta', eu: 'Nire kontua' },
  'nav.logout': { es: 'Salir', eu: 'Irten' },
  'nav.dashboard': { es: 'Mi Panel', eu: 'Nire Panela' },

  // User menu items by role
  'menu.perfil': { es: 'Mi perfil', eu: 'Nire profila' },
  'menu.mis_eventos': { es: 'Mis eventos', eu: 'Nire gertaerak' },
  'menu.mis_inscripciones': { es: 'Mis inscripciones', eu: 'Nire izena-emateak' },
  'menu.mis_pagos': { es: 'Mis pagos', eu: 'Nire ordainketak' },
  'menu.mis_sugerencias': { es: 'Mis sugerencias', eu: 'Nire iradokizunak' },
  'menu.mi_grupo': { es: 'Mi grupo', eu: 'Nire taldea' },
  'menu.inscripciones_grupo': { es: 'Listado de inscripción', eu: 'Inskripzio-zerrenda' },
  'menu.admin_eventos': { es: 'Eventos', eu: 'Gertaerak' },
  'menu.admin_actividades': { es: 'Actividades', eu: 'Jarduerak' },
  'menu.gestion_socios': { es: 'Gestión de socios', eu: 'Bazkideen kudeaketa' },
  'menu.gestion_contable': { es: 'Gestión contable', eu: 'Kudeaketa kontablea' },
  'menu.subvenciones': { es: 'Subvenciones', eu: 'Laguntzak' },
  'menu.divulgacion_admin': { es: 'Divulgación', eu: 'Dibulgazioa' },
  'menu.documentacion': { es: 'Documentación', eu: 'Dokumentazioa' },
  'menu.roles': { es: 'Roles', eu: 'Rolak' },
  'menu.proveedores': { es: 'Proveedores', eu: 'Hornitzaileak' },
  'menu.odoo': { es: 'Odoo', eu: 'Odoo' },
  'menu.app': { es: 'App', eu: 'App' },

  // Common UI
  'common.read_more': { es: 'Leer más', eu: 'Gehiago irakurri' },
  'common.see_all': { es: 'Ver todo', eu: 'Guztia ikusi' },
  'common.enroll': { es: 'Inscribirse', eu: 'Izena eman' },
  'common.enrolled': { es: 'Inscrito', eu: 'Izena emanda' },
  'common.cancel': { es: 'Cancelar', eu: 'Utzi' },
  'common.save': { es: 'Guardar', eu: 'Gorde' },
  'common.edit': { es: 'Editar', eu: 'Editatu' },
  'common.delete': { es: 'Eliminar', eu: 'Ezabatu' },
  'common.create': { es: 'Crear nuevo', eu: 'Berria sortu' },
  'common.loading': { es: 'Cargando...', eu: 'Kargatzen...' },
  'common.error': { es: 'Ha ocurrido un error', eu: 'Errore bat gertatu da' },
  'common.spots_available': { es: 'plazas disponibles', eu: 'plaza libre' },
  'common.full': { es: 'Completo', eu: 'Beteta' },
  'common.open': { es: 'Abierto', eu: 'Irekita' },
  'common.closed': { es: 'Cerrado', eu: 'Itxita' },
  'common.pending': { es: 'Pendiente', eu: 'Zain' },
  'common.paid': { es: 'Pagado', eu: 'Ordainduta' },
  'common.total': { es: 'Total', eu: 'Guztira' },
  'common.date': { es: 'Fecha', eu: 'Data' },
  'common.amount': { es: 'Importe', eu: 'Zenbatekoa' },
  'common.status': { es: 'Estado', eu: 'Egoera' },
  'common.actions': { es: 'Acciones', eu: 'Ekintzak' },
  'common.name': { es: 'Nombre', eu: 'Izena' },
  'common.back': { es: 'Volver', eu: 'Itzuli' },
  'common.confirm': { es: 'Confirmar', eu: 'Baieztatu' },
  'common.modify': { es: 'Modificar', eu: 'Aldatu' },
  'common.detail': { es: 'Ver detalle', eu: 'Xehetasunak ikusi' },
  'common.send': { es: 'Enviar', eu: 'Bidali' },
  'common.print': { es: 'Imprimir', eu: 'Inprimatu' },
  'common.export': { es: 'Exportar', eu: 'Esportatu' },
  'common.search': { es: 'Buscar', eu: 'Bilatu' },
  'common.filter': { es: 'Filtrar', eu: 'Iragazi' },
  'common.no_data': { es: 'No hay datos disponibles', eu: 'Ez dago daturik' },
  'common.yes': { es: 'Sí', eu: 'Bai' },
  'common.no': { es: 'No', eu: 'Ez' },
  'common.role': { es: 'Rol', eu: 'Rola' },
  'common.member': { es: 'Socio', eu: 'Bazkidea' },
  'common.gender': { es: 'Género', eu: 'Generoa' },
  'common.phone': { es: 'Teléfono', eu: 'Telefonoa' },
  'common.address': { es: 'Dirección', eu: 'Helbidea' },

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
  'form.phone': { es: 'Teléfono', eu: 'Telefonoa' },
  'form.send_message_title': { es: 'Envíanos un mensaje', eu: 'Bidali mezu bat' },

  // Auth
  'auth.username': { es: 'Usuario', eu: 'Erabiltzailea' },
  'auth.password': { es: 'Contraseña', eu: 'Pasahitza' },
  'auth.login_cta': { es: 'Iniciar sesión', eu: 'Saioa hasi' },
  'auth.login_subtitle': { es: 'Accede a tu cuenta para inscribirte en actividades y gestionar tu perfil.', eu: 'Sar zaitez jardueretan izena emateko eta zure profila kudeatzeko.' },
  'auth.no_member': { es: '¿No eres socio?', eu: 'Ez zara bazkide?' },
  'auth.contact_us': { es: 'Contacta con nosotros', eu: 'Jarri gurekin harremanetan' },
  'auth.forgot_password': { es: '¿Olvidaste tu contraseña?', eu: 'Pasahitza ahaztu duzu?' },

  // Contact page
  'contact.subtitle': { es: 'Estamos aquí para ayudarte', eu: 'Hemen gaude zuri laguntzeko' },
  'contact.info_title': { es: 'Información de contacto', eu: 'Kontaktu-informazioa' },
  'contact.address_label': { es: 'Dirección', eu: 'Helbidea' },
  'contact.phone_label': { es: 'Teléfono', eu: 'Telefonoa' },
  'contact.email_label': { es: 'Email', eu: 'Posta elektronikoa' },
  'contact.hours_label': { es: 'Horario', eu: 'Ordutegia' },
  'contact.sent_title': { es: '¡Mensaje enviado!', eu: 'Mezua bidalita!' },
  'contact.sent_body': { es: 'Nos pondremos en contacto contigo pronto.', eu: 'Laster harremanetan jarriko gara zurekin.' },

  // Profile page
  'perfil.title': { es: 'Mi perfil', eu: 'Nire profila' },
  'perfil.photo': { es: 'Foto de perfil', eu: 'Profil-argazkia' },
  'perfil.change_photo': { es: 'Cambiar foto', eu: 'Argazkia aldatu' },
  'perfil.personal_data': { es: 'Datos personales', eu: 'Datu pertsonalak' },
  'perfil.save_changes': { es: 'Guardar cambios', eu: 'Aldaketak gorde' },
  'perfil.surname': { es: 'Apellidos', eu: 'Abizenak' },
  'perfil.dni': { es: 'DNI / NIE', eu: 'NAN / AIZ' },
  'perfil.birth_date': { es: 'Fecha de nacimiento', eu: 'Jaiotze-data' },
  'perfil.saved_ok': { es: 'Cambios guardados correctamente', eu: 'Aldaketak ondo gorde dira' },

  // Mis eventos
  'eventos.open_enrollment': { es: 'Inscripción abierta', eu: 'Inskripzioa irekita' },
  'eventos.enrolled': { es: 'Mis inscripciones activas', eu: 'Nire inskripzio aktiboak' },
  'eventos.no_open': { es: 'No hay eventos con inscripción abierta', eu: 'Ez dago inskripzio irekidun gertaerarik' },
  'eventos.no_enrolled': { es: 'No estás inscrito en ningún evento', eu: 'Ez zaude gertaera batean ere izena emanda' },
  'eventos.places': { es: 'plazas', eu: 'plaza' },
  'eventos.enroll_now': { es: 'Inscribirme', eu: 'Izena eman' },
  'eventos.cancel_enroll': { es: 'Cancelar inscripción', eu: 'Inskripzioa bertan behera utzi' },

  // Inscripciones
  'inscripciones.title': { es: 'Mis inscripciones', eu: 'Nire izena-emateak' },
  'inscripciones.event': { es: 'Evento / Actividad', eu: 'Gertaera / Jarduera' },
  'inscripciones.date': { es: 'Fecha', eu: 'Data' },
  'inscripciones.state': { es: 'Estado', eu: 'Egoera' },
  'inscripciones.confirmed': { es: 'Confirmada', eu: 'Baieztatuta' },
  'inscripciones.waiting': { es: 'Lista de espera', eu: 'Itxaron-zerrenda' },

  // Pagos
  'pagos.title': { es: 'Mis pagos', eu: 'Nire ordainketak' },
  'pagos.concept': { es: 'Concepto', eu: 'Kontzeptua' },
  'pagos.method': { es: 'Método', eu: 'Metodoa' },
  'pagos.receipt': { es: 'Recibo', eu: 'Ordainagiria' },

  // Sugerencias
  'sugerencias.sent_at': { es: 'Enviada el', eu: 'Bidalita' },
  'sugerencias.response': { es: 'Respuesta', eu: 'Erantzuna' },
  'sugerencias.no_response': { es: 'Pendiente de respuesta', eu: 'Erantzunaren zain' },

  // Mi grupo (delegado)
  'grupo.title': { es: 'Mi grupo', eu: 'Nire taldea' },
  'grupo.members': { es: 'miembros', eu: 'kide' },
  'grupo.member_data': { es: 'Ver datos', eu: 'Datuak ikusi' },

  // Listado inscripciones grupo
  'grupo_inscripcion.title': { es: 'Listado de inscripción del grupo', eu: 'Taldearen inskripzio-zerrenda' },
  'grupo_inscripcion.bus_stop': { es: 'Parada de bus', eu: 'Autobus-geltokia' },
  'grupo_inscripcion.subactivity': { es: 'Subactividad', eu: 'Azpi-jarduera' },
  'grupo_inscripcion.observations': { es: 'Observaciones', eu: 'Oharrak' },
  'grupo_inscripcion.total_line': { es: 'TOTALES', eu: 'GUZTIRA' },

  // Admin eventos / actividades
  'admin.new_event': { es: 'Nuevo evento', eu: 'Gertaera berria' },
  'admin.new_activity': { es: 'Nueva actividad', eu: 'Jarduera berria' },
  'admin.edit_event': { es: 'Editar evento', eu: 'Gertaera editatu' },
  'admin.upload_photos': { es: 'Subir fotos', eu: 'Argazkiak igo' },
  'admin.add_comment': { es: 'Añadir comentario', eu: 'Iruzkina gehitu' },

  // Gestión socios
  'socios.new': { es: 'Nuevo socio', eu: 'Bazkide berria' },
  'socios.member_number': { es: 'N.º socio', eu: 'Bazkide zenbakia' },
  'socios.join_date': { es: 'Alta', eu: 'Sarrera data' },

  // Roles admin
  'admin_roles.assign': { es: 'Asignar rol', eu: 'Rola esleitu' },
  'admin_roles.current': { es: 'Rol actual', eu: 'Uneko rola' },
  'admin_roles.new_role': { es: 'Nuevo rol', eu: 'Rol berria' },
  'admin_roles.email_sent': { es: 'Email enviado al usuario', eu: 'Emaila erabiltzaileari bidali zaio' },

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

  const tb = useCallback(<T extends Record<string, any>>(item: T, key: string): string => {
    if (!item) return '';
    if (lang === 'eu' && item[`${key}Eu`]) {
      return item[`${key}Eu`];
    }
    return item[key] || '';
  }, [lang]);

  return { t, tb, lang, setLang };
}
