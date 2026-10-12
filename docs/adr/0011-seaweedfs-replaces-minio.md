---
title: "ADR-0011: SeaweedFS replaces MinIO for local S3 storage"
type: adr
status: accepted
tags: [adr, infrastructure, storage]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0011: SeaweedFS replaces MinIO for local S3 storage

## Context

The planning session chose MinIO as the local S3-compatible store behind `FileStorage` (used for avatars). While scaffolding Phase 1 it turned out that MinIO's community edition is no longer a viable dependency:

- It stopped publishing Docker images in October 2025.
- Its repository went into maintenance mode in December 2025 and was later archived.
- It is now distributed as source only.

Depending on it would mean building and patching our own image.

## Decision

- Use **SeaweedFS** (Apache 2.0, actively released) as the local S3-compatible store.
- It runs as a single container: `weed server -s3`, pinned to an exact image tag in `docker-compose.yml`.
- Dev-only credentials live in `infra/seaweedfs/s3.json`.
- The application only ever talks to the **S3 API** through `FileStorage`, so production uses S3 / R2 unchanged.

## Alternatives considered

- **Chainguard's rebuilt MinIO image**: a third-party build of a project that's no longer maintained upstream.
- **Garage**: solid, but it needs a cluster-layout setup step even for one node.
- **RustFS**: promising, but the newest and least proven.
- **S3Proxy**: good for disposable tests, less so as a persistent dev store.

## Consequences

- Only the Compose service changes. The `FileStorage` design is untouched.
- Buckets are created by the API at startup (`ensureBucket`) when storage is wired up, rather than by an init container.
