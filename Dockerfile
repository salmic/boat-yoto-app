FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_CLIENT_ID
ARG VITE_API_BASE_URL
ARG VITE_IPAPI_KEY

ENV VITE_CLIENT_ID=$VITE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_IPAPI_KEY=$VITE_IPAPI_KEY

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001
ENV CACHE_DIR=/tmp/cache

EXPOSE 3001

CMD ["node", "server/index.js"]
