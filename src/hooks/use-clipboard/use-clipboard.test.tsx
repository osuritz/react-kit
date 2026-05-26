import { describe, expect, test } from "vitest";
import { ClipboardError } from "./use-clipboard";

describe("ClipboardError", () => {
  test("carries a reason, message, name, and native cause", () => {
    const cause = new DOMException("denied", "NotAllowedError");
    const err = new ClipboardError("write-failed", "Failed to copy.", { cause });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ClipboardError");
    expect(err.reason).toBe("write-failed");
    expect(err.message).toBe("Failed to copy.");
    expect(err.cause).toBe(cause);
  });
});
