const { z } = require('zod');

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,50}$/, 'Username must be 3-50 characters of letters, digits or underscore');

const registerBody = z.object({
  username,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  fullName: z.string().trim().min(1).max(100),
});

const loginBody = z.object({
  username,
  password: z.string().min(1).max(72),
});

module.exports = { username, registerBody, loginBody };
