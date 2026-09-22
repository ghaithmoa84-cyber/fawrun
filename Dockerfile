FROM node:20-alpine
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter fawrun-api build
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
