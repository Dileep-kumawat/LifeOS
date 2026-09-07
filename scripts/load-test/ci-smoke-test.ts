import { runLoadTest } from "./ws-load-test.js";

async function main() {
  console.log("Starting WebSocket CI Smoke Test (100 clients, 5s hold)...");
  const result = await runLoadTest({
    clients: 100,
    rampRate: 50,
    durationSec: 5,
    workers: 1,
    targets: ["http://localhost:4000"]
  });

  if (!result.success) {
    console.error("CI Smoke Test FAILED!");
    process.exit(1);
  }

  console.log("CI Smoke Test PASSED cleanly!");
  process.exit(0);
}

main().catch((err) => {
  console.error("CI Smoke Test error:", err);
  process.exit(1);
});
