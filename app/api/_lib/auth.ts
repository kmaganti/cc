import type { Customer } from "../../data/store";

const sessionCookieName = "cc_session";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function textBytes(value: string) {
  return new TextEncoder().encode(value);
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function hmac(value: string) {
  const secret = process.env.AUTH_SECRET || "dev-cricket-central-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    textBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, textBytes(value));
  return bytesToBase64(new Uint8Array(signature));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textBytes(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: 120000,
    },
    keyMaterial,
    256
  );
  return `pbkdf2:${bytesToBase64(salt)}:${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, storedHash?: string) {
  if (!storedHash) {
    return false;
  }
  const [method, saltValue, hashValue] = storedHash.split(":");
  if (method !== "pbkdf2" || !saltValue || !hashValue) {
    return false;
  }
  const salt = base64ToBytes(saltValue);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textBytes(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: 120000,
    },
    keyMaterial,
    256
  );
  return timingSafeEqual(hashValue, bytesToBase64(new Uint8Array(bits)));
}

export async function createSessionCookie(customerId: string, request: Request) {
  const issuedAt = Date.now().toString();
  const payload = `${customerId}.${issuedAt}`;
  const signature = await hmac(payload);
  const token = `${payload}.${signature}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=604800`;
}

export function clearSessionCookie() {
  return `${sessionCookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function sessionCustomerId(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`));
  if (!cookie) {
    return null;
  }

  const token = decodeURIComponent(cookie.slice(sessionCookieName.length + 1));
  const parts = token.split(".");
  if (parts.length < 3) {
    return null;
  }

  const customerId = parts[0];
  const issuedAt = parts[1];
  const signature = parts.slice(2).join(".");
  const expected = await hmac(`${customerId}.${issuedAt}`);
  const age = Date.now() - Number(issuedAt);
  if (!timingSafeEqual(signature, expected) || age > 7 * 24 * 60 * 60 * 1000) {
    return null;
  }

  return customerId;
}

export function publicCustomer(customer: Customer) {
  const { passwordHash: _passwordHash, resetToken: _resetToken, resetExpiresAt: _resetExpiresAt, ...safe } = customer;
  return safe;
}

export function randomResetToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return bytesToBase64(bytes).replaceAll("+", "").replaceAll("/", "").replaceAll("=", "").slice(0, 18);
}
