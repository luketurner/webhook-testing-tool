import "@/server-only";
import { describe, test, expect } from "bun:test";
import { formatFileSize } from "@/cli-admin/io";

describe("I/O Utilities", () => {
  test("T012: formatFileSize formats bytes correctly", () => {
    expect(formatFileSize(123)).toBe("123 B");
    expect(formatFileSize(0)).toBe("0 B");
  });

  test("T012: formatFileSize formats kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(10240)).toBe("10.0 KB");
  });

  test("T012: formatFileSize formats megabytes correctly", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
    expect(formatFileSize(100 * 1024 * 1024)).toBe("100.0 MB");
  });

  test("T012: formatFileSize formats gigabytes correctly", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
    expect(formatFileSize(2.3 * 1024 * 1024 * 1024)).toBe("2.3 GB");
  });

  // Note: promptPassword and promptConfirm are difficult to unit test
  // as they require actual terminal input. These will be tested via
  // integration tests and manual testing.
  test.todo("T012: promptPassword masks password input");
  test.todo("T012: promptConfirm returns true for 'y' or 'yes'");
  test.todo("T012: promptConfirm returns false for other inputs");
});
