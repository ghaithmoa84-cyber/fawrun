FROM node:20-slim
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .
COPY tsconfig.json .
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter fawrun-api exec prisma generate
RUN pnpm --filter @fawrun/shared-constants build
RUN pnpm --filter @fawrun/shared-types build
RUN pnpm --filter fawrun-api build
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
