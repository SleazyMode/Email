import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHash] = storedHash.split(":");
  const actualHash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");

  if (actualHash.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expected);
}

export function randomToken(size = 24) {
  return randomBytes(size).toString("hex");
}

export function randomCode(length = 6) {
  const digits = "0123456789";
  let output = "";

  for (let index = 0; index < length; index += 1) {
    output += digits[Math.floor(Math.random() * digits.length)];
  }

  return output;
}
