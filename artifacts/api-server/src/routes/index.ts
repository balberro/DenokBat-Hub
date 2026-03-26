import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import actividadesRouter from "./actividades";
import eventosRouter from "./eventos";
import noticiasRouter from "./noticias";
import serviciosRouter from "./servicios";
import contactoRouter from "./contacto";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(actividadesRouter);
router.use(eventosRouter);
router.use(noticiasRouter);
router.use(serviciosRouter);
router.use(contactoRouter);

export default router;
