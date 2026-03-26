import { Router, type IRouter } from "express";
import { odooCall } from "../lib/odoo";

const router: IRouter = Router();

const MOCK_NOTICIAS = [
  { id: 1, titulo: "Nuevas actividades para la primavera 2026", tituloEu: "2026ko udaberriko jarduera berriak", resumen: "La asociación abre inscripciones para yoga, senderismo y talleres de cocina.", resumenEu: "Elkarteak yoga, mendizaletasun eta sukaldaritza tailerburu inskripzioak irekitzen ditu.", contenido: "<p>Este mes de abril, Denok Bat lanza un nuevo programa de actividades primavera-verano con más de 15 propuestas para todos los gustos.</p>", contenidoEu: null, fecha: "2026-03-20", imagen: null, categoria: "Actividades", autor: "Secretaría" },
  { id: 2, titulo: "Resultados de la asamblea anual", tituloEu: "Urteko batzarreko emaitzak", resumen: "Se aprobaron los presupuestos para 2026 y se renovó la junta directiva.", resumenEu: "2026rako aurrekontuak onartu ziren eta batzorde zuzendaritza berritu zen.", contenido: "<p>La asamblea general ordinaria de Denok Bat se celebró el pasado 15 de marzo con una asistencia récord de 340 socios.</p>", contenidoEu: null, fecha: "2026-03-17", imagen: null, categoria: "Institucional", autor: "Presidencia" },
  { id: 3, titulo: "Convenio con el centro de salud", tituloEu: "Hitzarmena osasun zentroarekin", resumen: "Nuevo acuerdo para ofrecer talleres de salud gratuitos a los socios.", resumenEu: "Hitzarmen berria bazkideei doako osasun tailerrak eskaintzeko.", contenido: "<p>Denok Bat ha firmado un convenio con el centro de salud municipal para ofrecer charlas mensuales sobre nutrición, movilidad y salud mental.</p>", contenidoEu: null, fecha: "2026-03-10", imagen: null, categoria: "Salud", autor: "Junta Directiva" },
];

router.get("/noticias", async (req, res): Promise<void> => {
  const { page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(String(page), 10);
  const limitNum = parseInt(String(limit), 10);

  try {
    const odooNews = (await odooCall("blog.post", "search_read", [
      [["website_published", "=", true]],
    ], {
      fields: ["name", "subtitle", "content", "post_date", "author_id", "tag_ids"],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      order: "post_date desc",
    })) as Record<string, unknown>[];

    if (odooNews && Array.isArray(odooNews) && odooNews.length > 0) {
      const items = odooNews.map((n) => ({
        id: Number(n.id),
        titulo: String(n.name ?? ""),
        tituloEu: null,
        resumen: n.subtitle ? String(n.subtitle) : null,
        resumenEu: null,
        contenido: n.content ? String(n.content) : null,
        contenidoEu: null,
        fecha: n.post_date ? String(n.post_date).split(" ")[0] : new Date().toISOString().split("T")[0],
        imagen: null,
        categoria: null,
        autor: n.author_id ? String((n.author_id as unknown[])[1] ?? "") : null,
      }));
      res.json({ items, total: items.length, page: pageNum, limit: limitNum });
      return;
    }
  } catch {
    // Usar mock
  }

  const start = (pageNum - 1) * limitNum;
  const paginated = MOCK_NOTICIAS.slice(start, start + limitNum);
  res.json({ items: paginated, total: MOCK_NOTICIAS.length, page: pageNum, limit: limitNum });
});

router.get("/noticias/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const found = MOCK_NOTICIAS.find((n) => n.id === id);
  if (!found) {
    res.status(404).json({ error: "Noticia no encontrada" });
    return;
  }
  res.json(found);
});

export default router;
