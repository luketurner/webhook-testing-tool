# syntax = docker/dockerfile:1
FROM oven/bun:alpine
WORKDIR /app
ENV NODE_ENV="production"

RUN apk add --no-cache python3 make gcc g++ libc-dev

# Install node modules
COPY --link package.json bun.lockb ./
RUN bun install --production --frozen-lockfile

# Copy application code
COPY --link . .

RUN bun run build

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "dist/wtt-linux-x64" ]