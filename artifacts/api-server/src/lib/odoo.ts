import xmlrpc from "xmlrpc";

const ODOO_URL = process.env.ODOO_URL ?? "";
const ODOO_DB = process.env.ODOO_DB ?? "dinaserver";
const ODOO_USERNAME = process.env.ODOO_USERNAME ?? "dinaodooapi";
const ODOO_PASSWORD = process.env.ODOO_PASSWORD ?? "";

function parseOdooHost(url: string): { host: string; port: number; path: string; ssl: boolean } {
  const parsed = new URL(url);
  const ssl = parsed.protocol === "https:";
  const port = parsed.port ? parseInt(parsed.port, 10) : (ssl ? 443 : 80);
  return { host: parsed.hostname, port, path: "", ssl };
}

function createClient(endpoint: string) {
  const { host, port, ssl } = parseOdooHost(ODOO_URL);
  const factory = ssl ? xmlrpc.createSecureClient : xmlrpc.createClient;
  return factory({ host, port, path: endpoint });
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
  const uid = await odooAuthenticate(ODOO_USERNAME, ODOO_PASSWORD);
  if (!uid) throw new Error("No se pudo autenticar con Odoo");

  return new Promise((resolve, reject) => {
    const client = createClient("/xmlrpc/2/object");
    client.methodCall(
      "execute_kw",
      [ODOO_DB, uid, ODOO_PASSWORD, model, method, args, kwargs],
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
