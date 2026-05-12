import { useStore } from '@/store/use-store';
import { useCallback } from 'react';

export type Lang = 'es' | 'eu';
export type TranslationEntry = { es: string; eu: string };
export type Translations = Record<string, TranslationEntry>;

export const OVERRIDES_KEY = 'denok-bat-translations';

export const baseDictionary: Translations = {
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
  'menu.admin_nosotros': { es: 'Editar Nosotros', eu: 'Nor gara editatu' },
  'menu.gestion_socios': { es: 'Gestión de socios', eu: 'Bazkideen kudeaketa' },
  'menu.gestion_contable': { es: 'Gestión contable', eu: 'Kudeaketa kontablea' },
  'menu.subvenciones': { es: 'Subvenciones', eu: 'Laguntzak' },
  'menu.divulgacion_admin': { es: 'Divulgación', eu: 'Dibulgazioa' },
  'menu.documentacion': { es: 'Documentación', eu: 'Dokumentazioa' },
  'menu.asociacion_datos': { es: 'Datos de la asociación', eu: 'Elkarteko datuak' },
  'menu.roles': { es: 'Roles', eu: 'Rolak' },
  'menu.proveedores': { es: 'Proveedores', eu: 'Hornitzaileak' },
  'menu.textos': { es: 'Textos / Traducciones', eu: 'Testuak / Itzulpenak' },
  'menu.odoo': { es: 'Odoo', eu: 'Odoo' },
  'menu.app': { es: 'Editar inicio', eu: 'Hasiera editatu' },
  'menu.footer': { es: 'Editar pie y contacto', eu: 'Oina eta kontaktua editatu' },
  'menu.database': { es: 'Base de datos', eu: 'Datu-basea' },
  'menu.privacy_admin': { es: 'Política de privacidad', eu: 'Pribatutasun politika' },

  // Datos de la asociación (contable / administrador)
  'asoc.title': { es: 'Datos de la asociación', eu: 'Elkarteko datuak' },
  'asoc.intro': {
    es: 'Estos datos se guardan de forma centralizada y alimentan formularios (por ejemplo la solicitud de socio: cuota de ingreso y métodos de pago si los configura aquí).',
    eu: 'Datu hauek modu zentralizatuan gordetzen dira eta inprimakiak elikatzen dituzte (adibidez bazkide-eskaera: sarrerako kuota eta ordainketa-metodoak hemen konfiguratzen badituzu).',
  },
  'asoc.reload': { es: 'Recargar', eu: 'Berriz kargatu' },
  'asoc.saved': { es: 'Cambios guardados.', eu: 'Aldaketak gorde dira.' },
  'asoc.need_login': { es: 'Inicie sesión para guardar.', eu: 'Saioa hasi gordetzeko.' },
  'asoc.section.identity': { es: 'Identificación y contacto', eu: 'Identifikazioa eta kontaktua' },
  'asoc.section.address': { es: 'Domicilio social', eu: 'Sozial-etxeko helbidea' },
  'asoc.section.fees': { es: 'Cuotas e instrucciones de pago', eu: 'Kuotak eta ordainketarako argibideak' },
  'asoc.metodos_hint': {
    es: 'Opcional. Si rellena este JSON, tendrá prioridad sobre la clave membership.solicitud_metodos_json. Ejemplo: [{"id":"transferencia","label_es":"Transferencia","label_eu":"Transferentzia"}]',
    eu: 'Aukerakoa. JSON hau betetzen baduzu, membership.solicitud_metodos_json gakoaren aurretik izango du lehentasuna.',
  },
  'asoc.field.nombre': { es: 'Nombre (castellano)', eu: 'Izena (gaztelania)' },
  'asoc.field.nombreEu': { es: 'Nombre (euskera)', eu: 'Izena (euskera)' },
  'asoc.field.cif': { es: 'CIF / NIF de la entidad', eu: 'Erakundearen IFK / NIF' },
  'asoc.field.direccion': { es: 'Dirección', eu: 'Helbidea' },
  'asoc.field.codigoPostal': { es: 'Código postal', eu: 'Posta-kodea' },
  'asoc.field.poblacion': { es: 'Población', eu: 'Herria' },
  'asoc.field.provincia': { es: 'Provincia', eu: 'Probintzia' },
  'asoc.field.pais': { es: 'País', eu: 'Herrialdea' },
  'asoc.field.web': { es: 'Sitio web', eu: 'Webgunea' },
  'asoc.field.email': { es: 'Email de contacto', eu: 'Kontaktu-emaila' },
  'asoc.field.telefono': { es: 'Teléfono', eu: 'Telefonoa' },
  'asoc.field.cuotaIngresoSocio': { es: 'Cuota de ingreso / alta (EUR)', eu: 'Sarrerako / alta kuota (EUR)' },
  'asoc.field.cuotaAnualSocio': { es: 'Cuota anual ordinaria (EUR)', eu: 'Urteko kuota arrunta (EUR)' },
  'asoc.field.numeroCuentaBanco': {
    es: 'Número de cuenta bancaria (CCC u otro formato)',
    eu: 'Banku-kontuaren zenbakia (CCC edo beste formatu bat)',
  },
  'asoc.field.ibanCuotas': { es: 'IBAN para cuotas', eu: 'Kuotetarako IBANa' },
  'asoc.field.textoInstruccionesPago': { es: 'Texto para transferencias / Bizum (visible en formularios)', eu: 'Transferentzia / Bizum testua (inprimakietan ikusgai)' },
  'asoc.field.metodosPagoSolicitudJson': { es: 'Métodos de pago (JSON, solicitud de socio)', eu: 'Ordainketa-metodoak (JSON, bazkide-eskaera)' },
  'asoc.section.grupos': { es: 'Grupos y campos extra (solicitud de socio)', eu: 'Taldeak eta eremu gehigarriak (bazkide-eskaera)' },
  'asoc.grupos_intro': {
    es: 'Define bloques con títulos y campos (texto o párrafo). Los verá el solicitante en «Mi perfil»; las respuestas se guardan con la solicitud.',
    eu: 'Definitu blokeak izenburuekin eta eremuekin (testua edo paragrafoa). Eskatzaileak «Nire profilan» ikusiko ditu; erantzunak eskaerarekin gordetzen dira.',
  },
  'asoc.grupos_invalid_json': {
    es: 'El JSON no es válido para el editor visual. Puede corregirlo en texto o vaciar y usar «Añadir grupo».',
    eu: 'JSONa ez da baliozkoa ikusizko editorerako. Testuan zuzendu edo hustu eta «Gehitu taldea» erabili.',
  },
  'asoc.grupos_try_ui_editor': { es: 'Volver al editor por bloques', eu: 'Blokeen editorera itzuli' },
  'asoc.grupo_heading': { es: 'Grupo', eu: 'Taldea' },
  'asoc.grupo_id': { es: 'Id. del grupo (sin espacios)', eu: 'Taldearen id (hutsunerik gabe)' },
  'asoc.grupo_titulo_es': { es: 'Título del grupo (ES)', eu: 'Taldearen izenburua (ES)' },
  'asoc.grupo_titulo_eu': { es: 'Título del grupo (EU)', eu: 'Taldearen izenburua (EU)' },
  'asoc.campos_en_grupo': { es: 'Campos en este grupo', eu: 'Talde honetako eremuak' },
  'asoc.campo_id': { es: 'Id. del campo', eu: 'Eremuaren id' },
  'asoc.campo_label_es': { es: 'Etiqueta (ES)', eu: 'Etiketa (ES)' },
  'asoc.campo_label_eu': { es: 'Etiqueta (EU)', eu: 'Etiketa (EU)' },
  'asoc.campo_tipo': { es: 'Tipo', eu: 'Mota' },
  'asoc.campo_tipo_text': { es: 'Texto corto', eu: 'Testu laburra' },
  'asoc.campo_tipo_textarea': { es: 'Texto largo', eu: 'Testu luzea' },
  'asoc.add_campo': { es: 'Añadir campo', eu: 'Gehitu eremua' },
  'asoc.add_grupo': { es: 'Añadir grupo', eu: 'Gehitu taldea' },
  'asoc.grupos_edit_raw': { es: 'Editar JSON en bruto', eu: 'JSON gordina editatu' },
  'asoc.grupos_hint_es': {
    es: 'Los ids deben ser únicos (letras, números, guion o guion bajo). Cada respuesta se guarda como «idGrupo.idCampo».',
    eu: 'Id-ak bakarrak izan behar dira (letrak, zenbakiak, marratxoa). Erantzun bakoitza «idTalde.idEremu» gisa gordetzen da.',
  },
  'asoc.grupos_hint_eu': {
    es: 'Los ids deben ser únicos (letras, números, guion o guion bajo). Cada respuesta se guarda como «idGrupo.idCampo».',
    eu: 'Id-ak bakarrak izan behar dira. Erantzunak «idTalde.idEremu» gisa gordetzen dira.',
  },

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
  'common.surname': { es: 'Apellidos', eu: 'Abizenak' },
  'common.gender': { es: 'Género', eu: 'Generoa' },
  'common.phone': { es: 'Teléfono', eu: 'Telefonoa' },
  'common.email': { es: 'Email', eu: 'Emaila' },
  'common.address': { es: 'Dirección', eu: 'Helbidea' },
  'common.city': { es: 'Población', eu: 'Herria' },
  'common.province': { es: 'Provincia', eu: 'Probintzia' },
  'common.saving': { es: 'Guardando...', eu: 'Gordetzen...' },

  // Home
  'home.hero_title': { es: 'Tu punto de encuentro', eu: 'Zure elkargunea' },
  'home.hero_subtitle': { es: 'Bienvenido a Denok Bat. Disfruta de actividades, eventos y servicios pensados para tu bienestar.', eu: 'Ongi etorri Denok Bat-era. Gozatu zure ongizaterako pentsatutako jarduera, gertaera eta zerbitzuez.' },
  'home.join_us': { es: 'Únete ahora', eu: 'Egin zaitez bazkide' },
  'home.upcoming_events': { es: 'Próximos eventos', eu: 'Hurrengo gertaerak' },
  'home.upcoming_events_activities': { es: 'Próximos eventos y actividades', eu: 'Hurrengo gertaerak eta jarduerak' },
  'home.latest_news': { es: 'Últimas noticias', eu: 'Azken berriak' },
  'footer.rights_reserved': { es: 'Todos los derechos reservados.', eu: 'Eskubide guztiak erreserbatuak.' },
  'footer.legal_notice': { es: 'Aviso Legal', eu: 'Lege Oharra' },
  'footer.privacy': { es: 'Privacidad', eu: 'Pribatutasuna' },
  'footer.cookies': { es: 'Cookies', eu: 'Cookieak' },

  // Forms
  'form.name': { es: 'Nombre', eu: 'Izena' },
  'form.email': { es: 'Correo electrónico', eu: 'Posta elektronikoa' },
  'form.message': { es: 'Mensaje', eu: 'Mezua' },
  'form.send': { es: 'Enviar', eu: 'Bidali' },
  'form.category': { es: 'Categoría', eu: 'Kategoria' },
  'form.phone': { es: 'Teléfono', eu: 'Telefonoa' },
  'form.send_message_title': { es: 'Envíanos un mensaje', eu: 'Bidali mezu bat' },
  'form.enter_your_data_title': { es: 'Introduzca sus datos', eu: 'Sartu zure datuak' },
  'form.personal_data_title': { es: 'Datos personales', eu: 'Datu pertsonalak' },
  'form.access_data_title': { es: 'Datos de acceso', eu: 'Sarbide datuak' },
  'form.username': { es: 'Usuario', eu: 'Erabiltzailea' },
  'form.password': { es: 'Contraseña', eu: 'Pasahitza' },
  'form.confirm_password': { es: 'Confirmar contraseña', eu: 'Pasahitza berretsi' },
  'form.privacy_summary_title': { es: 'Resumen básico de política de privacidad', eu: 'Pribatutasun-politikaren oinarrizko laburpena' },
  'form.send_registration_request': { es: 'Enviar solicitud de alta', eu: 'Alta eskaera bidali' },
  'form.privacy.responsable_label': { es: 'Responsable:', eu: 'Arduraduna:' },
  'form.privacy.responsable_text': { es: 'Asociación Denok Bat Elkartea.', eu: 'Asociación Denok Bat Elkartea.' },
  'form.privacy.finalidad_label': { es: 'Finalidad:', eu: 'Helburua:' },
  'form.privacy.finalidad_text': { es: 'Gestionar su inscripción como usuario, permitirle el acceso al área privada y enviarle comunicaciones relacionadas con nuestra actividad.', eu: 'Erabiltzaile gisa zure izen-ematea kudeatzea, eremu pribatura sarbidea ematea eta gure jarduerarekin lotutako komunikazioak bidaltzea.' },
  'form.privacy.legitimacion_label': { es: 'Legitimación:', eu: 'Legitimazioa:' },
  'form.privacy.legitimacion_text': { es: 'Ejecución de un contrato (inscripción) y consentimiento del interesado.', eu: 'Kontratu baten betearazpena (izen-ematea) eta interesdunaren baimena.' },
  'form.privacy.destinatarios_label': { es: 'Destinatarios:', eu: 'Hartzaileak:' },
  'form.privacy.destinatarios_text': { es: 'No se cederán datos a terceros, salvo obligación legal.', eu: 'Ez zaizkie datuak hirugarrenei lagako, legezko betebeharra dagoenean izan ezik.' },
  'form.privacy.derechos_label': { es: 'Derechos:', eu: 'Eskubideak:' },
  'form.privacy.derechos_text': { es: 'Tiene derecho a acceder, rectificar y suprimir sus datos, así como otros derechos detallados en nuestra política de privacidad.', eu: 'Zure datuak eskuratzeko, zuzentzeko eta ezabatzeko eskubidea duzu, baita gure pribatutasun-politikan zehaztutako beste eskubide batzuk ere.' },
  'form.privacy.info_adicional_label': { es: 'Información adicional:', eu: 'Informazio osagarria:' },
  'form.privacy.info_adicional_prefix': { es: 'Puede consultar la información completa en nuestra', eu: 'Informazio osoa kontsulta dezakezu gure' },
  'form.privacy.policy_link_text': { es: 'Política de Privacidad', eu: 'Pribatutasun Politika' },
  'form.privacy.accept_checkbox': { es: 'He leído y acepto la política de privacidad', eu: 'Pribatutasun politika irakurri eta onartzen dut' },
  'form.privacy.accept_required_notice': { es: 'Si no acepta la política de privacidad, se anulará el registro.', eu: 'Pribatutasun politika onartzen ez baduzu, erregistroa bertan behera geratuko da.' },

  // Auth
  'auth.username': { es: 'Usuario', eu: 'Erabiltzailea' },
  'auth.password': { es: 'Contraseña', eu: 'Pasahitza' },
  'auth.login_cta': { es: 'Iniciar sesión', eu: 'Saioa hasi' },
  'auth.login_subtitle': { es: 'Accede a tu cuenta para inscribirte en actividades y gestionar tu perfil.', eu: 'Sar zaitez jardueretan izena emateko eta zure profila kudeatzeko.' },
  'auth.no_member': { es: '¿No estás registrado?', eu: 'Ez zaude erregistratua?' },
  'auth.contact_us': { es: 'Registrate', eu: 'Eman izena' },
  'auth.forgot_password': { es: '¿Olvidaste tu contraseña?', eu: 'Pasahitza ahaztu zaizu?' },

  // Contact page
  'contact.subtitle': { es: 'Estamos aquí para ayudarte', eu: 'Hemen gaude zuri laguntzeko' },
  'contact.info_title': { es: 'Información de contacto', eu: 'Kontaktu-informazioa' },
  'contact.address_label': { es: 'Dirección', eu: 'Helbidea' },
  'contact.phone_label': { es: 'Teléfono', eu: 'Telefonoa' },
  'contact.email_label': { es: 'Email', eu: 'Posta elektronikoa' },
  'contact.whatsapp_label': { es: 'WhatsApp', eu: 'WhatsApp' },
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
  'perfil.membership_title': { es: 'Ser socio', eu: 'Bazkide izan' },
  'perfil.membership_intro': {
    es: 'Puedes solicitar el alta como socio; revisaremos tus datos y te contactaremos.',
    eu: 'Bazkide alta eska dezakezu; zure datuak aztertuko ditugu eta harremanetan jarriko gara.',
  },
  'perfil.membership_request': { es: 'Solicitar ser socio', eu: 'Bazkide izateko eskaera' },
  'perfil.membership_pending': {
    es: 'Tu solicitud de socio está pendiente de revisión.',
    eu: 'Zure bazkide-eskaera berrikusteko zain dago.',
  },
  'perfil.membership_sent_ok': {
    es: 'Solicitud registrada. Te contactaremos pronto.',
    eu: 'Eskaera erregistratu da. Laster jarriko gara harremanetan.',
  },
  'perfil.membership_form_intro': {
    es: 'Completa tus datos de usuario y de socio. Debes adjuntar el DNI/NIE por ambas caras (imagen o PDF), elegir cómo abonar la cuota y subir tu fotografía.',
    eu: 'Bete erabiltzaile- eta bazkide-datuak. NAN/AIZ bi aldeetan erantsi behar duzu (argazki edo PDF), nola ordainduko duzun kuota aukeratu eta zure argazkia igo.',
  },
  'perfil.membership_intro_collapsed': {
    es: 'Si deseas hacerte socio, primero revisa tus datos personales arriba y luego abre el formulario con los datos específicos de socio y la documentación.',
    eu: 'Bazkide izan nahi baduzu, lehenengo goiko datu pertsonalak egiaztatu eta gero ireki bazkideari dagozkion datu eta dokumentazioaren formularioa.',
  },
  'perfil.membership_open_form': {
    es: 'Solicitar ser socio (formulario)',
    eu: 'Bazkide izateko eskaera (inprimakia)',
  },
  'perfil.membership_uses_personal_data': {
    es: 'Nombre, apellidos, email y teléfono se enviarán desde la sección «Datos personales» de arriba; complétalos allí si faltan.',
    eu: 'Izena, abizenak, posta elektronikoa eta telefonoa goiko «Datu pertsonalak» ataletik bidaliko dira; osatu han behar izanez gero.',
  },
  'perfil.membership_form_intro_socio_only': {
    es: 'Completa solo los datos de socio y la documentación que se indican a continuación.',
    eu: 'Osatu bazkideari dagozkion datuak eta jarraian adierazitako dokumentazioa soilik.',
  },
  'perfil.membership_close_form': { es: 'Ocultar formulario', eu: 'Inprimakia ezkutatu' },
  'perfil.membership_submit': { es: 'Enviar solicitud', eu: 'Eskaera bidali' },
  'perfil.membership_photo_label': { es: 'Fotografía (obligatoria)', eu: 'Argazkia (derrigorrezkoa)' },
  'perfil.membership_photo_hint': {
    es: 'Puedes usar la foto de tu perfil si ya la has subido arriba, o elegir un archivo aquí.',
    eu: 'Goiko profileko argazkia erabil dezakezu, edo fitxategi bat hautatu hemen.',
  },
  'perfil.membership_photo_required': {
    es: 'Debes adjuntar una fotografía (o tener foto en el perfil).',
    eu: 'Argazki bat erantsi behar duzu (edo profilean argazki bat izan).',
  },
  'perfil.membership_fields_required': {
    es: 'Completa todos los campos obligatorios, incluido el género.',
    eu: 'Bete derrigorrezko eremu guztiak, generoa barne.',
  },
  'perfil.membership_select_gender': { es: 'Seleccione género', eu: 'Hautatu generoa' },
  'perfil.membership_fee_title': { es: 'Cuota a abonar', eu: 'Ordaindu beharreko kuota' },
  'perfil.membership_fee_note': {
    es: 'El importe corresponde a la cuota vigente en el momento de la solicitud. La tramitación continuará cuando se verifique el pago según el método elegido.',
    eu: 'Zenbatekoa eskaera uneeko kuotari dagokio. Ordainketa egiaztatu ondoren jarraituko da tramitazioa, hautatu duzun moduaren arabera.',
  },
  'perfil.membership_payment_method': { es: 'Forma de pago', eu: 'Ordainketa modua' },
  'perfil.membership_payment_required': {
    es: 'Seleccione una forma de pago.',
    eu: 'Hautatu ordainketa modu bat.',
  },
  'perfil.membership_dni_docs_title': {
    es: 'Documentación del DNI/NIE (obligatoria)',
    eu: 'NAN/AIZ dokumentazioa (derrigorrezkoa)',
  },
  'perfil.membership_dni_docs_hint': {
    es: 'Sube fotos claras o un PDF con ambas caras: anverso y reverso. Máximo 8 MB por archivo.',
    eu: 'Igo argazki argiak edo PDF bat bi aldeekin: aurrealdea eta atzealdea. Gehienez 8 MB fitxategiko.',
  },
  'perfil.membership_dni_front': { es: 'Anverso del documento', eu: 'Dokumentuaren aurrealdea' },
  'perfil.membership_dni_back': { es: 'Reverso del documento', eu: 'Dokumentuaren atzealdea' },
  'perfil.membership_doc_attached': { es: 'Archivo adjunto', eu: 'Fitxategia erantsita' },
  'perfil.membership_dni_docs_required': {
    es: 'Debe adjuntar anverso y reverso del DNI/NIE.',
    eu: 'NAN/AIZaren aurrealdea eta atzealdea erantsi behar dituzu.',
  },
  'perfil.membership_dni_file_too_large': {
    es: 'Cada archivo debe ocupar como máximo 8 MB.',
    eu: 'Fitxategi bakoitzak gehienez 8 MB izan behar ditu.',
  },
  'perfil.membership_extra_section': {
    es: 'Otros datos solicitados por la asociación',
    eu: 'Elkarteak eskatutako beste datu batzuk',
  },
  'perfil.membership_options_unavailable': {
    es: 'No se pudieron cargar el importe de la cuota ni las formas de pago. Recargue la página o inténtelo más tarde.',
    eu: 'Ezin izan dira kuotaren zenbatekoa eta ordainketa moduak kargatu. Freskatu orria edo saiatu beranduago.',
  },
  'perfil.membership_rejected': {
    es: 'Tu solicitud de socio ha sido rechazada. Si necesitas más información, contacta con la asociación.',
    eu: 'Zure bazkide-eskaera baztertu da. Informazio gehiago behar baduzu, jarri elkartearekin harremanetan.',
  },
  'perfil.membership_revision_title': {
    es: 'Indicaciones de la asociación',
    eu: 'Elkarteko orientazioak',
  },
  'perfil.membership_resubmit': {
    es: 'Volver a enviar solicitud',
    eu: 'Eskaera berriro bidali',
  },
  'perfil.socio_section_title': { es: 'Datos de socio', eu: 'Bazkide datuak' },
  'perfil.socio_section_hint': {
    es: 'Revisa y actualiza tus datos de socio para mantenerlos correctos.',
    eu: 'Egiaztatu eta eguneratu zure bazkide-datuak zuzen mantentzeko.',
  },
  'perfil.socio_save': { es: 'Guardar datos de socio', eu: 'Bazkide datuak gorde' },
  'perfil.socio_saved_ok': { es: 'Datos de socio guardados', eu: 'Bazkide datuak gordeta' },
  'perfil.socio_number': { es: 'Nº de socio', eu: 'Bazkide zk.' },
  'form.optional_message': { es: 'Mensaje (opcional)', eu: 'Mezua (aukerakoa)' },

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
  'admin.activities.quick_create': { es: 'Alta rápida de nueva actividad.', eu: 'Jarduera berriaren alta azkarra.' },
  'admin.activities.editor_tabs': { es: 'Editor por pestañas: una actividad por pestaña.', eu: 'Fitxen editorea: jarduera bat fitxa bakoitzean.' },
  'admin.activities.detail_title': { es: 'Detalle de actividad', eu: 'Jardueraren xehetasuna' },
  'admin.activities.create_button': { es: 'Nueva actividad', eu: 'Jarduera berria' },
  'admin.activities.creating_button': { es: 'Creando...', eu: 'Sortzen...' },
  'admin.activities.create_error_required_name': { es: 'Para crear actividad, el nombre (ES) es obligatorio.', eu: 'Jarduera sortzeko, izena (ES) derrigorrezkoa da.' },
  'admin.activities.create_success': { es: 'Nueva actividad creada.', eu: 'Jarduera berria sortuta.' },
  'admin.activities.create_error': { es: 'Error creando nueva actividad.', eu: 'Errorea jarduera berria sortzean.' },
  'admin.activities.load_error': { es: 'Error cargando actividades.', eu: 'Errorea jarduerak kargatzean.' },
  'admin.activities.save_success': { es: 'Actividad guardada.', eu: 'Jarduera gordeta.' },
  'admin.activities.save_error': { es: 'Error guardando la actividad.', eu: 'Errorea jarduera gordetzean.' },
  'admin.activities.field.card_name_es': { es: 'Nombre de la tarjeta (ES)', eu: 'Txartelaren izena (ES)' },
  'admin.activities.field.card_name_eu': { es: 'Nombre de la tarjeta (EU)', eu: 'Txartelaren izena (EU)' },
  'admin.activities.field.schedule_es': { es: 'Horario (ES)', eu: 'Ordutegia (ES)' },
  'admin.activities.field.schedule_eu': { es: 'Horario (EU)', eu: 'Ordutegia (EU)' },
  'admin.activities.field.total_spots': { es: 'Plazas totales', eu: 'Plaza guztiak' },
  'admin.activities.field.available_spots': { es: 'Plazas disponibles', eu: 'Plaza erabilgarriak' },
  'admin.activities.field.status': { es: 'Estado de la actividad', eu: 'Jardueraren egoera' },
  'admin.activities.field.detail_es': { es: 'Descripción detalle (ES)', eu: 'Xehetasun deskribapena (ES)' },
  'admin.activities.field.detail_eu': { es: 'Descripción detalle (EU)', eu: 'Xehetasun deskribapena (EU)' },
  'admin.activities.field.card_text_es': { es: 'Texto breve de tarjeta (ES)', eu: 'Txartelaren testu laburra (ES)' },
  'admin.activities.field.card_text_eu': { es: 'Texto breve de tarjeta (EU)', eu: 'Txartelaren testu laburra (EU)' },
  'admin.activities.calendar.title': { es: 'Calendario anual (12 meses)', eu: 'Urteko egutegia (12 hilabete)' },
  'admin.activities.calendar.start_month': { es: 'Primer mes', eu: 'Lehen hilabetea' },
  'admin.activities.calendar.prev_month': { es: 'Mes anterior', eu: 'Aurreko hilabetea' },
  'admin.activities.calendar.next_month': { es: 'Mes siguiente', eu: 'Hurrengo hilabetea' },
  'admin.activities.calendar.range': { es: 'Meses {start}-{end} de 12', eu: '{start}-{end}. hilabeteak / 12' },
  'admin.activities.calendar.selected_days_total': { es: 'Total de días elegidos:', eu: 'Aukeratutako egun guztira:' },
  'admin.activities.photo.label': { es: 'Foto de la actividad', eu: 'Jardueraren argazkia' },
  'admin.activities.photo.upload': { es: 'Subir foto', eu: 'Argazkia igo' },
  'admin.activities.button.save': { es: 'Guardar', eu: 'Gorde' },
  'admin.activities.button.back': { es: 'Volver', eu: 'Itzuli' },
  'activities.calendar.toggle_show': { es: 'Ver detalles', eu: 'Xehetasunak ikusi' },
  'activities.calendar.toggle_hide': { es: 'Ocultar detalles', eu: 'Xehetasunak ezkutatu' },
  'activities.calendar.details_title': { es: 'Detalle de calendario', eu: 'Egutegiaren xehetasunak' },
  'activities.calendar.empty': { es: 'Todavía no hay información de calendario.', eu: 'Oraindik ez dago egutegi informaziorik.' },
  'activities.status.save': { es: 'Guardar estado', eu: 'Egoera gorde' },
  'activities.status.saving': { es: 'Guardando...', eu: 'Gordetzen...' },
  'calendar.week.monday': { es: 'L', eu: 'Al' },
  'calendar.week.tuesday': { es: 'M', eu: 'Ar' },
  'calendar.week.wednesday': { es: 'X', eu: 'Az' },
  'calendar.week.thursday': { es: 'J', eu: 'Og' },
  'calendar.week.friday': { es: 'V', eu: 'Or' },
  'calendar.week.saturday': { es: 'S', eu: 'Lr' },
  'calendar.week.sunday': { es: 'D', eu: 'Ig' },
  'status.prevista': { es: 'Prevista', eu: 'Aurreikusia' },
  'status.abierta': { es: 'Abierta', eu: 'Irekita' },
  'status.en_curso': { es: 'En curso', eu: 'Martxan' },
  'status.terminada': { es: 'Terminada', eu: 'Amaituta' },

  // Gestión socios
  'socios.new': { es: 'Nuevo socio', eu: 'Bazkide berria' },
  'socios.member_number': { es: 'N.º socio', eu: 'Bazkide zenbakia' },
  'socios.join_date': { es: 'Alta', eu: 'Sarrera data' },
  'socios.form.title.create': { es: 'Alta de socio', eu: 'Bazkide alta' },
  'socios.form.title.edit': { es: 'Modificar socio', eu: 'Bazkidea aldatu' },
  'socios.form.dni_nif': { es: 'DNI/NIF', eu: 'NAN/IFZ' },
  'socios.form.birthdate': { es: 'Fecha nacimiento', eu: 'Jaiotze data' },
  'socios.form.deathdate': { es: 'Fecha fallecimiento', eu: 'Heriotza data' },
  'socios.form.honorifico': { es: 'Honorífico', eu: 'Ohorezko' },
  'socios.form.gender.empty': { es: 'Género (opcional)', eu: 'Generoa (aukerakoa)' },
  'socios.form.gender.male': { es: 'Hombre', eu: 'Gizona' },
  'socios.form.gender.female': { es: 'Mujer', eu: 'Emakumea' },
  'socios.form.tipologia.fundadora': { es: 'Fundadora', eu: 'Sortzailea' },
  'socios.form.tipologia.directiva': { es: 'Directiva', eu: 'Zuzendaritza' },
  'socios.form.tipologia.delegada': { es: 'Delegada', eu: 'Ordezkaria' },
  'socios.form.tipologia.honorifica': { es: 'Honorífica', eu: 'Ohorezkoa' },
  'socios.form.tipologia.numeraria': { es: 'Numeraria', eu: 'Numerarioa' },
  'socios.form.tipologia.colaboradora': { es: 'Colaboradora', eu: 'Laguntzailea' },
  'socios.form.status.solicitante': { es: 'Solicitante', eu: 'Eskatzailea' },
  'socios.form.status.pendiente_datos': {
    es: 'Pendiente completar datos',
    eu: 'Datuak osatzeko zain',
  },
  'socios.form.status.rechazado': { es: 'Rechazado', eu: 'Baztertuta' },
  'socios.form.status.active': { es: 'Activo', eu: 'Aktibo' },
  'socios.form.status.baja': { es: 'Baja', eu: 'Baja' },
  'socios.tabs.solicitudes': { es: 'Solicitudes', eu: 'Eskaerak' },
  'socios.solicitud.title': { es: 'Solicitudes de alta como socio', eu: 'Bazkide alta-eskaerak' },
  'socios.solicitud.subtitle': {
    es: 'Admite, rechaza o pide corrección de datos; el usuario verá en rojo los campos señalados en su perfil.',
    eu: 'Onartu, baztertu edo eskatu datu-zuzenketak; erabiltzaileak gorriz ikusiko ditu profilan markatutako eremuak.',
  },
  'socios.solicitud.empty': { es: 'No hay solicitudes pendientes.', eu: 'Ez dago eskaerarik zain.' },
  'socios.solicitud.user_login': { es: 'Usuario web', eu: 'Web erabiltzailea' },
  'socios.solicitud.actions': { es: 'Acciones', eu: 'Ekintzak' },
  'socios.solicitud.admit': { es: 'Admitir', eu: 'Onartu' },
  'socios.solicitud.reject': { es: 'Rechazar', eu: 'Baztertu' },
  'socios.solicitud.request_fix': { es: 'Corregir datos', eu: 'Datuak zuzendu' },
  'socios.solicitud.confirm_reject': {
    es: '¿Rechazar esta solicitud de socio?',
    eu: 'Bazkide-eskaera hau baztertu?',
  },
  'socios.solicitud.revision_panel_title': {
    es: 'Marcar datos incorrectos o incompletos',
    eu: 'Datu okerrak edo osatu gabeak markatu',
  },
  'socios.solicitud.revision_panel_hint': {
    es: 'Seleccione al menos un campo; puede añadir un mensaje para el solicitante.',
    eu: 'Hautatu gutxienez eremu bat; gehitu mezu bat eskatzailearentzat.',
  },
  'socios.solicitud.mensaje_placeholder': {
    es: 'Mensaje para el solicitante (opcional pero recomendado)',
    eu: 'Mezua eskatzailearentzat (aukerakoa, baina gomendagarria)',
  },
  'socios.solicitud.send_revision': { es: 'Enviar solicitud de corrección', eu: 'Zuzenketa-eskaera bidali' },
  'socios.solicitud.manual_create': { es: 'Alta manual de socio', eu: 'Bazkidearen eskuzko alta' },
  'socios.solicitud.notice.admitted': { es: 'Socio admitido.', eu: 'Bazkidea onartuta.' },
  'socios.solicitud.notice.rejected': { es: 'Solicitud rechazada.', eu: 'Eskaera baztertuta.' },
  'socios.solicitud.notice.revision_requested': {
    es: 'Se ha pedido al usuario que corrija los datos.',
    eu: 'Erabiltzaileari datuak zuzentzeko eskatu zaio.',
  },
  'socios.solicitud.notice.error': { es: 'No se pudo actualizar la solicitud.', eu: 'Ezin izan da eskaera eguneratu.' },
  'socios.form.group_id_optional': { es: 'Grupo ID (opcional)', eu: 'Talde ID (aukerakoa)' },
  'socios.form.membership.title': { es: 'Membresía (campos de membership_membership_line)', eu: 'Membresia (membership_membership_line eremuak)' },
  'socios.form.membership.concept': { es: 'Concepto factura', eu: 'Fakturaren kontzeptua' },
  'socios.form.membership.amount': { es: 'Importe', eu: 'Zenbatekoa' },
  'socios.form.membership.reference': { es: 'Referencia', eu: 'Erreferentzia' },
  'socios.form.membership.pending': { es: 'Pendiente', eu: 'Zain' },
  'socios.form.membership.paid': { es: 'Pagado', eu: 'Ordainduta' },
  'socios.form.membership.method_transfer': { es: 'Transferencia', eu: 'Transferentzia' },
  'socios.form.membership.method_card': { es: 'Tarjeta', eu: 'Txartela' },
  'socios.form.membership.method_direct_debit': { es: 'Domiciliación', eu: 'Helbideratzea' },
  'socios.form.membership.sync_odoo': { es: 'Crear/actualizar factura de membresía en Odoo (`membership_membership_line`)', eu: 'Odoo-n bazkidetzaren faktura sortu/eguneratu (`membership_membership_line`)' },
  'socios.form.membership.honorifico_no_fee': { es: 'Este socio es honorífico y no tiene cuota anual.', eu: 'Bazkide hau ohorezkoa da eta ez du urteko kuotarik.' },
  'socios.form.photo.label': { es: 'Foto del socio', eu: 'Bazkidearen argazkia' },
  'socios.form.photo.upload': { es: 'Subir foto', eu: 'Argazkia igo' },
  'socios.form.photo.remove': { es: 'Quitar foto', eu: 'Argazkia kendu' },
  'socios.form.photo.preview_alt': { es: 'Vista previa foto socio', eu: 'Bazkidearen argazkiaren aurrebista' },
  'socios.form.photo.read_error': { es: 'No se pudo leer la imagen seleccionada.', eu: 'Ezin izan da hautatutako irudia irakurri.' },
  'socios.form.save_member': { es: 'Guardar socio', eu: 'Bazkidea gorde' },
  'socios.form.loading_members': { es: 'Cargando socios...', eu: 'Bazkideak kargatzen...' },
  'socios.form.notice.name_required': { es: 'El nombre es obligatorio.', eu: 'Izena derrigorrezkoa da.' },
  'socios.form.notice.save_failed': { es: 'No se pudo guardar', eu: 'Ezin izan da gorde' },
  'socios.form.notice.updated': { es: 'Socio actualizado.', eu: 'Bazkidea eguneratuta.' },
  'socios.form.notice.created': { es: 'Socio creado.', eu: 'Bazkidea sortuta.' },
  'socios.form.notice.error_saving': { es: 'Error guardando socio.', eu: 'Errorea bazkidea gordetzean.' },
  'socios.filters.clear': { es: 'Limpiar filtros', eu: 'Iragazkiak garbitu' },
  'socios.columns.hide_secondary': { es: 'Ocultar columnas secundarias', eu: 'Bigarren mailako zutabeak ezkutatu' },
  'socios.columns.show_secondary': { es: 'Mostrar columnas secundarias', eu: 'Bigarren mailako zutabeak erakutsi' },
  'socios.tabs.list': { es: 'Listado socios', eu: 'Bazkideen zerrenda' },
  'socios.tabs.query_positions': { es: 'Consulta cargos', eu: 'Karguen kontsulta' },
  'socios.tabs.assign_positions': { es: 'Asignación cargos', eu: 'Karguen esleipena' },
  'socios.positions.query_title': { es: 'Consulta histórico de cargos', eu: 'Karguen historikoaren kontsulta' },
  'socios.positions.query_subtitle': { es: 'Genera listados por socio, cargo y rango de fechas.', eu: 'Sortu zerrendak bazkide, kargu eta data-tartearen arabera.' },
  'socios.positions.field.cargo': { es: 'Cargo', eu: 'Kargua' },
  'socios.positions.field.member': { es: 'Socio', eu: 'Bazkidea' },
  'socios.positions.field.from': { es: 'Desde', eu: 'Noiztik' },
  'socios.positions.field.to': { es: 'Hasta', eu: 'Noiz arte' },
  'socios.positions.field.only_current': { es: 'Solo vigentes', eu: 'Indarrean bakarrik' },
  'socios.positions.button.apply_filters': { es: 'Aplicar filtros', eu: 'Iragazkiak aplikatu' },
  'socios.positions.button.download_csv': { es: 'Descargar listado CSV', eu: 'CSV zerrenda deskargatu' },
  'socios.positions.loading_query': { es: 'Cargando histórico de cargos...', eu: 'Karguen historikoa kargatzen...' },
  'socios.positions.no_results': { es: 'Sin resultados para los filtros seleccionados.', eu: 'Ez dago emaitzarik hautatutako iragazkientzat.' },
  'socios.positions.table.cargo': { es: 'Cargo', eu: 'Kargua' },
  'socios.positions.table.member': { es: 'Socio', eu: 'Bazkidea' },
  'socios.positions.table.from': { es: 'Desde', eu: 'Noiztik' },
  'socios.positions.table.to': { es: 'Hasta', eu: 'Noiz arte' },
  'socios.positions.assign_title': { es: 'Asignación de cargos (alta, nuevo, fín)', eu: 'Karguen esleipena (alta, berria, amaiera)' },
  'socios.positions.button.save_assignment': { es: 'Guardar', eu: 'Gorde' },
  'socios.positions.loading_assignments': { es: 'Cargando histórico...', eu: 'Historikoa kargatzen...' },
  'socios.positions.new_cargo_title': { es: 'Nuevo cargo', eu: 'Kargu berria' },
  'socios.positions.new_cargo.code': { es: 'Código', eu: 'Kodea' },
  'socios.positions.new_cargo.name': { es: 'Nombre', eu: 'Izena' },
  'socios.positions.new_cargo.name_eu_optional': { es: 'Nombre EU (opcional)', eu: 'EU izena (aukerakoa)' },
  'socios.positions.new_cargo.button_create': { es: 'Crear cargo', eu: 'Kargua sortu' },
  'socios.positions.new_cargo.option': { es: '+ Nuevo cargo', eu: '+ Kargu berria' },
  'socios.positions.description_optional': { es: 'Descripción del periodo (opcional)', eu: 'Aldiaren deskribapena (aukerakoa)' },
  'socios.positions.search.query_placeholder': { es: 'Filtrar histórico por nombre, apellidos o cargo', eu: 'Historikoa iragazi izen, abizen edo karguaren arabera' },
  'socios.positions.search.assign_placeholder': { es: 'Buscar socio por nombre o apellidos', eu: 'Bilatu bazkidea izen edo abizenen arabera' },

  // Roles admin
  'admin_roles.assign': { es: 'Asignar rol', eu: 'Rola esleitu' },
  'admin_roles.current': { es: 'Rol actual', eu: 'Uneko rola' },
  'admin_roles.new_role': { es: 'Nuevo rol', eu: 'Rol berria' },
  'admin_roles.email_sent': { es: 'Email enviado al usuario', eu: 'Emaila erabiltzaileari bidali zaio' },

  // Textos admin
  'textos.title': { es: 'Textos y traducciones', eu: 'Testuak eta itzulpenak' },
  'textos.subtitle': { es: 'Edita los textos de la app en español y euskara. Los cambios se aplican al instante.', eu: 'Editatu aplikazioaren testuak gaztelaniaz eta euskaraz. Aldaketak berehala aplikatzen dira.' },
  'textos.key': { es: 'Clave', eu: 'Gakoa' },
  'textos.spanish': { es: 'Español', eu: 'Gaztelania' },
  'textos.basque': { es: 'Euskara', eu: 'Euskara' },
  'textos.modified': { es: 'Modificada', eu: 'Aldatuta' },
  'textos.save_all': { es: 'Guardar todos los cambios', eu: 'Aldaketa guztiak gorde' },
  'textos.reset': { es: 'Restablecer original', eu: 'Jatorrizkoa berrezarri' },
  'textos.reset_all': { es: 'Restablecer todo', eu: 'Dena berrezarri' },
  'textos.saved': { es: 'Cambios guardados. Se aplican en toda la app.', eu: 'Aldaketak gordeta. Aplikazio osoan aplikatzen dira.' },
  'textos.category': { es: 'Categoría', eu: 'Kategoria' },
  'textos.all': { es: 'Todas', eu: 'Denak' },

  // Demo Mode
  'demo.banner': { es: 'Modo Demo (Sin conexión a Odoo)', eu: 'Demo modua (Odoo konexiorik gabe)' },
};

function getOverrides(): Translations {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getMergedDictionary(): Translations {
  const overrides = getOverrides();
  const merged: Translations = { ...baseDictionary };
  for (const key of Object.keys(overrides)) {
    merged[key] = { ...baseDictionary[key], ...overrides[key] };
  }
  return merged;
}

export function saveOverrides(overrides: Translations) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  window.dispatchEvent(new Event('translations-updated'));
}

export function useTranslation() {
  const { lang, setLang } = useStore();

  const t = useCallback((key: string): string => {
    const dict = getMergedDictionary();
    if (!dict[key]) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    return dict[key][lang];
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
