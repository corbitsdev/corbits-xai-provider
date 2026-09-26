# AGENTS.md

## Purpose

`@corbits/xai-provider` gives an Interchange host xAI (Grok)'s OAuth config,
token mapping, and a Responses-protocol adapter for xAI's CLI chat proxy. It
composes `@corbits/oauth-core` and `@corbits/openai-responses` rather than
reimplementing OAuth or the Responses wire protocol.

## Layout

- `src/constants.ts` — endpoints, client id, headers, model catalog, timeouts.
- `src/oauth.ts` — `xaiOAuthConfig`, token-response mapping (`idToken` carry-through), and JWT user-id decoding.
- `src/responses-adapter.ts` — `xaiResponsesQuirks` and `createXaiResponsesAdapter`, xAI's config for `@corbits/openai-responses`.
- `src/index.ts` — the public surface; nothing else is imported by consumers.
- `src/*.test.ts` — unit tests, excluded from the build.
- `e2e/live.test.ts` — the opt-in live suite (`XAI_LIVE_ACCESS_TOKEN`).

## Rules

- Consume `@intx/*` (`^0.4.0`) and the two `@corbits/*` packages (`^0.1.0`) as peer dependencies, pinned exactly in `devDependencies` — never vendor or fork them.
- Parse every trust boundary with arktype (JWT payload); never `as T` untrusted input.
- `exactOptionalPropertyTypes` is on: omit optional keys, never assign `undefined` to them.
- No product strings baked in; the x-grok-\* headers and user-agent are xAI wire requirements, not branding.
- Tests exist only for load-bearing risk: the exact wire request shape the
  proxy accepts, and JWT user-id decode that must not throw on garbage.
- Relative imports in `src/` carry explicit `.js` suffixes so the emitted ESM runs under Node; never add a build-time rewrite script or a bundler.
- Time, randomness, and `fetch` stay injectable so callers can test without patching globals.

## Local development

```sh
bun install && bun run check
```

To work against an unpushed local checkout of `@corbits/oauth-core` or
`@corbits/openai-responses`, `bun link` it here; never commit a lockfile
written against the link.
