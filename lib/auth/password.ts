import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";

/**
 * Server-only password hashing helpers using Argon2id.
 * Never import this in client components — hashing happens on the server.
 * (Algorithm defaults to Argon2id; not referenced explicitly because
 * it is a const enum and Next.js uses isolatedModules.)
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, {
    memoryCost: 19456, // ~19 MiB
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2Verify(hash, password);
  } catch {
    return false;
  }
}
