const { unauthorized, forbidden } = require('../lib/errors');

const ROLES = Object.freeze({ USER: 'USER', ADMIN: 'ADMIN' });

function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(forbidden());
    }
    return next();
  };
}

module.exports = { authorize, ROLES };
