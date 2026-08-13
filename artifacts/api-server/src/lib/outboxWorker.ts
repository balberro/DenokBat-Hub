import { pool } from "@workspace/db";
import { claimBatch, processOutboxRow } from "./outbox";

let running = false;
const POLL_MS = Number(process.env.ODOO_OUTBOX_POLL_MS ?? 5000);

/** Comprueba si la tabla outbox existe (la crea la migración fix-db-odoo-integracion.sql). */
async function outboxTableExists(): Promise<boolean> {
  try {
    const r = await pool.query(`SELECT to_regclass('public.db_odoo_outbox') AS tbl`);
    return r.rows[0]?.tbl != null;
  } catch {
    return false;
  }
}

/** Arranca el worker de la cola transaccional → Odoo (proceso en segundo plano). */
export function startOutboxWorker(): void {
  const tick = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const batch = await claimBatch(10);
      for (const row of batch) {
        await processOutboxRow(row);
      }
    } catch (err) {
      console.error("[outbox-worker]", err);
    } finally {
      running = false;
    }
  };

  // No arrancar el polling si la tabla aún no está migrada (evita spam de errores).
  void outboxTableExists().then((exists) => {
    if (!exists) {
      console.warn(
        "[outbox-worker] db_odoo_outbox no existe; worker desactivado. " +
        "Ejecuta la migración lib/db/fix-db-odoo-integracion.sql y reinicia.",
      );
      return;
    }
    void tick();
    setInterval(() => { void tick(); }, POLL_MS);
    console.info(`[outbox-worker] worker iniciado (poll cada ${POLL_MS} ms)`);
  });
}
