const fs = require('node:fs');
const path = require('node:path');
const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const OPENAPI_PATH = path.resolve(__dirname, '../../docs/openapi.yaml');

function loadOpenApiDocument() {
  return YAML.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
}

function createDocsRouter() {
  const document = loadOpenApiDocument();
  const router = Router();
  router.get('/api-docs.json', (_req, res) => res.json(document));
  router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(document, { customSiteTitle: 'Digital Wallet API' }));
  return router;
}

module.exports = { createDocsRouter, loadOpenApiDocument };
