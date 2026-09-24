# @corbits/xai-provider

xAI Grok PKCE OAuth config and token mapping to slot into `@corbits/oauth-core`'s `mountOAuthLogin`, plus a Responses adapter for xAI's CLI chat proxy over `@corbits/openai-responses`. This package never runs a login, stores a credential, or serves inference itself — the host wires those from the two dependency packages.

## Runtime support

The published tarball ships compiled `dist/` (ESM + declarations), so both Bun >= 1.2 and Node >= 24 run it. `@intx/inference` and `@intx/types` are peer dependencies and must resolve to the host's own copy.

## Quickstart

```sh
npm add @corbits/xai-provider
pnpm add @corbits/xai-provider
yarn add @corbits/xai-provider
bun add @corbits/xai-provider
```

Register xAI as one entry in the host's `OAuthLoginProviders` map and pass it to `@corbits/oauth-core/hub`'s `mountOAuthLogin`. The host owns persistence (credential storage, the grant check, the tenant router) — this package only supplies the OAuth config and the code exchange/refresh:

```ts
import type { OAuthLoginProviders } from "@corbits/oauth-core/hub";
import { mountOAuthLogin } from "@corbits/oauth-core/hub";
import {
  XAI_PROVIDER,
  xaiOAuthConfig,
  exchangeXaiCode,
  refreshXaiTokens,
} from "@corbits/xai-provider";

const oauthProviders: OAuthLoginProviders = {
  [XAI_PROVIDER]: {
    oauthConfig: xaiOAuthConfig,
    exchange: (code: string, verifier: string, now: number) =>
      exchangeXaiCode(code, verifier, now),
    refresh: (refreshSecret: string, now: number) =>
      refreshXaiTokens(refreshSecret, now),
  },
};

mountOAuthLogin(oauthLoginApi, {
  db,
  cipher: credentialCipher,
  requireGrant: requireGrant("credential:*", "create"),
  providers: oauthProviders,
  onError: (error, { provider }) => {
    reportError(error, { operation: "hub.oauth-login", extra: { provider } });
  },
});
```

`oauthLoginApi`, `db`, `credentialCipher`, `requireGrant`, and `reportError` are the host's own — see `@corbits/oauth-core`'s README for `mountOAuthLogin`'s full options.

### Registering the inference adapter

A sidecar loads `createXaiResponsesAdapter` by specifier at boot, keyed by the same `XAI_PROVIDER` id, e.g. from an `AdapterManifest` entry: `{"provider":"xai","specifier":"@corbits/xai-provider","export":"createXaiResponsesAdapter"}`. `@intx/inference`'s `loadAdapterFactories` turns that manifest into a `Record<string, AdapterFactory>`; the factory is called with a `LastCycleSource` once a run needs to send:

```ts
import {
  createXaiResponsesAdapter,
  XAI_DEFAULT_MODELS,
  XAI_PROVIDER,
} from "@corbits/xai-provider";
import type { LastCycleSource } from "@intx/types/runtime";

const source: LastCycleSource = {
  sourceId: "xai/1",
  provider: XAI_PROVIDER,
  model: XAI_DEFAULT_MODELS[0],
};

const adapter = createXaiResponsesAdapter(source);
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
