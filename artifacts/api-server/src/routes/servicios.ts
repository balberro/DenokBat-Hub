import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SERVICIOS = [
  { id: 1, nombre: "Asesoría Jurídica", nombreEu: "Aholkularitza Juridikoa", descripcion: "Atención legal gratuita para socios en materia de herencias, contratos y pensiones.", descripcionEu: "Doako arreta juridikoa bazkideentzat ondasunen, kontratuen eta pentsioen auzitan.", icono: "scale", contacto: "Martes 10:00-12:00, previo cita", telefono: "+34 943 000 001" },
  { id: 2, nombre: "Atención Sanitaria", nombreEu: "Osasun Arreta", descripcion: "Servicio de orientación sanitaria y acompañamiento a consultas médicas.", descripcionEu: "Osasun orientazio zerbitzua eta mediku kontsultara laguntzea.", icono: "heart-pulse", contacto: "Lunes a Viernes 9:00-14:00", telefono: "+34 943 000 002" },
  { id: 3, nombre: "Ayuda a Domicilio", nombreEu: "Etxez Etxeko Laguntza", descripcion: "Apoyo en gestiones del hogar y acompañamiento para socios con movilidad reducida.", descripcionEu: "Etxeko kudaketetan laguntza eta mugikortasun mugatua duten bazkideentzako laguntzailea.", icono: "home", contacto: "Solicitar en oficina", telefono: "+34 943 000 003" },
  { id: 4, nombre: "Actividades Culturales", nombreEu: "Kultura Jarduerak", descripcion: "Visitas a museos, teatros, cines y eventos culturales con precios especiales.", descripcionEu: "Museo, antzerki, zinema eta kultura ekitaldietara bisitak prezio bereziarekin.", icono: "theater-masks", contacto: "Ver tablón de actividades", telefono: null },
];

router.get("/servicios", (_req, res): void => {
  res.json({ items: SERVICIOS });
});

export default router;
