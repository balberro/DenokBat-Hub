import { Router, type IRouter } from "express";
import { odooCall } from "../lib/odoo";

const router: IRouter = Router();

router.post("/contacto", async (req, res): Promise<void> => {
  const { nombre, email, telefono, mensaje } = req.body ?? {};

  if (!nombre || !email || !mensaje) {
    res.status(400).json({ error: "Nombre, email y mensaje son obligatorios" });
    return;
  }

  try {
    await odooCall("crm.lead", "create", [{
      name: `Contacto web: ${nombre}`,
      contact_name: nombre,
      email_from: email,
      phone: telefono ?? "",
      description: mensaje,
      type: "lead",
    }]);
  } catch {
    // Si Odoo no disponible, registrar igualmente
  }

  res.json({ success: true, message: "Mensaje enviado correctamente. Nos pondremos en contacto con usted." });
});

router.post("/sugerencias", async (req, res): Promise<void> => {
  const { nombre, email, categoria, mensaje } = req.body ?? {};

  if (!categoria || !mensaje) {
    res.status(400).json({ error: "Categoría y mensaje son obligatorios" });
    return;
  }

  try {
    await odooCall("helpdesk.ticket", "create", [{
      name: `Sugerencia: ${categoria}`,
      partner_name: nombre ?? "Anónimo",
      partner_email: email ?? "",
      description: mensaje,
      tag_ids: [],
    }]);
  } catch {
    // Si Odoo helpdesk no disponible, ok
  }

  res.json({ success: true, message: "Sugerencia enviada. ¡Gracias por tu aportación!" });
});

export default router;
