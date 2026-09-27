// Live calls against xAI's CLI chat proxy. Opt in by setting
// XAI_LIVE_ACCESS_TOKEN (a grok CLI OAuth access token). XAI_LIVE_MODEL is
// optional and must be one of XAI_DEFAULT_MODELS.

import { describe, expect, test } from "bun:test";
import { createDependencies, runInference } from "@intx/inference";
import type { InferenceEvent, InferenceSource } from "@intx/types/runtime";
import {
  createXaiResponsesAdapter,
  XAI_DEFAULT_MODELS,
  XAI_OAUTH_PROXY_BASE_URL,
  XAI_PROVIDER,
  XAI_USER_ID_OPTION,
  xaiUserIdFromAccessToken,
} from "../src/index";

const accessToken = process.env["XAI_LIVE_ACCESS_TOKEN"] ?? "";
const model = process.env["XAI_LIVE_MODEL"] ?? XAI_DEFAULT_MODELS[0];

const source: InferenceSource = {
  id: `xai:${model}`,
  provider: XAI_PROVIDER,
  baseURL: XAI_OAUTH_PROXY_BASE_URL,
  credentialId: "xai",
  model,
};

const deps = createDependencies({
  has: (provider) => provider === XAI_PROVIDER,
  resolve: createXaiResponsesAdapter,
});

describe.skipIf(accessToken === "")("live xAI CLI chat proxy", () => {
  test("streams a text turn", async () => {
    const userId = xaiUserIdFromAccessToken(accessToken);
    if (userId === undefined)
      throw new Error("XAI_LIVE_ACCESS_TOKEN is not a JWT with a sub claim");
    let seq = 0;
    const events: InferenceEvent[] = [];
    for await (const ev of runInference({
      turns: [
        {
          role: "user",
          timestamp: 0,
          content: [{ type: "text", text: "Reply with the word pong." }],
        },
      ],
      source,
      inferenceOptions: {
        providerOptions: { [XAI_USER_ID_OPTION]: userId },
      },
      nextSeq: () => seq++,
      readMaterial: () => ({ secret: accessToken }),
      deps,
    }))
      events.push(ev);
    const done = events.find((e) => e.type === "inference.done");
    if (done?.type !== "inference.done")
      throw new Error(`expected inference.done, got ${JSON.stringify(events)}`);
    const text = done.data.turn.content.find((b) => b.type === "text");
    expect(text?.type === "text" && text.text.toLowerCase()).toContain("pong");
  }, 60_000);
});
