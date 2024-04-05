# syntax = docker/dockerfile:1
FROM oven/bun:distroless
WORKDIR /app
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base as build

# Install node modules
COPY --link package-lock.json package.json ./
RUN bun install --production --frozen-lockfile

# Copy application code
COPY --link . .

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "bun", "run", "start" ]