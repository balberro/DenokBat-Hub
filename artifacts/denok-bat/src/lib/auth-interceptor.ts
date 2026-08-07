/**
 * Interceptor global de autenticación.
 *
 * Envuelve `window.fetch` para detectar respuestas 401 en llamadas a la API
 * y cerrar la sesión automáticamente (limpiando token/usuario y redirigiendo
 * a /login). Así todas las páginas que usan `fetch` (directo o a través de los
 * hooks generados por Orval) quedan cubiertas sin editar cada llamada.
 *
 * Se excluyen deliberadamente:
 *  - El endpoint público de login: su 401 significa "credenciales inválidas",
 *    no "sesión expirada", y no debe provocar logout/redirección.
 *  - Cualquier otra ruta que no pase por la API (`/api`), para no reaccionar a
 *    401 de terceros.
 */
const LOGIN_ENDPOINT_RE = /\/api\/auth\/login(\?|$)/;
// Evita bucles de redirección si ya estamos en /login.
let redirectingToLogin = false;

function expirationHandler() {
try {
    localStorage.removeItem("denok-bat-storage");
    localStorage.removeItem("denok-bat-token");
} catch {
    // localStorage puede no estar disponible; se ignora.
}

if (redirectingToLogin) return;
redirectingToLogin = true;

const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const currentPath = window.location.pathname.replace(basePath, "");
if (currentPath === "/login") {
    redirectingToLogin = false;
    return;
}

window.location.href = "/login";
}

export function installAuthInterceptor() {
if (typeof window === "undefined" || !("fetch" in window)) return;

const originalFetch = window.fetch.bind(window);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);

    let url = "";
    try {
    url =
        typeof input === "string"
        ? input
        : input instanceof URL
            ? input.toString()
            : input.url;
    } catch {
    url = "";
    }

    // Solo interesa rutas de la API que no sean el login público.
    const isApiRoute = /\/api\//.test(url) || url.endsWith("/api");
    if (!isApiRoute || LOGIN_ENDPOINT_RE.test(url)) {
    return response;
    }

    if (response.status === 401) {
    expirationHandler();
    }

    return response;
}) as typeof fetch;
}
