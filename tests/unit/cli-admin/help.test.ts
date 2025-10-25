import "@/server-only";
import { describe, test, expect } from "bun:test";
import { showHelp } from "@/cli-admin/help";

describe("Help Text Generation", () => {
  test("T015: showHelp outputs help text to console", () => {
    // Capture console.log output
    const originalLog = console.log;
    let output = "";
    console.log = (message: string) => {
      output += message + "\n";
    };

    showHelp();

    // Restore original console.log
    console.log = originalLog;

    // Verify help text contains expected sections
    expect(output).toContain("WTT Database Admin CLI");
    expect(output).toContain("Usage:");
    expect(output).toContain("Commands:");
    expect(output).toContain("Examples:");
  });

  test("T015: showHelp includes all commands", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (message: string) => {
      output += message + "\n";
    };

    showHelp();
    console.log = originalLog;

    // Verify all commands are documented
    expect(output).toContain("change-email");
    expect(output).toContain("change-password");
    expect(output).toContain("export-db");
    expect(output).toContain("--help");
  });

  test("T015: showHelp includes usage examples", () => {
    const originalLog = console.log;
    let output = "";
    console.log = (message: string) => {
      output += message + "\n";
    };

    showHelp();
    console.log = originalLog;

    // Verify examples are present
    expect(output).toContain("wtt change-email");
    expect(output).toContain("wtt change-password");
    expect(output).toContain("wtt export-db");
  });
});
