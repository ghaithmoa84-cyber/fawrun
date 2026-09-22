FROM node:20-alpine
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter fawrun-api build
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
