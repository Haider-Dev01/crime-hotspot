FROM node:20-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend ./backend
ENV PROJECT_ROOT=/app
ENV HOST=0.0.0.0
ENV PORT=5000
WORKDIR /app/backend
EXPOSE 5000
CMD ["node", "server.js"]
