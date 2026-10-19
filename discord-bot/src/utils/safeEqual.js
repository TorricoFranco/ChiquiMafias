const crypto = require('crypto');

// Compara secretos en tiempo constante. Se hashean antes para que timingSafeEqual
// reciba buffers del mismo largo (no filtra la longitud) y tolera undefined.
const safeEqual = (received, expected) => {
  if (typeof received !== 'string' || typeof expected !== 'string') return false;
  if (expected.length === 0) return false;

  const a = crypto.createHash('sha256').update(received).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};

module.exports = { safeEqual };
