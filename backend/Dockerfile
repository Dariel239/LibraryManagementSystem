FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 5000

# Migration is idempotent (CREATE TABLE IF NOT EXISTS), so it's safe to run on
# every container start. Runs as its own process/pool, then exits before the
# server starts its own pool.
CMD ["sh", "-c", "node src/config/migrate.js && node src/server.js"]
