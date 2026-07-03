# --- Dev image: judges run `docker-compose up -d --build` and hit :5173 ---
FROM node:20-alpine

WORKDIR /app

# Install deps first so this layer is cached across rebuilds
COPY package*.json ./
RUN npm install

# Copy the rest of the source
COPY . .

EXPOSE 5173

# vite.config.ts already binds host 0.0.0.0 / port 5173, so this is
# reachable from outside the container without extra flags here.
CMD ["npm", "run", "dev"]