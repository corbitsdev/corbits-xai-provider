# @corbits/xai-provider

xAI Grok for `@intx/inference`: the grok CLI OAuth client config and token mapping for `@corbits/oauth-core`, and a Responses API adapter for xAI's CLI chat proxy built on `@corbits/openai-responses`. An inference provider for Corbits and Interchange agents that also works in any host that runs `@intx/inference`.

## Why @corbits/xai-provider?

1. **Grok on a grok CLI login.** grok CLI OAuth tokens are rejected by `api.x.ai` and only work against the CLI chat proxy. This package supplies the PKCE login config, the code exchange and refresh, and the proxy endpoint.
2. **The exact request the proxy accepts.** The `x-grok-*` client headers, the model-override header, a string-shaped leading `system` message and `detailed` reasoning summaries are fixed in the adapter. `max_output_tokens` and `temperature` are never sent.
3. **No hub required for inference.** `xaiUserIdFromAccessToken` reads the user id header value from the access token's JWT `sub` claim, so a sidecar needs only the token.

## Install

```bash
bun add @corbits/xai-provider @corbits/oauth-core@^0.1.0 @corbits/openai-responses@^0.1.0 @intx/inference@^0.4.0 @intx/types@^0.4.0
```

Runs on Bun >= 1.2 or Node >= 24.

## Quickstart

Needs `XAI_ACCESS_TOKEN` from a completed grok CLI login.

```ts
import { createDependencies, runInference } from "@intx/inference";
import {
  createXaiResponsesAdapter,
  XAI_DEFAULT_MODELS,
  XAI_OAUTH_PROXY_BASE_URL,
  XAI_PROVIDER,
  XAI_USER_ID_OPTION,
  xaiUserIdFromAccessToken,
} from "@corbits/xai-provider";

const token = process.env["XAI_ACCESS_TOKEN"];
if (token === undefined) throw new Error("XAI_ACCESS_TOKEN is not set");
const userId = xaiUserIdFromAccessToken(token);
if (userId === undefined) throw new Error("XAI_ACCESS_TOKEN has no sub claim");

const deps = createDependencies({
  has: (provider) => provider === XAI_PROVIDER,
  resolve: createXaiResponsesAdapter,
});

let seq = 0;
for await (const event of runInference({
  deps,
  source: {
    id: "xai",
    provider: XAI_PROVIDER,
    baseURL: XAI_OAUTH_PROXY_BASE_URL,
    credentialId: "xai",
    model: XAI_DEFAULT_MODELS[0],
  },
  turns: [
    {
      role: "user",
      timestamp: Date.now(),
      content: [{ type: "text", text: "Say hello." }],
    },
  ],
  inferenceOptions: {
    providerOptions: { [XAI_USER_ID_OPTION]: userId },
  },
  nextSeq: () => seq++,
  readMaterial: () => ({ secret: token }),
})) {
  if (event.type === "inference.text.delta")
    process.stdout.write(event.data.token);
  if (event.type === "inference.error")
    throw new Error(event.data.error.message);
}
process.stdout.write("\n");
```

## Where it fits

