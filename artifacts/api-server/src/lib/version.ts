/**
 * Información de versión/build del servidor.
 *
 * La versión se embebe en el bundle en tiempo de build mediante esbuild
 * (`define: { __APP_VERSION__ }`), de modo que refleja el `package.json`
 * con el que se compiló esa instalación. Si por algún motivo no estuviera
 * definida, se cae a la variable de entorno y, finalmente, a un literal.
 *
 * No distingue entre test y producción: ambos se compilan con
 * `NODE_ENV=production`, así que lo único que se expone es la versión y el
 * entorno ("production" | "development").
 */

// Valor inyectado por esbuild en el build (ver build.ts).
declare const __APP_VERSION__: string | undefined;

export type VersionInfo = {
  /** Versión semántica de la app (p. ej. "0.2.0"). */
  version: string;
  /** Entorno de ejecución: "production" o "development". */
  entorno: string;
  /** Commit de git, si se inyectó en build. */
  commit: string | null;
  /** Fecha/hora de build (ISO), si se inyectó. */
  buildTime: string | null;
  /** Versión de Node del proceso. */
  node: string;
  /** Segundos que lleva el proceso en marcha. */
  uptimeSeconds: number;
};

function resolveVersion(): string {
  if (typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__) {
    return String(__APP_VERSION__);
  }
  if (process.env.APP_VERSION) return String(process.env.APP_VERSION);
  if (process.env.npm_package_version) return String(process.env.npm_package_version);
  return "0.0.0";
}

export function versionInfo(): VersionInfo {
  return {
    version: resolveVersion(),
    entorno: process.env.NODE_ENV ?? "development",
    commit: process.env.GIT_COMMIT ?? null,
    buildTime: process.env.BUILD_TIME ?? null,
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
  };
}
