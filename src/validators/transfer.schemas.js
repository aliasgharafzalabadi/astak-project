const { z } = require('zod');

const transferBody = z.object({
  toUserId: z.number().int().positive(),
  amount: z.number().int('Amount must be an integer (Toman)').positive().max(Number.MAX_SAFE_INTEGER),
  description: z.string().trim().max(255).optional(),
});

module.exports = { transferBody };
