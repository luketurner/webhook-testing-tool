# Webhook Testing Tool (wtt)

> **Note:** This README is for `v2` of webhook-testing-tool, which is a full rewrite and under active development.
>
> The README and code for `v1` are available at: https://github.com/luketurner/webhook-testing-tool/releases/tag/v1.

`wtt` is an open-source alternative to webhook testing tools like https://webhook.site. It's designed for easy and lightweight self-hosting.

![Screenshot of the app](./docs/wtt_request.png)

How it works:

1. You deploy a copy of `wtt` for your personal use.
   - Designed for easy deployment on [Fly](https://fly.io), where it would cost between $0 to $3 per month depending on usage. But should work with any cloud provider.
2. You make arbitrary HTTP requests to your `wtt` instance, with any method and URL, and it returns a 200 OK response.
   - (optional) You write _handlers_ to configure how `wtt` responds to requests.
3. The full headers, raw payloads, etc. for all requests and responses are stored in a SQLite database.
4. You visit the admin URL in your browser to open a (password-protected) UI to view the requests and responses.

## Features

- Easy to deploy; runs in a single container.
- Automatically responds to any HTTP request.
- Response behavior can be customized with Typescript code by defining **handlers**.

## Protocols supported

- [x] HTTP/1.1
   - [ ] TLS socket info -- not available in Bun. [related issue](https://github.com/oven-sh/bun/issues/16834)
   - [ ] Binary bodies (`application/octet-stream`)
   - [ ] Multipart bodies
- [ ] HTTP/2
- [ ] HTTP/3
- [ ] gRPC
- [ ] Websockets
- [ ] Raw TCP
- [ ] Raw UDP

## Limitations

- Does not support multi-user login. (Users are expected to deploy their own instance of `wtt` instead of sharing.)
- Reliance on SQLite means horizontal scaling is tricky. I recommend running `wtt` with a single pod/container and SQLite stored in a persistent volume. You could probably make horizontal scaling work with [Litestream](https://litestream.io/) or something, but I haven't tried it.

## Handlers

One special feature is the ability to configure how `wtt` responds to requests using handlers.

![Screenshot of the app](./docs/wtt_handler.png)


Handlers are written in Javascript and can be edited in the `wtt` admin UI. You can define multiple scripts based on the request's HTTP method and URL. Handlers can be nested with an Express-style middleware pattern as well.

## Local testing

Requirements:

- [Bun](https://bun.sh/)

```bash
# install dependencies
bun install

# create local folder for db
mkdir local

# run the server
bun run dev

# run automated tests
bun run test
```

View the UI at http://localhost:3001/ (login with user `admin@example.com` / password `admin123` for local development)

## Deployment

`wtt` is designed for deployment on [Fly](https://fly.io):

```bash
flyctl launch --no-deploy
flyctl secrets set WTT_ADMIN_USERNAME=you@example.com WTT_ADMIN_PASSWORD=yoursecretpassword
flyctl volumes create -s 1 -r sea data
flyctl deploy
```
