FROM node:20-slim
WORKDIR /srv
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . ./
RUN npm run build
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["npx", "tsx", "server.ts"]
