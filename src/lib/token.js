const jwt = require('jsonwebtoken');
const { unauthorized } = require('./errors');

function createTokenService({ secret, expiresIn }) {
  return {
    sign(user) {
      return jwt.sign({ role: user.role, username: user.username }, secret, {
        subject: String(user.id),
        expiresIn,
        algorithm: 'HS256',
      });
    },

    verify(token) {
      try {
        const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
        return {
          id: Number(payload.sub),
          role: payload.role,
          username: payload.username,
          expiresAt: payload.exp * 1000,
        };
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          throw unauthorized('Access token has expired', 'TOKEN_EXPIRED');
        }
        throw unauthorized('Access token is invalid', 'INVALID_TOKEN');
      }
    },

    get expiresIn() {
      return expiresIn;
    },
  };
}

module.exports = { createTokenService };
