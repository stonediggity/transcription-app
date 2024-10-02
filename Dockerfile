# Base stage
FROM node:18-alpine as base
RUN apk add --no-cache g++ make py3-pip libc6-compat
WORKDIR /app
COPY package*.json ./
EXPOSE 3001

# Builder stage
FROM base as builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

# Production stage
FROM base as production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001  
RUN npm ci

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

CMD ["npm", "start"]

# Development stage
FROM base as dev
WORKDIR /app

ENV NODE_ENV=development
ENV PORT=3001  
RUN npm ci

COPY . .
VOLUME ["/app/node_modules"]
VOLUME ["/app/.next"]

CMD ["npm", "run", "dev"]
