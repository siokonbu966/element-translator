import { afterEach, describe, expect, it, vi } from "vitest";
import { listModels } from "../modules/listModels";

// ?
afterEach(() => vi.unstubAllGlobals());

describe("listModels", () => {
  it("Remove Model-ID from response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          data: [{ id: "model-a"}, { id: "model-b" }],
        })),
      ),
    );

    await expect(listModels("http://127.0.0.1:1234/v1"))
      .resolves.toEqual(["model-a", "model-b"]);
  });

  it("Return Exception when HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("", { status: 500 }),
    ));

    await expect(listModels("http://127.0.0.1:1234"))
      .rejects.toThrow("Failed to retrieve models from provider (/v1/models): HTTP");
  });
});
