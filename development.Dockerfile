# syntax = docker/dockerfile:1
FROM oven/bun:debian
WORKDIR /app

RUN apt update && apt install -y python3 make g++ libc-dev

# Install node modules
COPY --link package.json bun.lockb ./
RUN bun install --production --frozen-lockfile

# Copy application code
COPY --link . .

RUN bun run build -- bun-linux-x64

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "dist/wtt-linux-x64" ]