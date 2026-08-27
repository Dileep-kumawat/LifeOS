FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy workspace manifests, base configs, and shared package source
COPY package.json package-lock.json* tsconfig.base.json ./
COPY api/package.json ./api/package.json
COPY packages/shared ./packages/shared

# Install dependencies and build shared package via postinstall
RUN npm install --legacy-peer-deps

COPY api ./api

WORKDIR /app/api

EXPOSE 4000

CMD ["npm", "run", "dev"]
