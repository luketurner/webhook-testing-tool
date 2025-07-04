import { describe, expect, test, beforeEach } from "bun:test";
import { getSharedState, updateSharedState } from "./model";
import { db } from "@/db";

describe("shared state model", () => {
  beforeEach(() => {
    // Reset shared state to empty object before each test
    updateSharedState({});
  });

  test("should initialize with empty object", () => {
    const state = getSharedState();
    expect(state.data).toEqual({});
    expect(state.id).toBe("singleton");
    expect(typeof state.updated_at).toBe("number");
  });

  test("should update and retrieve simple data", () => {
    const testData = { message: "hello", count: 42 };
    updateSharedState(testData);

    const state = getSharedState();
    expect(state.data).toEqual(testData);
  });

  test("should handle complex nested data structures", () => {
    const complexData = {
      users: [
        { id: 1, name: "Alice", roles: ["admin", "user"] },
        { id: 2, name: "Bob", roles: ["user"] },
      ],
      config: {
        version: "2.0",
        features: {
          auth: true,
          logging: { level: "debug", file: "/tmp/app.log" },
        },
      },
      stats: {
        requests: 1000,
        errors: 5,
        uptime: 86400,
      },
    };

    updateSharedState(complexData);
    const state = getSharedState();
    expect(state.data).toEqual(complexData);
    expect(state.data.users).toHaveLength(2);
    expect(state.data.config.features.logging.level).toBe("debug");
  });

  test("should handle arrays and primitive values", () => {
    const testData = {
      numbers: [1, 2, 3, 4, 5],
      strings: ["hello", "world"],
      booleans: [true, false, true],
      nullValue: null,
      undefinedValue: undefined,
      mixedArray: [1, "string", true, null, { nested: "object" }],
    };

    updateSharedState(testData);
    const state = getSharedState();

    expect(state.data.numbers).toEqual([1, 2, 3, 4, 5]);
    expect(state.data.strings).toEqual(["hello", "world"]);
    expect(state.data.booleans).toEqual([true, false, true]);
    expect(state.data.nullValue).toBeNull();
    expect(state.data.undefinedValue).toBeUndefined();
    expect(state.data.mixedArray).toEqual([
      1,
      "string",
      true,
      null,
      { nested: "object" },
    ]);
  });

  test("should update timestamp on each update", () => {
    const firstUpdate = Date.now();
    updateSharedState({ test: "first" });
    const state1 = getSharedState();

    // Wait a bit to ensure timestamp difference
    setTimeout(() => {
      const secondUpdate = Date.now();
      updateSharedState({ test: "second" });
      const state2 = getSharedState();

      expect(state2.updated_at).toBeGreaterThan(state1.updated_at);
      expect(state2.updated_at).toBeGreaterThanOrEqual(secondUpdate);
    }, 10);
  });

  test("should handle empty updates", () => {
    updateSharedState({ initial: "data" });
    updateSharedState({});

    const state = getSharedState();
    expect(state.data).toEqual({});
  });

  test("should handle multiple sequential updates", () => {
    updateSharedState({ step: 1 });
    updateSharedState({ step: 2, additional: "data" });
    updateSharedState({ step: 3, additional: "updated", final: true });

    const state = getSharedState();
    expect(state.data).toEqual({
      step: 3,
      additional: "updated",
      final: true,
    });
  });

  test("should persist data through direct database queries", () => {
    const testData = { persistent: "data", value: 999 };
    updateSharedState(testData);

    // Query database directly
    const row = db
      .query("SELECT * FROM shared_state WHERE id = 'singleton'")
      .get() as { id: string; data: string; updated_at: number };
    expect(row).toBeDefined();
    expect(row.id).toBe("singleton");
    expect(JSON.parse(row.data)).toEqual(testData);
  });

  test("should handle malformed JSON gracefully", () => {
    // Manually insert malformed JSON
    db.run("UPDATE shared_state SET data = ? WHERE id = 'singleton'", [
      "{invalid json}",
    ]);

    const state = getSharedState();
    expect(state.data).toEqual({});
  });
});
