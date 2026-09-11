FROM node:22-alpine AS base
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_REGISTRY=$NPM_REGISTRY
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS development
ENV NODE_ENV=development
RUN npm ci --no-audit --no-fund
COPY . .
EXPOSE 3000 9229
CMD ["npx", "nodemon", "--legacy-watch", "--watch", "src", "src/server.js"]

FROM base AS prod-deps
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY db ./db
COPY docs ./docs
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
