# @corbits/xai-provider — Architecture

## Shape

This package is xAI-shaped configuration and mapping on top of two shared
packages. It does not reimplement OAuth or the Responses protocol.

```
host (provider id, InferenceSource)
        │
        ├─ oauth-core  ←  config, code exchange, refresh
        │
        ▼
createXaiResponsesAdapter(source)
        │  bake Responses quirks (headers, content, reasoning, opt-outs)
        ▼
@corbits/openai-responses ProviderAdapter
        │
        ▼
CLI chat proxy  or  api.x.ai   ← host chooses via source.baseURL
```

## Composition

| Concern | Owner |
| --- | --- |
| Login loop, callback server, credential store | Host via `@corbits/oauth-core` |
| OAuth client config and xAI token mapping | This package |
| Responses parse, SSE, replay | `@corbits/openai-responses` |
| xAI wire shape (path, headers, content, reasoning, opt-outs) | This package, baked at adapter construction |
| Which base URL and credential to send | Host (`InferenceSource.baseURL` + `apiKey`) |
| User id on the request | Host option `xaiUserId`, typically from `xaiUserIdFromAccessToken` |

## Provider id

This package registers under `xai`. The host keeps that id in its adapter
manifest and `InferenceSource.provider`.

## Two credential paths

The adapter is the same. The host picks the URL and secret:

- **OAuth (grok CLI) token.** Hits the CLI chat proxy. That proxy is the only
  audience for grok-cli OAuth tokens; `api.x.ai` rejects them. The proxy only
  serves the CLI model catalog (`XAI_DEFAULT_MODELS`).
- **Plain API key.** Hits `api.x.ai`. Not an OAuth token.

The harness injects the current secret at send. This package does not refresh
on the request path.

## Client identity

The CLI chat proxy only serves the official grok CLI client. This package
identifies as that client (`grok-shell` identifier, versioned user-agent,
public client id, fixed loopback redirect). Those headers are wire
requirements, not a product name the host can override.

## Quirks

`xaiResponsesQuirks` is this package's baked `ResponsesQuirks` bag. The host
does not supply it; the factory applies it. There is no separate host-identity
quirks type: unlike Codex, xAI does not need a product name in the operating
prompt.

A function-valued wrap is not used. The system prompt rides as a leading
`system` input message with plain string content, matching the proxy's own
request.

The proxy's own request never sets `parallel_tool_calls`, `max_output_tokens`,
or `temperature`. The shared Responses adapter forwards the last two by
default, so this bag opts both out and leaves parallel tool calls unset.

## Token mapping

A successful login yields an access token plus an optional `id_token` carried
through. Refresh responses may omit the refresh token; the previous refresh
token is carried forward so the session does not drop.

`xaiUserIdFromAccessToken` reads the JWT payload's `sub` only. It does not
verify the signature: the token arrived from the authorization server over
TLS and is used to label `x-grok-user-id`, not to authorize. Malformed input
returns undefined rather than throwing, so an API-key credential or a
truncated JWT does not abort a turn that can still authenticate via Bearer.

## Failure modes

- Sending a grok-cli OAuth token to `api.x.ai` → rejected (wrong audience).
- Sending a model the CLI chat proxy does not serve → rejected by the proxy.
- Sending `max_output_tokens` or `temperature` → not done by this factory;
  the proxy's own request never includes them.
- Authorization server rejects a redirect other than the grok CLI's exact
  loopback URI (`127.0.0.1`, port 1456).
- A stalled token endpoint without a timeout would hang a refresh on the
  inference send path; the config bounds that request.
