import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerAttachmentTools } from "../../tools/attachments.js";
import type { YonoteClient } from "../../api-client.js";

describe("attachment tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerAttachmentTools, client);
  });

  it("registers 6 tools", () => {
    expect(tools).toHaveLength(6);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "attachments_list",
      "attachments_size",
      "attachments_create",
      "attachments_redirect",
      "attachments_download",
      "attachments_delete",
    ]);
  });

  const endpointMap: Record<string, string> = {
    attachments_list: "attachments.list",
    attachments_size: "attachments.size",
    attachments_create: "attachments.create",
    attachments_delete: "attachments.delete",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("attachments_redirect requests a signed URL", async () => {
    const handler = getToolHandler(tools, "attachments_redirect");
    await handler({ id: "attachment-1" });
    expect(client.getRedirect).toHaveBeenCalledWith("attachments.redirect", {
      id: "attachment-1",
    });
  });

  it("attachments_download saves into the configured export directory", async () => {
    const handler = getToolHandler(tools, "attachments_download");
    await handler({ id: "attachment-1", filename: "guide.pdf" });
    expect(client.download).toHaveBeenCalledWith(
      "attachments.redirect",
      { id: "attachment-1" },
      "guide.pdf",
    );
  });

  it("attachments_create passes name, contentType, size", async () => {
    const handler = getToolHandler(tools, "attachments_create");
    await handler({
      name: "file.pdf",
      contentType: "application/pdf",
      size: 1024,
    });
    expect(client.request).toHaveBeenCalledWith("attachments.create", {
      name: "file.pdf",
      contentType: "application/pdf",
      size: 1024,
    });
  });
});
