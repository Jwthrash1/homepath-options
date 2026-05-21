import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const qaPort = "8027";
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL(".", import.meta.url),
  env: { ...process.env, PORT: qaPort, MONDAY_API_TOKEN: "", SKIP_DOTENV: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});

let startedServer = false;

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Preview server did not start.")), 4000);
  server.stdout.on("data", (data) => {
    if (data.toString().includes("HomePath Options preview")) {
      clearTimeout(timer);
      startedServer = true;
      resolve();
    }
  });
  server.stderr.on("data", (data) => {
    if (data.toString().includes("EADDRINUSE")) {
      clearTimeout(timer);
      resolve();
      return;
    }
    reject(new Error(data.toString()));
  });
});

try {
  const [htmlResponse, cssResponse, jsResponse] = await Promise.all([
    fetch(`http://127.0.0.1:${qaPort}/index.html`),
    fetch(`http://127.0.0.1:${qaPort}/styles.css`),
    fetch(`http://127.0.0.1:${qaPort}/app.js`),
  ]);

  if (!htmlResponse.ok || !cssResponse.ok || !jsResponse.ok) {
    throw new Error("One or more app assets failed to load.");
  }

  const [html, css, js] = await Promise.all([
    htmlResponse.text(),
    cssResponse.text(),
    jsResponse.text(),
  ]);

  const checks = [
    ["hero headline", html.includes("Find the right home financing path")],
    ["quiz form", html.includes('id="leadForm"')],
    ["consent language", html.includes("Consent is not required")],
    ["result panel", html.includes('id="payloadPreview"')],
    ["responsive styles", css.includes("@media (max-width: 880px)")],
    ["lead scoring", js.includes("function calculateScore")],
    ["CRM payload", js.includes("function buildPayload")],
  ];

  const failed = checks.filter(([, passed]) => !passed);
  if (failed.length) {
    throw new Error(`Failed checks: ${failed.map(([name]) => name).join(", ")}`);
  }

  const appSource = await readFile(new URL("app.js", import.meta.url), "utf8");
  if (!appSource.includes("reverse_mortgage") || !appSource.includes("lead_tier")) {
    throw new Error("Lead routing signals are missing.");
  }

  const leadResponse = await fetch(`http://127.0.0.1:${qaPort}/api/leads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      lead: {
        first_name: "Test",
        last_name: "Lead",
        email: "test@example.com",
        phone: "555-555-1212",
        state: "FL",
        zip: "33101",
      },
      intent: {
        loan_goal: "heloc",
        primary_goal: "cash_out",
        timeline: "0_30",
        selected_partner_type: "Home equity partner",
      },
      qualification: {
        property_value: 450000,
        mortgage_balance: 200000,
        estimated_equity_ratio: 0.56,
        credit_range: "700_739",
        homeowner_age: 45,
        lead_score: 88,
        lead_tier: "Hot",
      },
      consent: {
        granted: true,
        language: "Test consent language",
        captured_at: new Date().toISOString(),
        page_url: "http://127.0.0.1:8027/",
      },
      metadata: {
        source: "qa",
        campaign: "qa",
        version: "qa",
      },
    }),
  });

  const leadResult = await leadResponse.json();
  if (!leadResponse.ok || !leadResult.ok || leadResult.destination !== "monday.com") {
    throw new Error("Lead API endpoint did not return a valid Monday response.");
  }

  console.log("QA passed: app assets load and core funnel hooks are present.");
} finally {
  if (startedServer) server.kill();
}
