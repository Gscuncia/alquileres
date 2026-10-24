import { describe, it, expect } from "vitest";

import {
  MAX_RECEIPT_SIZE_BYTES,
  buildReceiptFileName,
  isAllowedReceiptMime,
  receiptViewUrl,
} from "@/lib/drive-receipts";

describe("drive-receipts pure helpers", () => {
  it("MAX_RECEIPT_SIZE_BYTES caps receipts at 4MB (serverless body limit margin)", () => {
    expect(MAX_RECEIPT_SIZE_BYTES).toBe(4 * 1024 * 1024);
  });

  describe("buildReceiptFileName", () => {
    it("maps each allowed mime to its canonical extension", () => {
      expect(buildReceiptFileName("e-1", "application/pdf")).toBe("e-1.pdf");
      expect(buildReceiptFileName("e-1", "image/jpeg")).toBe("e-1.jpg");
      expect(buildReceiptFileName("e-1", "image/png")).toBe("e-1.png");
      expect(buildReceiptFileName("e-1", "image/webp")).toBe("e-1.webp");
      expect(buildReceiptFileName("e-1", "image/heic")).toBe("e-1.heic");
    });

    it("throws for unsupported mime types instead of guessing an extension", () => {
      expect(() => buildReceiptFileName("e-1", "image/gif")).toThrow();
      expect(() => buildReceiptFileName("e-1", "")).toThrow();
    });
  });

  describe("isAllowedReceiptMime", () => {
    it("accepts PDF and the four allowed image types", () => {
      expect(isAllowedReceiptMime("application/pdf")).toBe(true);
      expect(isAllowedReceiptMime("image/jpeg")).toBe(true);
      expect(isAllowedReceiptMime("image/png")).toBe(true);
      expect(isAllowedReceiptMime("image/webp")).toBe(true);
      expect(isAllowedReceiptMime("image/heic")).toBe(true);
    });

    it("rejects everything else, including empty and near-miss types", () => {
      expect(isAllowedReceiptMime("image/gif")).toBe(false);
      expect(isAllowedReceiptMime("video/mp4")).toBe(false);
      expect(isAllowedReceiptMime("image/jpg")).toBe(false);
      expect(isAllowedReceiptMime("application/octet-stream")).toBe(false);
      expect(isAllowedReceiptMime("")).toBe(false);
    });
  });

  it("receiptViewUrl builds the Drive viewer link", () => {
    expect(receiptViewUrl("file-1")).toBe(
      "https://drive.google.com/file/d/file-1/view",
    );
  });
});
