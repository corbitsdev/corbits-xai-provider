# @corbits/xai-provider

xAI/Grok PKCE OAuth config and token mapping over `@corbits/oauth-core`, a base URL for a plain API key, and a Responses adapter for xAI's CLI chat proxy over `@corbits/openai-responses`. It does not run a login or manage a session — the host wires those from the two dependency packages.

## Install

```sh
npm add @corbits/xai-provider
pnpm add @corbits/xai-provider
yarn add @corbits/xai-provider
bun add @corbits/xai-provider
```

Requires Node >= 24 and Bun >= 1.2. The package ships TypeScript source; Bun consumes it directly. `@intx/inference` and `@intx/types` are peer dependencies and must resolve to the host's own copy.

## Use

```ts
import type { AdapterManifest } from "@intx/inference";
import {
  XAI_PROVIDER,
  createXaiResponsesAdapter,
  xaiOAuthConfig,
} from "@corbits/xai-provider";

const manifest: AdapterManifest = [
  {
    provider: XAI_PROVIDER,
    specifier: "@corbits/xai-provider",
    export: "createXaiResponsesAdapter",
  },
];

void createXaiResponsesAdapter;
void xaiOAuthConfig;
void manifest;
```

`xaiOAuthConfig`, `exchangeXaiCode`, and `refreshXaiTokens` plug into `@corbits/oauth-core`. Persistence is the host (Interchange `oauth_token` or OS vault).

## Full example

```ts
import type { InferenceSource } from "@intx/types/runtime";
import {
  XAI_DEFAULT_MODELS,
  XAI_OAUTH_PROXY_BASE_URL,
  XAI_PROVIDER,
  createXaiResponsesAdapter,
} from "@corbits/xai-provider";

const source: InferenceSource = {
  id: "xai/1",
  provider: XAI_PROVIDER,
  baseURL: XAI_OAUTH_PROXY_BASE_URL,
  apiKey: "<access token>",
  model: XAI_DEFAULT_MODELS[0],
};

const adapter = createXaiResponsesAdapter(source);
void adapter;
```

An OAuth (grok CLI) credential hits `XAI_OAUTH_PROXY_BASE_URL` and only serves `XAI_DEFAULT_MODELS`. A plain API key hits `XAI_API_KEY_BASE_URL` instead. The current access token goes on `apiKey` — the harness injects it at send.

## How it works

This package supplies xAI's endpoints, client id, and token mapping; login and refresh stay in `@corbits/oauth-core`. Requests identify as the official grok CLI because the CLI chat proxy only serves that client. `xaiUserIdFromAccessToken` decodes JWT `sub` and never verifies the signature — it labels a header, it is not an authorization decision.

## Contributing

```sh
bun install
bun run typecheck
bun run lint
bun run format:check
bun run test
bun run check
```

`bun run format` rewrites the tree. `bun run check` is typecheck + lint + format:check + test.

## License

LGPL-2.1-only.
