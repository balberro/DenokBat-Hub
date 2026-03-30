// Fallback data when API is unreachable
import type { Actividad, Evento, Noticia, Servicio, UserProfile } from '@workspace/api-client-react';

export const mockActividades: Actividad[] = [
  { id: 1, nombre: 'Clase de Yoga', nombreEu: 'Yoga klasea', descripcion: 'Yoga suave para mejorar la flexibilidad.', descripcionEu: 'Yoga leuna malgutasuna hobetzeko.', categoria: 'Deporte', horario: 'Lunes 10:00', plazasTotal: 20, plazasDisponibles: 5, estado: 'disponible', inscrito: false },
  { id: 2, nombre: 'Taller de Informática', nombreEu: 'Informatika tailerra', descripcion: 'Aprende a usar el móvil e internet.', descripcionEu: 'Ikasi mugikorra eta internet erabiltzen.', categoria: 'Educación', horario: 'Martes 17:00', plazasTotal: 15, plazasDisponibles: 0, estado: 'cerrada', inscrito: true },
  { id: 3, nombre: 'Senderismo', nombreEu: 'Mendi-ibilaldiak', descripcion: 'Rutas por montes cercanos.', descripcionEu: 'Inguruko mendietatik ibilbideak.', categoria: 'Deporte', horario: 'Jueves 09:00', plazasTotal: 30, plazasDisponibles: 12, estado: 'disponible', inscrito: false },
  { id: 4, nombre: 'Pintura', nombreEu: 'Margolaritza', descripcion: 'Acuarela y óleo para principiantes.', descripcionEu: 'Akuarela eta olioa hasiberrientzat.', categoria: 'Cultura', horario: 'Viernes 11:00', plazasTotal: 12, plazasDisponibles: 2, estado: 'disponible', inscrito: false },
];

export const mockEventos: Evento[] = [
  { id: 1, nombre: 'Fiesta de Primavera', nombreEu: 'Udaberriko Jaia', descripcion: 'Música en vivo y merienda.', descripcionEu: 'Zuzeneko musika eta askaria.', fechaInicio: '2025-05-15T18:00:00Z', lugar: 'Plaza Mayor', plazasDisponibles: 100, inscrito: false },
  { id: 2, nombre: 'Excursión a Donostia', nombreEu: 'Donostiara txangoa', descripcion: 'Visita cultural y comida.', descripcionEu: 'Bisita kulturala eta bazkaria.', fechaInicio: '2025-06-02T08:00:00Z', lugar: 'Salida desde la sede', plazasDisponibles: 5, inscrito: true },
  { id: 3, nombre: 'Conferencia de Salud', nombreEu: 'Osasun hitzaldia', descripcion: 'Consejos para una vida sana.', descripcionEu: 'Osasuntsu bizitzeko aholkuak.', fechaInicio: '2025-04-20T17:30:00Z', lugar: 'Salón de actos', plazasDisponibles: 50, inscrito: false },
];

export const mockNoticias: Noticia[] = [
  { id: 1, titulo: 'Renovación de instalaciones', tituloEu: 'Instalazioen berritzea', resumen: 'Hemos mejorado el salón principal.', resumenEu: 'Areto nagusia hobetu dugu.', fecha: '2025-03-10T10:00:00Z', categoria: 'Asociación' },
  { id: 2, titulo: 'Acuerdo con farmacias locales', tituloEu: 'Farmaziekin akordioa', resumen: 'Descuentos para socios presentando el carnet.', resumenEu: 'Deskontuak bazkideentzat txartela aurkeztuz.', fecha: '2025-03-05T09:00:00Z', categoria: 'Servicios' },
  { id: 3, titulo: 'Éxito en el torneo de mus', tituloEu: 'Arrakasta mus txapelketan', resumen: 'Gran participación este fin de semana.', resumenEu: 'Parte-hartze handia asteburu honetan.', fecha: '2025-02-28T12:00:00Z', categoria: 'Eventos' },
];

export const mockServicios: Servicio[] = [
  { id: 1, nombre: 'Asesoría Jurídica', nombreEu: 'Aholkularitza Juridikoa', descripcion: 'Consultas legales gratuitas.', descripcionEu: 'Kontsulta legalak doan.', icono: 'Scale' },
  { id: 2, nombre: 'Atención Sanitaria', nombreEu: 'Osasun Arreta', descripcion: 'Toma de tensión y consejos.', descripcionEu: 'Tentsioa hartzea eta aholkuak.', icono: 'HeartPulse' },
  { id: 3, nombre: 'Peluquería', nombreEu: 'Ileapaindegia', descripcion: 'Precios reducidos para socios.', descripcionEu: 'Prezio murriztuak bazkideentzat.', icono: 'Scissors' },
];

export const mockUser: UserProfile & { roles?: string[] } = {
  id: 1,
  name: 'María García',
  email: 'maria@example.com',
  role: 'administrador',
  roles: ['socio', 'delegado', 'administrador'],
};
