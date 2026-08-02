FROM node:22-alpine

WORKDIR /app

# Copy workspace manifests first for better layer caching.
COPY package.json package-lock.json* ./
COPY api/package.json ./api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm install

COPY packages/shared ./packages/shared
COPY api ./api

WORKDIR /app/api

EXPOSE 4000

CMD ["npm", "run", "dev"]
