# @corbits/xai-provider — Implementation

## Package

- Name: `@corbits/xai-provider`
- Public export: `./src/index.ts` (TypeScript source; no `dist/`)
- License: LGPL-2.1-only
- Dependencies: `@corbits/oauth-core` and `@corbits/openai-responses`
  as `github:` specifiers (never vendored); `arktype` for trust-boundary
  parse.

## Runtime

- Bun >= 1.2 is the development runtime and consumes this package's
  TypeScript source directly.
- Node >= 24 is the engines floor; native Node does not load this
  extensionless TypeScript source as-is.
- Peer dependencies: `@intx/inference` and `@intx/types`. They must
  resolve to the host's own copy.

## Install

```sh
npm add @corbits/xai-provider
pnpm add @corbits/xai-provider
yarn add @corbits/xai-provider
bun add @corbits/xai-provider
```

## Public surface

From `@corbits/xai-provider`:

- `XAI_PROVIDER` — `"xai"`.
- `XAI_OAUTH_PROXY_BASE_URL` — `https://cli-chat-proxy.grok.com/v1`.
- `XAI_API_KEY_BASE_URL` — `https://api.x.ai/v1`.
- `XAI_DEFAULT_MODELS` — `grok-4.5`, `grok-4.6`, `grok-composer-2.5-fast`.
- `XAI_CLIENT_ID`, `XAI_AUTHORIZE_URL`, `XAI_TOKEN_URL`,
  `XAI_REDIRECT_URI`, `XAI_SCOPES`, `XAI_RESPONSES_PATH`,
  `XAI_CLIENT_IDENTIFIER`, `XAI_CLIENT_VERSION`, `XAI_USER_AGENT`,
  `XAI_TOKEN_TIMEOUT_MS`, `XAI_REFRESH_SKEW_MS`.
- `XAI_USER_ID_OPTION` (`xaiUserId`),
  `XAI_SESSION_ID_OPTION` (`xaiSessionId`),
  `XAI_REASONING_EFFORT_OPTION` (`xaiReasoningEffort`).
- `xaiOAuthConfig`, `exchangeXaiCode`, `refreshXaiTokens`,
  `xaiTokensFromResponse`, `xaiUserIdFromAccessToken`, `XaiTokens`.
- `createXaiResponsesAdapter` — `AdapterFactory`.
- `xaiResponsesQuirks` — the baked `ResponsesQuirks` bag.

Consumers import only this surface.

## Adapter factory

```ts
import type { AdapterManifest } from "@intx/inference";
import {
  XAI_PROVIDER,
  createXaiResponsesAdapter,
} from "@corbits/xai-provider";

const manifest: AdapterManifest = [
  {
    provider: XAI_PROVIDER,
    specifier: "@corbits/xai-provider",
    export: "createXaiResponsesAdapter",
  },
];
```

The factory bakes Responses quirks:

- path `/responses`
- static headers `user-agent: grok-shell/0.2.93 (macos; aarch64)`,
  `x-grok-client-identifier: grok-shell`,
  `x-grok-client-version: 0.2.93`
- model header `x-grok-model-override`
- `x-grok-user-id` from `xaiUserId`
- session id as `prompt_cache_key` from `xaiSessionId`
- system prompt as `system` / string; `contentShape: "flat"`
- reasoning summary `"detailed"`; effort from `xaiReasoningEffort`
- `maxOutputTokens: false`, `temperature: false`
- `parallel_tool_calls` left unset

## OAuth

```ts
import {
  xaiOAuthConfig,
  exchangeXaiCode,
  refreshXaiTokens,
} from "@corbits/xai-provider";
```

- Authorize: `https://auth.x.ai/oauth2/authorize`
- Token: `https://auth.x.ai/oauth2/token`
- Redirect: `http://127.0.0.1:1456/callback` (`127.0.0.1`, not `localhost`)
- Client id `b1a00492-073a-47ea-816f-4c329264a828` (public, not a secret)
- Scopes: `openid`, `profile`, `email`, `offline_access`, `grok-cli:access`,
  `api:access`
- Token timeout 15s; refresh skew 5 minutes (access tokens last ~1 hour)
- Access-token JWT `sub` is the user id for `x-grok-user-id`

## Wire

OAuth inference: `https://cli-chat-proxy.grok.com/v1/responses` with the
grok-cli bearer token. API-key inference: `https://api.x.ai/v1/responses`.
No Chat Completions path.

## Development

```sh
git clone https://github.com/corbitsdev/corbits-xai-provider.git
cd corbits-xai-provider
bun install
bun run typecheck
bun run lint
bun run format:check
bun run test
bun run check
```

`bun run format` rewrites the tree. `bun run check` is typecheck + lint +
format:check + test.

`bun.lock` is committed. `@corbits/oauth-core` and
`@corbits/openai-responses` resolve from their GitHub repos; `bun install`
needs those repos pushed. Do not commit a lockfile written against
`bun link` symlinks.
