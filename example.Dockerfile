# syntax = docker/dockerfile:1
FROM alpine:latest
WORKDIR /app
ENV NODE_ENV="production"

# Download latest `wtt` release
RUN VERSION=$(curl -s "https://api.github.com/repos/luketurner/webhook-testing-tool/releases/latest" | \grep -Po '"tag_name": *"v\K[^"]*') && \
  curl -Lo wtt.tar.gz "https://github.com/luketurner/webhook-testing-tool/releases/download/v${VERSION}/wtt-linux-x64.tar.gz" && \
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