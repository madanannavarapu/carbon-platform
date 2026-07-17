FROM node:22-slim

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm install

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm install

COPY . .

RUN cd backend && npx tsc
RUN cd frontend && npm run build

EXPOSE 10000
CMD ["sh", "-c", "cd backend && node dist/server.js"]
