FROM node:22-alpine

WORKDIR /app

# Copy workspace manifests and base configs for layer caching and building.
COPY package.json package-lock.json* tsconfig.base.json ./
COPY api/package.json ./api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm install

COPY packages/shared ./packages/shared
COPY api ./api

RUN npm run build --workspace=@lifeos/shared

WORKDIR /app/api

EXPOSE 4000

CMD ["npm", "run", "dev"]
