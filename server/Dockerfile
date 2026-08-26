FROM node:20-alpine

WORKDIR /app

# Install production dependencies only (jest/supertest/nodemon are dev-only)
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

# Initialize the schema/seed (idempotent) then start the API
CMD ["sh", "-c", "node scripts/init-db.js && node server.js"]
