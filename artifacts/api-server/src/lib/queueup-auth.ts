import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { Request, Response } from "express";

const cookieName = "queueup_owner_session";
const sessionLifetimeMs = 12 * 60 * 60 * 1000;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be configured for QueueUp owner sessions");
  }
  return secret;
}

export function assertOwnerSessionConfiguration(): void {
  sessionSecret();
}

function signature(payload: string): string {
  return createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
}

export function setOwnerSession(
  response: Response,
  slug: string,
  businessId: string,
): void {
  const expiresAt = Date.now() + sessionLifetimeMs;
  const payload = Buffer.from(`${businessId}:${expiresAt}`).toString("base64url");
  response.cookie(cookieName, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/api/businesses/${encodeURIComponent(slug)}`,
    maxAge: sessionLifetimeMs,
  });
}

export function clearOwnerSession(response: Response, slug: string): void {
  response.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/api/businesses/${encodeURIComponent(slug)}`,
  });
}

export function hasOwnerSession(
  request: Request,
  businessId: string,
): boolean {
  const token = request.cookies?.[cookieName];
  if (typeof token !== "string") return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  let expectedSignature: string;
  try {
    expectedSignature = signature(payload);
  } catch {
    return false;
  }

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return false;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const separatorIndex = decoded.lastIndexOf(":");
    if (separatorIndex <= 0) return false;
    const sessionBusinessId = decoded.slice(0, separatorIndex);
    const expiresAt = Number(decoded.slice(separatorIndex + 1));
    return (
      sessionBusinessId === businessId &&
      Number.isFinite(expiresAt) &&
      expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}
