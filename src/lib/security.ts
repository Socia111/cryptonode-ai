// Security utilities for input validation and sanitization

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedInput: string;
}

/**
 * Comprehensive input validation and sanitization
 */
export function validateAndSanitizeInput(
  input: string,
  type: 'general' | 'email' | 'url' | 'alphanumeric' = 'general',
  maxLength: number = 1000
): ValidationResult {
  const errors: string[] = [];
  let sanitizedInput = input.trim();

  // Length validation
  if (sanitizedInput.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength} characters`);
  }

  // Dangerous pattern detection
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<applet/gi,
    /vbscript:/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /union\s+select/gi,
    /drop\s+(table|database)/gi,
    /delete\s+from/gi,
    /insert\s+into/gi,
    /update\s+.*set/gi,
    /alter\s+table/gi,
    /create\s+table/gi,
    /exec\s*\(/gi,
    /sp_\w+/gi,
    /xp_\w+/gi,
    /\.\.\//gi,
    /file:\/\//gi,
    /\x00/gi,
    /waitfor\s+delay/gi
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitizedInput)) {
      errors.push('Potentially malicious content detected');
      break;
    }
  }

  // Type-specific validation
  switch (type) {
    case 'email':
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(sanitizedInput)) {
        errors.push('Invalid email format');
      }
      break;
    case 'url':
      if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(sanitizedInput)) {
        errors.push('Invalid URL format');
      }
      break;
    case 'alphanumeric':
      if (!/^[A-Za-z0-9\s\-_]+$/.test(sanitizedInput)) {
        errors.push('Only alphanumeric characters, spaces, hyphens, and underscores are allowed');
      }
      break;
  }

  // Enhanced sanitization
  sanitizedInput = sanitizedInput
    .replace(/[<>"'`]/g, '') // Remove dangerous characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedInput
  };
}

/**
 * Rate limiting utility (client-side tracking)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * Secure API request wrapper
 */
export async function secureApiRequest(
  url: string,
  options: RequestInit = {},
  userToken?: string
): Promise<Response> {
  const headers = new Headers(options.headers);
  
  // Add security headers
  headers.set('Content-Type', 'application/json');
  headers.set('X-Requested-With', 'XMLHttpRequest');
  
  if (userToken) {
    headers.set('Authorization', `Bearer ${userToken}`);
  }

  // Rate limit check
  const rateLimit = checkRateLimit(`api:${url}`, 30, 60000);
  if (!rateLimit.allowed) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin'
  });
}

/**
 * CSRF token utility
 */
export function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}