import { expect, test, describe } from "bun:test";
import { db } from "@/db";

describe("migration: requests timestamp index", () => {
  test("idx_requests_timestamp exists on the requests table", () => {
    const row = db
      .query(
        `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_requests_timestamp';`,
      )
      .get() as { name: string } | null;
    expect(row?.name).toBe("idx_requests_timestamp");
  });
});
