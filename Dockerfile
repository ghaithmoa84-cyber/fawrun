FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .
COPY tsconfig.json .
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter forerun-api exec prisma generate
RUN pnpm --filter @forerun/shared-constants build
RUN pnpm --filter @forerun/shared-types build
RUN pnpm --filter forerun-api build
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
