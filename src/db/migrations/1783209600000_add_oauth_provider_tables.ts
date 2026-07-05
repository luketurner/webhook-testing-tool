import "@/server-only";

// Tables for the better-auth jwt plugin (jwks) and @better-auth/oauth-provider
// plugin (oauthClient, oauthRefreshToken, oauthAccessToken, oauthConsent).
// Columns transcribed from the plugins' schema definitions.

export const up = `
create table "jwks" (
  "id" text not null primary key,
  "publicKey" text not null,
  "privateKey" text not null,
  "createdAt" date not null
);

create table "oauthClient" (
  "id" text not null primary key,
  "clientId" text not null unique,
  "clientSecret" text,
  "disabled" integer default 0,
  "skipConsent" integer,
  "enableEndSession" integer,
  "subjectType" text,
  "scopes" text,
  "userId" text references "user" ("id") on delete cascade,
  "createdAt" date,
  "updatedAt" date,
  "name" text,
  "uri" text,
  "icon" text,
  "contacts" text,
  "tos" text,
  "policy" text,
  "softwareId" text,
  "softwareVersion" text,
  "softwareStatement" text,
  "redirectUris" text not null,
  "postLogoutRedirectUris" text,
  "tokenEndpointAuthMethod" text,
  "grantTypes" text,
  "responseTypes" text,
  "public" integer,
  "type" text,
  "requirePKCE" integer,
  "referenceId" text,
  "metadata" text
);

create table "oauthRefreshToken" (
  "id" text not null primary key,
  "token" text not null unique,
  "clientId" text not null references "oauthClient" ("clientId") on delete cascade,
  "sessionId" text references "session" ("id") on delete set null,
  "userId" text not null references "user" ("id") on delete cascade,
  "referenceId" text,
  "expiresAt" date,
  "createdAt" date,
  "revoked" date,
  "authTime" date,
  "scopes" text not null
);

create table "oauthAccessToken" (
  "id" text not null primary key,
  "token" text unique,
  "clientId" text not null references "oauthClient" ("clientId") on delete cascade,
  "sessionId" text references "session" ("id") on delete set null,
  "userId" text references "user" ("id") on delete cascade,
  "referenceId" text,
  "refreshId" text references "oauthRefreshToken" ("id") on delete cascade,
  "expiresAt" date,
  "createdAt" date,
  "scopes" text not null
);

create table "oauthConsent" (
  "id" text not null primary key,
  "clientId" text not null references "oauthClient" ("clientId") on delete cascade,
  "userId" text references "user" ("id") on delete cascade,
  "referenceId" text,
  "scopes" text not null,
  "createdAt" date,
  "updatedAt" date
);
`;

export const down = `
drop table "oauthConsent";
drop table "oauthAccessToken";
drop table "oauthRefreshToken";
drop table "oauthClient";
drop table "jwks";
`;
