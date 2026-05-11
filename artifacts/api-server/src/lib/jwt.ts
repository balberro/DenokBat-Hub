import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

function getJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET es obligatorio y no está configurado");
  }
  console.warn(
    "[api-server] JWT_SECRET no definido; usando secreto de solo desarrollo",
  );
  return "dev-only-insecure-jwt-secret-do-not-use-in-production";
}

export interface JwtPayload {
  uid: number;
  username: string;
  name: string;
  email: string | null;
  role: string;
  groupId: number | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
}
