# @corbits/xai-provider

xAI Grok PKCE OAuth config and token mapping over `@corbits/oauth-core`, base URLs for the OAuth CLI chat proxy and plain API keys, and a Responses adapter for xAI's CLI chat proxy over `@corbits/openai-responses`. It does not run a login or manage a session — the host wires those from the two dependency packages.

## Quickstart

Bun >= 1.2 runs the published TypeScript source. Node >= 24 is an engines floor for tooling; native Node does not load this extensionless TypeScript source as-is. `@intx/inference` and `@intx/types` are peer dependencies and must resolve to the host's own copy.

```sh
npm add @corbits/xai-provider
pnpm add @corbits/xai-provider
yarn add @corbits/xai-provider
bun add @corbits/xai-provider
```

```ts
import type { AdapterManifest } from "@intx/inference";
import { XAI_PROVIDER } from "@corbits/xai-provider";

// Host-owned: register the adapter under the host's provider id.
export const inferenceManifest: AdapterManifest = [
  {
    provider: XAI_PROVIDER,
    specifier: "@corbits/xai-provider",
    export: "createXaiResponsesAdapter",
  },
];
```

`xaiOAuthConfig`, `exchangeXaiCode`, and `refreshXaiTokens` plug into `@corbits/oauth-core`'s `buildAuthorizeUrl`, `exchangeCode`, and `refreshTokenRequest`. Persistence is the host (Interchange `oauth_token` or OS vault).

```ts
import type { LastCycleSource } from "@intx/types/runtime";
import {
  XAI_DEFAULT_MODELS,
  XAI_PROVIDER,
  createXaiResponsesAdapter,
} from "@corbits/xai-provider";

const source: LastCycleSource = {
  sourceId: "xai/1",
  provider: XAI_PROVIDER,
  model: XAI_DEFAULT_MODELS[0],
};

export const adapter = createXaiResponsesAdapter(source);
```

An OAuth (grok CLI) credential hits `XAI_OAUTH_PROXY_BASE_URL` and only serves `XAI_DEFAULT_MODELS`. A plain API key hits `XAI_API_KEY_BASE_URL` instead. Reasoning effort, the xAI user id, and the inference session id ride as provider options under `XAI_REASONING_EFFORT_OPTION`, `XAI_USER_ID_OPTION`, and `XAI_SESSION_ID_OPTION`. `xaiUserIdFromAccessToken` decodes the user id out of an access token's JWT `sub` claim and never verifies the signature — it labels a header, it is not an authorization decision.

## How it works

This package supplies xAI's endpoints, client id, and token mapping; login and refresh stay in `@corbits/oauth-core`. Requests identify as the grok CLI (`grok-shell`) via `x-grok-*` headers, mirroring the CLI's own `/v1/responses` request. The system prompt rides as a leading `system` message with plain string content; reasoning is always requested at `detailed` summary depth with the caller's effort forwarded. The proxy's own request never sends `max_output_tokens`, `temperature`, or `parallel_tool_calls`, so neither does the adapter.

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

`bun run format` rewrites the tree. `bun run check` is typecheck + lint + format:check + test.

## License

LGPL-2.1-only.
