import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "app", "components", "lib"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);
const forbidden = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "INTERNAL_SCHEDULER_SECRET",
  "SUBSCRIPTION_WEBHOOK_SECRET",
];
const violations = files
  .filter((file) => /^\s*["']use client["']/.test(readFileSync(file, "utf8")))
  .flatMap((file) =>
    forbidden
      .filter((name) => readFileSync(file, "utf8").includes(name))
      .map((name) => `${file}: ${name}`),
  );
if (violations.length)
  throw new Error(
    `Server secrets referenced by client modules:\n${violations.join("\n")}`,
  );
console.log("Client bundle secret guard passed.");
