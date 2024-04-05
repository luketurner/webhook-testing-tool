# syntax = docker/dockerfile:1
FROM oven/bun:alpine
WORKDIR /app
ENV NODE_ENV="production"

# Install node modules
COPY --link package-lock.json package.json bun.lockb ./
RUN bun install --production --frozen-lockfile

# Copy application code
COPY --link . .

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "bun", "run", "start" ]