# Webhook tester

An open-source, self-hosted alternative to webhook testing tools like https://webhook.site.

How it works:

1. You deploy a copy of the app for your personal use.
  - Designed for easy deployment on [Fly](https://fly.io), where it would cost between $0 to $3 per month depending on usage.
2. You make arbitrary HTTP requests to the app, with any method and URL, and it returns a 200 OK response.
  - (optional) You write _responder scripts_ to configure how the app responds to requests.
3. The full headers, raw payloads, etc. for all requests and responses are stored in a SQLite database.
4. You visit the special `/__admin` URL in your browser to open a (password-protected) UI to view the requests and responses.

## Local testing

```bash
# install dependencies
bun install

# create local folder for db
mkdir local

# run the server
bun run dev
```

View the UI at http://localhost:3000/__ui (login with user `admin` / password `admin` for local development)

## Deployment

```bash
# initial setup
flyctl launch --no-deploy
flyctl secrets set WT_ADMIN_PASSWORD=yoursecretpassword

# deploy
flyctl deploy
```