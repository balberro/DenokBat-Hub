import xmlrpc from "xmlrpc";

const ODOO_URL = process.env.ODOO_URL ?? "http://127.0.0.1:8069";
const ODOO_DB = process.env.ODOO_DB ?? "dinaserver";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? process.env.ODOO_USER ?? "dinaodooapi";
const ODOO_PASSWORD = process.env.ODOO_PASSWORD ?? "";
const ODOO_API_KEY = process.env.ODOO_API_KEY ?? "";
const SERVICE_PASSWORD = ODOO_API_KEY || ODOO_PASSWORD;

const AUTH_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedUid: number | null = null;
let cachedUidExpiresAt = 0;
let ongoingAuth: Promise<number | null> | null = null;

function parseOdooHost(url: string): { host: string; port: number; path: string; ssl: boolean } {
  // Acepta host:puerto sin protocolo y limpia comillas accidentales.
  const raw = String(url).trim().replace(/^['"]|['"]$/g, "");
  const candidate = raw.length > 0 ? raw : "http://127.0.0.1:8069";
  const safeUrl = /^https?:\/\//i.test(candidate) ? candidate : `http://${candidate}`;

  try {
    const parsed = new URL(safeUrl);
    const ssl = parsed.protocol === "https:";
    const port = parsed.port ? parseInt(parsed.port, 10) : (ssl ? 443 : 80);
    return { host: parsed.hostname, port, path: "", ssl };
  } catch {
    // Fallback de desarrollo para no tumbar autenticación por una URL malformada.
    return { host: "127.0.0.1", port: 8069, path: "", ssl: false };
  }
}

function createClient(endpoint: string) {
  const { host, port, ssl } = parseOdooHost(ODOO_URL);
  const factory = ssl ? xmlrpc.createSecureClient : xmlrpc.createClient;
  return factory({ host, port, path: endpoint });
}

function getCachedUid(): number | null {
  const now = Date.now();
  if (cachedUid && cachedUidExpiresAt > now) {
    return cachedUid;
  }
  return null;
}

async function getServiceUid(): Promise<number | null> {
  const cached = getCachedUid();
  if (cached) {
    return cached;
  }

  if (!ongoingAuth) {
    ongoingAuth = odooAuthenticate(ODOO_USERNAME, SERVICE_PASSWORD)
      .then((uid) => {
        if (uid) {
          cachedUid = uid;
          cachedUidExpiresAt = Date.now() + AUTH_CACHE_TTL_MS;
        }
        return uid;
      })
      .finally(() => {
        ongoingAuth = null;
      });
  }

  return ongoingAuth;
}

export async function odooAuthenticate(username: string, password: string): Promise<number | null> {
  return new Promise((resolve) => {
    const client = createClient("/xmlrpc/2/common");
    client.methodCall("authenticate", [ODOO_DB, username, password, {}], (err: Error, uid: number) => {
      if (err || !uid) {
        resolve(null);
      } else {
        resolve(uid);
      }
    });
  });
}

export async function odooCall(
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<unknown> {
  const uid = await getServiceUid();
  if (!uid) throw new Error("No se pudo autenticar con Odoo");

  return new Promise((resolve, reject) => {
    const client = createClient("/xmlrpc/2/object");
    client.methodCall(
      "execute_kw",
      [ODOO_DB, uid, SERVICE_PASSWORD, model, method, args, kwargs],
      (err: Error, result: unknown) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
}

export async function odooCallAsUser(
  uid: number,
  password: string,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const client = createClient("/xmlrpc/2/object");
    client.methodCall(
      "execute_kw",
      [ODOO_DB, uid, password, model, method, args, kwargs],
      (err: Error, result: unknown) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
}
