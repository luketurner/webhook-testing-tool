# Webhook Testing Tool (wtt)

> **Note:** This README is for `v2` of webhook-testing-tool, which is a full rewrite and under active development.
>
> The README and code for `v1` are available at: https://github.com/luketurner/webhook-testing-tool/releases/tag/v1.

`wtt` is an open-source alternative to webhook testing tools like https://webhook.site. It's designed for easy and lightweight self-hosting.

![Screenshot of the app](./docs/screenshot.png)

How it works:

1. You deploy a copy of `wtt` for your personal use.
   - Designed for easy deployment on [Fly](https://fly.io), where it would cost between $0 to $3 per month depending on usage. But should work with any cloud provider.
2. You make arbitrary HTTP requests to your `wtt` instance, with any method and URL, and it returns a 200 OK response.
   - (optional) You write _responder scripts_ to configure how `wtt` responds to requests.
3. The full headers, raw payloads, etc. for all requests and responses are stored in a SQLite database.
4. You visit the admin URL in your browser to open a (password-protected) UI to view the requests and responses.

## Features

- Easy to deploy; runs in a single container.
- Automatically responds to any HTTP request.
- Response behavior can be customized with Typescript code by defining **handlers**.

## Limitations

- Does not support multi-user login. (Users are expected to deploy their own instance of `wtt` instead of sharing.)
- Reliance on SQLite means horizontal scaling is tricky. I recommend running `wtt` with a single pod/container and SQLite stored in a persistent volume. You could probably make horizontal scaling work with [Litestream](https://litestream.io/) or something, but I haven't tried it.

## Responder scripts

One special feature is the ability to configure how `wtt` responds to requests.

Responder scripts are written in Javascript and can be edited in the `wtt` admin UI. You can define multiple scripts based on the request's HTTP method and URL.

Responder script documentation (copied from the admin UI):

> By default, WTT will respond with a 200 OK to any request. You can configure response behavior on a per-route basis by adding responder scripts below.
>
> Responder scripts have access to a req object with params, query, headers, body, method, and originalUrl properties. They also have access to a res object which will be used to construct the HTTP response for the request. The res object can have any of the following properties: status, headers, and body.
>
> For example, to return a JSON response if the request has a JSON payload with foo property and a 400 response if it doesn't, you could write:
>
> ```js
> const body = JSON.parse(req.body);
> if (body?.foo) {
>   res.body = { gotFoo: body.foo };
> } else {
>   res.status = 400;
> }
> ```
>
> Responder scripts are only run when the request matches the configured Route (HTTP method and path) for that script. The path can be a wildcard \* indicating that any path matches, or it can be a value like /foo which would match any request where the path starts with /foo.
>
> Scripts are matched in order of specificity, meaning if you have multiple scripts that match the request, only the most specific will be executed. For example, if one script's route has the wildcard path, another matches the beginning of the path, and a third matches the full path exactly, the third one will be chosen to be executed.

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

View the UI at http://localhost:3001/ (login with user `admin` / password `admin` for local development)

## Deployment

`wtt` is designed for deployment on [Fly](https://fly.io):

```bash
flyctl launch --no-deploy
flyctl secrets set WTT_ADMIN_PASSWORD=yoursecretpassword
flyctl volumes create -s 1 -r sea data
flyctl deploy
```

See http://blog.luketurner.org/posts/hosting-your-own-webhook-testing-service-on-fly/ for a more detailed explanation about deploying `wtt` on Fly.
