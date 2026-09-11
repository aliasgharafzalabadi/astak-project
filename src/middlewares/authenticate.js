const { unauthorized } = require('../lib/errors');

function extractBearerToken(header) {
  if (typeof header !== 'string') {
    return null;
  }
  const [scheme, token] = header.trim().split(/\s+/);
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function authenticate(tokenService) {
  return (req, _res, next) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return next(unauthorized('Missing or malformed Authorization header'));
    }
    try {
      req.user = tokenService.verify(token);
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { authenticate, extractBearerToken };
