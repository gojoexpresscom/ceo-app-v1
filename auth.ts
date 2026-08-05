export const ADMIN_EMAIL = "ceo.exchange.web@gmail.com";
export const OWNER_EMAIL = "gojoexpresscom@gmail.com";

export type UserRole = "user" | "admin" | "owner";

export function isAdminEmail(email: string): boolean {
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
}

export function isOwnerEmail(email: string): boolean {
  return email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase();
}

export function isPrivilegedEmail(email: string): boolean {
  return isAdminEmail(email) || isOwnerEmail(email);
}

/**
 * Strong password validation:
 * - At least 8 characters
 * - At least 1 capital letter
 * - At least 6 digits (numbers)
 * - At least 1 special character
 */
export function validateStrongPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 capital letter." };
  }
  const digitCount = (password.match(/\d/g) || []).length;
  if (digitCount < 6) {
    return { valid: false, message: "Password must contain at least 6 digits (numbers)." };
  }
  if (!/[!@#$%^&*()_+={};':"|,.<>?~`-]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 special character (e.g., $, !, @, #)." };
  }
  return { valid: true, message: "" };
}

/**
 * Standard password validation for regular users (less strict than admin/owner)
 */
export function validateStandardPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 capital letter." };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 number." };
  }
  if (!/[!@#$%^&*()_+={};':"|,.<>?~`-]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 special character (e.g., $, !, @, #)." };
  }
  return { valid: true, message: "" };
}

/**
 * Generate a unique fallback nickname like "vqrn138"
 */
export function generateNickname(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const letters = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const numbers = Math.floor(Math.random() * 900 + 100).toString();
  return `${letters}${numbers}`;
}
