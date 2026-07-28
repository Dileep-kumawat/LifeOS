FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

RUN npm install

COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/server

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/

RUN npm install --only=production

EXPOSE 5000

CMD ["node", "apps/server/dist/server.js"]
