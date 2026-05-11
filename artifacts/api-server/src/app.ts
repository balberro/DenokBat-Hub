import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import path from "node:path";
import { existsSync } from "node:fs";

const app: Express = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Permite herramientas locales sin Origin (curl, health checks)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origen no permitido por CORS"));
  },
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "artifacts/api-server/uploads")));
app.use("/uploads", express.static(path.resolve(process.cwd(), "artifacts/api-server/artifacts/api-server/uploads")));

app.use("/api", router);

const webDistDir = process.env.WEB_DIST_DIR
  ? path.resolve(process.cwd(), process.env.WEB_DIST_DIR)
  : path.resolve(process.cwd(), "artifacts/denok-bat/dist/public");
const webIndexPath = path.join(webDistDir, "index.html");

// En despliegues de test/producción podemos servir también la SPA
// desde el backend para simplificar la infraestructura.
if (existsSync(webIndexPath)) {
  app.use(express.static(webDistDir));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      next();
      return;
    }
    res.sendFile(webIndexPath);
  });
}

export default app;
