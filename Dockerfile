# DEPENDENCIAS
FROM node:22-alpine3.22 AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install


# Builder - Construir imagen docker producción
FROM node:22-alpine3.22 AS builder
WORKDIR /usr/src/app
# copia de deps, los modulos de node ya instalados
COPY --from=deps /usr/src/app/node_modules ./node_modules
# copiar todo el codigo fuente de la aplicacion
COPY . .
RUN npm run build
RUN npm ci -f --only=production && npm cache clean --force

# Creación de la imagen final de docker para producción
FROM node:22-alpine3.22 AS production

WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production

USER node

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"


CMD [ "node", "dist/main.js" ]
