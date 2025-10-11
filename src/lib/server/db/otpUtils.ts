// File: src/lib/server/otpUtils.ts
// Shared utilities for OTP management

// In-memory storage for OTPs (use Redis or database in production)
export const otpStorage = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

// In-memory storage for rate limiting (use Redis in production)
const rateLimitStorage = new Map<string, { count: number; resetAt: number }>();

/**
 * Generate a 6-digit OTP code
 * @returns {string} 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check rate limit for OTP requests
 * @param {string} identifier - Email or unique identifier
 * @returns {boolean} True if request is allowed, false if rate limit exceeded
 */
export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const normalizedIdentifier = identifier.toLowerCase();
  const limit = rateLimitStorage.get(normalizedIdentifier);

  if (!limit || now > limit.resetAt) {
    // First request or limit expired - reset counter
    rateLimitStorage.set(normalizedIdentifier, { 
      count: 1, 
      resetAt: now + 15 * 60 * 1000 // 15 minutes
    });
    return true;
  }

  if (limit.count >= 5) {
    // Max 5 attempts per 15 minutes exceeded
    return false;
  }

  // Increment counter
  limit.count++;
  return true;
}

/**
 * Get remaining time until rate limit resets
 * @param {string} identifier - Email or unique identifier
 * @returns {number} Remaining seconds until reset, 0 if no limit active
 */
export function getRateLimitTimeRemaining(identifier: string): number {
  const normalizedIdentifier = identifier.toLowerCase();
  const limit = rateLimitStorage.get(normalizedIdentifier);
  
  if (!limit) {
    return 0;
  }

  const now = Date.now();
  const remaining = Math.ceil((limit.resetAt - now) / 1000);
  
  return remaining > 0 ? remaining : 0;
}

/**
 * Clean up expired OTPs and rate limits (call periodically)
 * This should be run as a background job in production
 */
export function cleanupExpiredData(): void {
  const now = Date.now();

  // Clean up expired OTPs
  for (const [email, data] of otpStorage.entries()) {
    if (now > data.expiresAt) {
      otpStorage.delete(email);
    }
  }

  // Clean up expired rate limits
  for (const [identifier, data] of rateLimitStorage.entries()) {
    if (now > data.resetAt) {
      rateLimitStorage.delete(identifier);
    }
  }
}

/**
 * Format email for display (mask middle characters)
 * @param {string} email - Email address to mask
 * @returns {string} Masked email (e.g., jo****@example.com)
 */
export function maskEmail(email: string): string {
  return email.replace(/^(.{2})(.*)(@.*)$/, (_, start, middle, domain) => {
    return start + '*'.repeat(Math.min(middle.length, 8)) + domain;
  });
}

/**
 * Validate OTP format
 * @param {string} otp - OTP to validate
 * @returns {boolean} True if valid format
 */
export function isValidOTPFormat(otp: string): boolean {
  return /^\d{6}$/.test(otp.trim());
}

// Optional: Run cleanup every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredData, 30 * 60 * 1000);
}

// Export types for TypeScript
export interface OTPData {
  otp: string;
  expiresAt: number;
  attempts: number;
}

export interface RateLimitData {
  count: number;
  resetAt: number;
}