FROM node:20.19.0-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY . .
RUN npm run build

FROM node:20.19.0-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --from=build /app ./
RUN npm prune --omit=dev && mkdir -p /app/data

EXPOSE 3000
VOLUME ["/app/data"]
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0"]
