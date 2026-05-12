import { pool } from "@workspace/db";

export const ROLE_CODES = ["usuario", "socio", "delegado", "directivo", "contable", "administrador"] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

const ROLE_PRIORITY: RoleCode[] = ["administrador", "contable", "directivo", "delegado", "socio", "usuario"];

function sanitizeRoles(input: unknown): RoleCode[] {
  const values = Array.isArray(input) ? input : [];
  const dedup = new Set<RoleCode>();
  for (const value of values) {
    const role = String(value ?? "").trim().toLowerCase();
    if ((ROLE_CODES as readonly string[]).includes(role)) {
      dedup.add(role as RoleCode);
    }
  }
  dedup.add("usuario");
  return ROLE_PRIORITY.filter((role) => dedup.has(role));
}

export function getPrimaryRole(roles: string[]): RoleCode {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return "usuario";
}

export async function ensureRoleTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS db_roles (
      id serial PRIMARY KEY,
      code varchar(50) NOT NULL UNIQUE,
      name varchar(100) NOT NULL,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS db_user_roles (
      id serial PRIMARY KEY,
      user_id integer NOT NULL,
      role_id integer NOT NULL,
      created_at timestamp DEFAULT now(),
      UNIQUE (user_id, role_id)
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_db_user_roles_user_id ON db_user_roles(user_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_db_user_roles_role_id ON db_user_roles(role_id);
  `);
  await pool.query(
    `
    INSERT INTO db_roles (code, name)
    VALUES
      ('usuario', 'Usuario'),
      ('socio', 'Socio'),
      ('delegado', 'Delegado'),
      ('directivo', 'Directivo'),
      ('contable', 'Contable'),
      ('administrador', 'Administrador')
    ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name, updated_at = now()
    `,
  );
}

export async function getUserRoles(userId: number, fallbackRole?: string | null): Promise<RoleCode[]> {
  await ensureRoleTables();
  const result = await pool.query(
    `
    SELECT r.code
    FROM db_user_roles ur
    JOIN db_roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1
    `,
    [userId],
  );
  const fromDb = result.rows.map((row) => String(row.code ?? "").trim().toLowerCase()).filter(Boolean);
  if (fromDb.length > 0) return sanitizeRoles(fromDb);
  return sanitizeRoles([fallbackRole || "usuario"]);
}

export async function setUserRoles(userId: number, roles: unknown): Promise<RoleCode[]> {
  const normalized = sanitizeRoles(roles);
  await ensureRoleTables();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM db_user_roles WHERE user_id = $1`, [userId]);
    await client.query(
      `
      INSERT INTO db_user_roles (user_id, role_id)
      SELECT $1, r.id
      FROM db_roles r
      WHERE r.code = ANY($2::text[])
      ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [userId, normalized],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return normalized;
}

