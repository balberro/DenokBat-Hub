import app from "./app";
import { startOutboxWorker } from "./lib/outboxWorker";

// En hosting con Passenger el puerto puede ser 0 (socket efimero).
// Mantiene compatibilidad con despliegues donde PORT viene definido.
const rawPort = process.env["PORT"] ?? "0";

const port = Number(rawPort);

if (Number.isNaN(port) || port < 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port === 0 ? "ephemeral (0)" : port}`);
});

// Worker de cola transaccional → Odoo (facturación/cobros asíncronos).
startOutboxWorker();
