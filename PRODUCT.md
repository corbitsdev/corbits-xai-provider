# @corbits/xai-provider — Product

## What it is

xAI/Grok as an Interchange inference provider: PKCE OAuth config and token
mapping for `@corbits/oauth-core`, a base URL for a plain API key, and a
Responses adapter for xAI's CLI chat proxy over `@corbits/openai-responses`.

## Why it exists

Hosts that already run Interchange need a Grok path without owning xAI's OAuth
dialect or the Responses wire shape the CLI chat proxy accepts. This package
supplies the xAI-specific constants, token mapping, and adapter factory so the
host can compose login and storage from `@corbits/oauth-core` instead of
forking the grok CLI.

## Who it is for

Interchange hosts that resolve `@intx/inference` and `@intx/types`, and will
compose `@corbits/oauth-core` for the login loop, callback server, and
credential store — or that already hold a plain xAI API key.

## What users can do

- Register `createXaiResponsesAdapter` under provider id `xai`.
- Plug `xaiOAuthConfig`, `exchangeXaiCode`, and `refreshXaiTokens` into
  `@corbits/oauth-core`'s `startOAuthLogin` and `createTokenSession`.
- Point an OAuth (grok CLI) credential at `XAI_OAUTH_PROXY_BASE_URL` with a
  model from `XAI_DEFAULT_MODELS`.
- Point a plain API key at `XAI_API_KEY_BASE_URL` instead.
- Decode `xaiUserIdFromAccessToken` so the harness can put the issuer's user
  id on the request without a separate lookup.

## Non-goals

- This package does not run login, store tokens, or pick the base URL. The
  host wires those and puts the current access token (or API key) on
  `InferenceSource.apiKey`.
- There is no Chat Completions path and no product-named quirks bag. The
  Responses wire shape is baked; the host does not supply it.
- No TUI, telemetry, or product strings are baked in. The `x-grok-*` headers
  and user-agent are xAI wire requirements, not branding.

## License

LGPL-2.1-only.
