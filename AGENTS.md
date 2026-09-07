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

## Rules

- Consume `@intx/*` (peer dependency) and the two `@corbits/*` dependencies (`github:` specifiers) as packages only — never vendor or fork them.
- Parse every trust boundary with arktype (JWT payload); never `as T` untrusted input.
- `exactOptionalPropertyTypes` is on: omit optional keys, never assign `undefined` to them.
- No product strings baked in; the x-grok-\* headers and user-agent are xAI wire requirements, not branding.
- Tests exist only for load-bearing risk: the exact wire request shape the
  proxy accepts, and JWT user-id decode that must not throw on garbage.
- Time, randomness, and `fetch` stay injectable so callers can test without patching globals.

## Local development

```sh
bun install
bun run check    # typecheck + lint + format:check + test
```

`@corbits/oauth-core` and `@corbits/openai-responses` resolve from their
GitHub repos, so `bun install` needs those repos pushed. To work against an
unpushed local checkout of either, `bun link` it here; a later `bun install`
re-resolves from git and drops the link.

## Distribution

The package ships TypeScript source: `exports` points at `src/index.ts`,
there is no build step and no `dist/`. Consumers install it with
`bun add @corbits/xai-provider` and Bun runs the source as-is. `bun.lock`
is committed; the two `@corbits/*` dependencies still resolve from their
GitHub repos and switch to npm version ranges at publish time.
