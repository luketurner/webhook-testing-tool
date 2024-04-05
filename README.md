# Webhook tester

An open-source, self-hosted alternative to webhook testing tools like https://webhook.site

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