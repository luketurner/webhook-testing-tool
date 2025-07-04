import "@/server-only";

import { db } from "@/db";
import {
  sharedStateSchema,
  type SharedState,
  type SharedStateData,
} from "./schema";

export function getSharedState(): SharedState {
  const row = db
    .query("SELECT * FROM shared_state WHERE id = 'singleton'")
    .get();

  try {
    return sharedStateSchema.parse(row);
  } catch (error) {
    // If parsing fails (e.g., malformed JSON), return default state
    return {
      id: "singleton",
      data: {},
      updated_at: Date.now(),
    };
  }
}

export function updateSharedState(data: SharedStateData): void {
  const jsonData = JSON.stringify(data);
  const updatedAt = Date.now();

  db.run(
    "UPDATE shared_state SET data = ?, updated_at = ? WHERE id = 'singleton'",
    [jsonData, updatedAt],
  );
}
