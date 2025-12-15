import type { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

import { authConfig } from "../config/auth.config";
import type { AuthUserPayload } from "../types/auth";

interface DecodedToken extends JwtPayload {
  sub: string;
  email: string;
  role: string;
}

function isDecodedToken(payload: string | JwtPayload): payload is DecodedToken {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "sub" in payload &&
    "email" in payload &&
    "role" in payload &&
    typeof payload.sub === "string" &&
    typeof payload.email === "string" &&
    typeof payload.role === "string"
  );
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  const cookieToken = (req as any).cookies?.token;
  if (cookieToken && typeof cookieToken === "string") {
    return cookieToken;
  }

  return null;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret);

    if (!isDecodedToken(decoded)) {
      console.error("[authenticate] Invalid token payload structure");
      return res.status(401).json({ error: "Invalid token" });
    }

    const user: AuthUserPayload = {
      id: parseInt(decoded.sub, 10),
      email: decoded.email,
      role: decoded.role as AuthUserPayload["role"],
    };

    req.user = user;
    next();
  } catch (err) {
    console.error("[authenticate] JWT error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden: admin only" });
  }

  next();
}
