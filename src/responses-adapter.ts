import {
  responsesAdapterFactory,
  type ResponsesQuirks,
} from "@corbits/openai-responses";
import type { AdapterFactory } from "@intx/inference";
import { type } from "arktype";
import {
  XAI_AUTHENTICATE_RESPONSE,
  XAI_CLIENT_IDENTIFIER,
  XAI_CLIENT_MODE,
  XAI_CLIENT_VERSION,
  XAI_REASONING_EFFORT_OPTION,
  XAI_RESPONSES_PATH,
  XAI_SESSION_ID_OPTION,
  XAI_TOKEN_AUTH,
  XAI_USER_AGENT,
  XAI_USER_ID_OPTION,
} from "./constants.js";

// Mirrors the grok CLI's own /v1/responses request (captured live): the
// system prompt rides as a leading `system` input message with plain string
// content (not parts), text-only turns flatten to a string, reasoning is
// always requested at "detailed" summary depth, and the caller is identified
// by x-grok-* headers rather than a body field. The proxy's own request
// never sets `parallel_tool_calls`, so this quirks bag leaves it unset
// rather than forcing it either way.
export const xaiResponsesQuirks: ResponsesQuirks = {
  path: XAI_RESPONSES_PATH,
  headers: {
    static: {
      "user-agent": XAI_USER_AGENT,
      "x-grok-client-identifier": XAI_CLIENT_IDENTIFIER,
      "x-grok-client-version": XAI_CLIENT_VERSION,
      "x-grok-client-mode": XAI_CLIENT_MODE,
      "x-xai-token-auth": XAI_TOKEN_AUTH,
      "x-authenticateresponse": XAI_AUTHENTICATE_RESPONSE,
    },
    modelHeader: "x-grok-model-override",
    fromOption: [{ optionKey: XAI_USER_ID_OPTION, header: "x-grok-user-id" }],
  },
  sessionIdOption: XAI_SESSION_ID_OPTION,
  systemPrompt: { role: "system", shape: "string" },
  contentShape: "flat",
  reasoning: {
    summary: "detailed",
    effortOption: XAI_REASONING_EFFORT_OPTION,
  },
  // The proxy's own request never sends max_output_tokens or temperature;
  // the shared package forwards both by default, so both must opt out here.
  maxOutputTokens: false,
  temperature: false,
};

// A catalog source carries no providerOptions, so a deployment states the
// user id here. Visible ASCII only, so a value that is not a valid header
// fails here rather than on every request.
const XaiSourceQuirks = type({
  "userId?": /^[\x21-\x7e]+$/,
  "+": "reject",
});

const createBaseAdapter = responsesAdapterFactory(xaiResponsesQuirks);

/**
 * `AdapterFactory` for xAI's Responses-speaking CLI chat proxy, with xAI's
 * headers, system-prompt placement, and reasoning shape baked in via
 * `@corbits/openai-responses`. The source's `quirks` may name the
 * `userId` sent as `x-grok-user-id`; a per-call option overrides it.
 */
export const createXaiResponsesAdapter: AdapterFactory = (source, quirks) => {
  const parsed = XaiSourceQuirks(quirks ?? {});
  if (parsed instanceof type.errors)
    throw new Error(`@corbits/xai-provider: invalid quirks: ${parsed.summary}`);
  if (parsed.userId === undefined) return createBaseAdapter(source);
  return responsesAdapterFactory({
    ...xaiResponsesQuirks,
    headers: {
      ...xaiResponsesQuirks.headers,
      static: {
        ...xaiResponsesQuirks.headers?.static,
        "x-grok-user-id": parsed.userId,
      },
    },
  })(source);
};
