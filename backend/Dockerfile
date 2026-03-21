FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=src/prisma/schema.prisma

# Create upload and log dirs
RUN mkdir -p uploads logs

# Run migrations + seed + start
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/docker-entrypoint.sh"]
