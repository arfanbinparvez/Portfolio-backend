# Minimal Node.js image for the API server.
# Northflank builds this automatically when you point it at the repo.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
