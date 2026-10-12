---
title: Porting to production
type: guide
status: draft
tags: [guide, production]
created: 2026-10-11
updated: 2026-10-11
---

# Porting to production (real company internal tool)

Each item swaps a demo implementation for a production one. Details get filled in as each piece is built. The interfaces are listed under "Swap points" in [Architecture](../architecture.md).

| Area          | Demo                | Production change                                                                                                                   |
| ------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in       | Dev user picker     | Set `AUTH_OIDC_ISSUER` / `_CLIENT_ID` / `_CLIENT_SECRET`; keep `AUTH_DEV_LOGIN` unset or `false` (it defaults to off in production) |
| Secrets       | Dev defaults        | Generate fresh `AUTH_SECRET` and `AUTH_JWT_SECRET` (`openssl rand -base64 32`); never reuse the Compose values                      |
| Users         | Faker seed          | Implement `UserDirectorySource` (HRIS / SCIM); keep just-in-time provisioning                                                       |
| API tokens    | HS256 shared secret | RS256 keypair; the API verifies via JWKS                                                                                            |
| Realtime      | In-memory PubSub    | Set the Redis URL; required for more than one API or worker instance                                                                |
| Files         | SeaweedFS           | S3 / R2 bucket + credentials                                                                                                        |
| GIFs          | Bundled set         | `GIPHY_API_KEY`; review the content rating                                                                                          |
| Notifications | In-app              | Add `EmailChannel` + user preferences                                                                                               |
| Hosting       | Docker Compose      | Web → Vercel or a container host; API + worker → Fly/Railway/ECS; Postgres → Neon/RDS                                               |
| Compliance    | —                   | Data retention policy, a hard-purge job, an audit-log export (out of scope for v1)                                                  |