[Interchange](https://github.com/faremeter/interchange) runs AI agents as principals (accounts that hold their own identity, permissions and credentials). Corbits packages add what an agent product needs around it.

- **Runs in:** the agent sidecar (the runtime next to each agent) for inference, and the hub (the multi-tenant control plane) for login and token refresh.
- **Plugs into:** the [`@intx/inference`](https://github.com/faremeter/interchange/tree/main/packages/inference) adapter registry, as the factory for the `xai` provider id.
- **Pairs with:** [`@corbits/oauth-core`](https://github.com/corbitsdev/corbits-oauth-core) for login and refresh, and [`@corbits/openai-responses`](https://github.com/corbitsdev/corbits-openai-responses), the wire protocol underneath.

## Reference

| Export                                                   | Description                                                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `createXaiResponsesAdapter`                              | `AdapterFactory` for the CLI chat proxy. Per-source `quirks` are ignored.                       |
| `xaiResponsesQuirks`                                     | The `ResponsesQuirks` the adapter is built from.                                                |
| `xaiOAuthConfig`                                         | `OAuthClientConfig` for `@corbits/oauth-core`: client id, endpoints, loopback redirect, scopes. |
| `exchangeXaiCode(code, verifier, now, fetch?)`           | Redeems an authorization code for `XaiTokens`.                                                  |
| `refreshXaiTokens(refresh, now, fetch?)`                 | Refreshes `XaiTokens`, keeping the old refresh token when the response omits one.               |
| `xaiTokensFromResponse(response, now, previousRefresh?)` | Maps a token endpoint response to `XaiTokens`, carrying `id_token` as `idToken`.                |
| `xaiUserIdFromAccessToken(access)`                       | Reads the JWT `sub` claim. Returns `undefined` on malformed input; does not verify signatures.  |
| `XaiTokens`                                              | Type.                                                                                           |
| `XAI_PROVIDER`                                           | The `"xai"` provider id.                                                                        |
| `XAI_OAUTH_PROXY_BASE_URL`                               | `https://cli-chat-proxy.grok.com/v1`, the base URL for OAuth credentials.                       |
| `XAI_API_KEY_BASE_URL`                                   | `https://api.x.ai/v1`, the base URL for API key credentials.                                    |
| `XAI_DEFAULT_MODELS`                                     | The model ids the CLI chat proxy serves.                                                        |
| `XAI_USER_ID_OPTION`                                     | `providerOptions` key sent as the `x-grok-user-id` header.                                      |
| `XAI_SESSION_ID_OPTION`                                  | `providerOptions` key sent as `prompt_cache_key`.                                               |
| `XAI_REASONING_EFFORT_OPTION`                            | `providerOptions` key sent as `reasoning.effort`.                                               |
| `XAI_REFRESH_SKEW_MS`                                    | Refresh this long before expiry.                                                                |

The OAuth and client-identity constants behind `xaiOAuthConfig` and the adapter (`XAI_CLIENT_ID`, `XAI_AUTHORIZE_URL`, `XAI_TOKEN_URL`, `XAI_REDIRECT_URI`, `XAI_SCOPES`, `XAI_TOKEN_TIMEOUT_MS`, `XAI_RESPONSES_PATH`, `XAI_CLIENT_IDENTIFIER`, `XAI_CLIENT_VERSION`, `XAI_USER_AGENT`) are exported too.

## Using with Interchange

Register the login on the hub. `@corbits/oauth-core/hub`'s `mountOAuthLogin` and `createOAuthTokenRefresher` take a map of providers; this package supplies the xAI entry:

```ts
import type { OAuthLoginProviders } from "@corbits/oauth-core/hub";
import {
  exchangeXaiCode,
  refreshXaiTokens,
  XAI_PROVIDER,
  xaiOAuthConfig,
} from "@corbits/xai-provider";

export const providers: OAuthLoginProviders = {
  [XAI_PROVIDER]: {
    oauthConfig: xaiOAuthConfig,
    exchange: (code, verifier, now) => exchangeXaiCode(code, verifier, now),
    refresh: (refreshSecret, now) => refreshXaiTokens(refreshSecret, now),
  },
};
```

Load the adapter in the sidecar from an operator-configured `AdapterManifest`:

```ts
import { createDependencies, type AdapterManifest } from "@intx/inference";
import { loadAdapterRegistry } from "@intx/inference/providers";

const manifest: AdapterManifest = [
  {
    provider: "xai",
    specifier: "@corbits/xai-provider",
    export: "createXaiResponsesAdapter",
  },
];
export const deps = createDependencies(await loadAdapterRegistry(manifest));
```

Each xAI source points at `XAI_OAUTH_PROXY_BASE_URL`, uses the OAuth access token as its credential, and picks a model from `XAI_DEFAULT_MODELS`. Pass `xaiUserIdFromAccessToken(token)` as `providerOptions[XAI_USER_ID_OPTION]`.

## License

[LGPL-2.1-only](https://github.com/corbitsdev/corbits-xai-provider/blob/main/LICENSE)
