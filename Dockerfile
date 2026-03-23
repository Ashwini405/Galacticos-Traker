# Build frontend
FROM node:18-alpine AS client-builder

WORKDIR /builder/client
COPY client/package*.json ./
RUN npm install
RUN chmod -R +x node_modules/.bin

COPY client/ .
RUN npm run build


# Backend server
FROM node:18-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY server/package*.json ./
RUN npm install

COPY server/ ./server/

# Copy built frontend
COPY --from=client-builder /builder/client/dist ./client/dist

EXPOSE 10000

CMD ["node", "server/index.js"]