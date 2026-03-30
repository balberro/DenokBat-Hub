import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import actividadesRouter from "./actividades";
import eventosRouter from "./eventos";
import fiestasRouter from "./fiestas";
import excursionesRouter from "./excursiones";
import viajesRouter from "./viajes";
import noticiasRouter from "./noticias";
import serviciosRouter from "./servicios";
import contactoRouter from "./contacto";
import sociosRouter from "./socios";
import inscripcionesRouter from "./inscripciones";
import sugerenciasRouter from "./sugerencias";
import pagosRouter from "./pagos";
import syncRouter from "./sync";
import configRouter from "./config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(actividadesRouter);
router.use(eventosRouter);
router.use(fiestasRouter);
router.use(excursionesRouter);
router.use(viajesRouter);
router.use(noticiasRouter);
router.use(serviciosRouter);
router.use(contactoRouter);
router.use(sociosRouter);
router.use(inscripcionesRouter);
router.use(sugerenciasRouter);
router.use(pagosRouter);
router.use(syncRouter);
router.use(configRouter);

export default router;
