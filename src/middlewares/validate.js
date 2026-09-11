const { badRequest } = require('../lib/errors');

const SOURCES = ['params', 'query', 'body'];

function validate(schemas) {
  return (req, _res, next) => {
    const validated = {};
    const issues = [];

    for (const source of SOURCES) {
      if (!schemas[source]) {
        continue;
      }
      const result = schemas[source].safeParse(req[source] ?? {});
      if (result.success) {
        validated[source] = result.data;
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            location: source,
            path: issue.path.join('.'),
            message: issue.message,
          })),
        );
      }
    }

    if (issues.length > 0) {
      return next(badRequest('VALIDATION_ERROR', 'Request validation failed', issues));
    }

    req.validated = validated;
    return next();
  };
}

module.exports = { validate };
