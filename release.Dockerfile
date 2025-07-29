# syntax = docker/dockerfile:1
FROM alpine:latest
WORKDIR /app
ENV NODE_ENV="production"
RUN apk add --no-cache curl

# Download latest `wtt` release
RUN VERSION=$(curl -s "https://api.github.com/repos/luketurner/webhook-testing-tool/releases/latest" | grep -o '"tag_name": *"v[^"]*' | grep -o 'v.*$') && \
  curl -Lo wtt.tar.gz "https://github.com/luketurner/webhook-testing-tool/releases/download/${VERSION}/wtt-linux-x64.tar.gz" && \
  tar -xf wtt.tar.gz && \
  rm wtt.tar.gz

# HTTP webhook server
EXPOSE 3000

# Admin dashboard server
EXPOSE 3001

# TCP server
EXPOSE 3002

# (Optional) HTTPS server
# EXPOSE 3443

CMD [ "./wtt" ]