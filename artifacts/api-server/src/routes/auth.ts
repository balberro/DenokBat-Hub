import { Router, type IRouter } from "express";
import { odooAuthenticate, odooCall } from "../lib/odoo";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function determineRole(uid: number, groups: string[]): string {
  if (groups.some((g) => g.includes("Administrator") || g.includes("Administrador"))) {
    return "administrador";
  }
  if (groups.some((g) => g.includes("Accountant") || g.includes("Contable") || g.includes("Finance"))) {
    return "contable";
  }
  if (groups.some((g) => g.includes("Manager") || g.includes("Directivo") || g.includes("Director"))) {
    return "directivo";
  }
  if (groups.some((g) => g.includes("Delegado") || g.includes("Delegate"))) {
    return "delegado";
  }
  if (uid > 0) {
    return "socio";
  }
  return "usuario";
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    res.status(400).json({ error: "Usuario y contraseña son obligatorios" });
    return;
  }

  const uid = await odooAuthenticate(username, password);
  if (!uid) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  let partnerData: Record<string, unknown>[] = [];
  try {
    partnerData = (await odooCall("res.users", "search_read", [
      [["id", "=", uid]],
    ], {
      fields: ["name", "email", "partner_id", "groups_id"],
      limit: 1,
    })) as Record<string, unknown>[];
  } catch {
    partnerData = [];
  }

  const user = partnerData[0] ?? {};
  const groupIds = (user.groups_id as number[]) ?? [];

  let groupNames: string[] = [];
  if (groupIds.length > 0) {
    try {
      const groups = (await odooCall("res.groups", "search_read", [
        [["id", "in", groupIds]],
      ], {
        fields: ["full_name"],
      })) as Record<string, unknown>[];
      groupNames = groups.map((g) => String(g.full_name ?? ""));
    } catch {
      groupNames = [];
    }
  }

  const role = determineRole(uid, groupNames);

  const token = signToken({
    uid,
    username,
    name: String(user.name ?? username),
    email: user.email ? String(user.email) : null,
    role,
    groupId: null,
  });

  res.json({
    token,
    user: {
      id: uid,
      name: String(user.name ?? username),
      email: user.email ? String(user.email) : null,
      role,
      avatar: null,
      groupId: null,
    },
  });
});

router.get("/auth/me", requireAuth, (req, res): void => {
  const user = req.user!;
  res.json({
    id: user.uid,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: null,
    groupId: user.groupId,
  });
});

export default router;
