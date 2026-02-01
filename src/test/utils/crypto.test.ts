import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "../../utils/crypto";

describe("crypto", () => {
  describe("encrypt and decrypt", () => {
    it("encrypts and decrypts a simple string", () => {
      const plaintext = "hello-world";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts a token-like string", () => {
      const plaintext = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-payload";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertext for same plaintext due to random IV", () => {
      const plaintext = "same-input";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it("encrypts and decrypts empty string", () => {
      const plaintext = "";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts unicode characters", () => {
      const plaintext = "Hello 世界 🌍";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts long strings", () => {
      const plaintext = "a".repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe("decrypt", () => {
    it("throws on invalid base64 input", () => {
      expect(() => decrypt("not-valid-base64!!!")).toThrow();
    });

    it("throws on tampered ciphertext", () => {
      const encrypted = encrypt("test");
      const tampered = encrypted.slice(0, -5) + "XXXXX";

      expect(() => decrypt(tampered)).toThrow();
    });

    it("throws on truncated ciphertext", () => {
      const encrypted = encrypt("test");
      const truncated = encrypted.slice(0, 20);

      expect(() => decrypt(truncated)).toThrow();
    });
  });
});
