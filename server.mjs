import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
if (process.env.SKIP_DOTENV !== "1") await loadDotEnv();

const port = Number(process.env.PORT || 8017);
const host = process.env.RENDER ? "0.0.0.0" : "127.0.0.1";
const mondayApiUrl = "https://api.monday.com/v2";
const mondayBoardId = process.env.MONDAY_BOARD_ID || "18414158813";
const mondayGroupId = process.env.MONDAY_GROUP_ID || "";
const mondayToken = process.env.MONDAY_API_TOKEN || "";
const mondayColumnMap = parseColumnMap(process.env.MONDAY_COLUMN_MAP || "");
const gaMeasurementId = process.env.GA_MEASUREMENT_ID || "";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

async function loadDotEnv() {
  try {
    const env = await readFile(path.join(root, ".env"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.replace(/^\uFEFF/, "").trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = valueParts.join("=").trim();
    }
  } catch {
    // Production hosts should use real environment variables. Local .env is optional.
  }
}

function parseColumnMap(rawMap) {
  if (!rawMap) return {};
  try {
    return JSON.parse(rawMap);
  } catch {
    console.warn("MONDAY_COLUMN_MAP is not valid JSON. Leads will still create items with updates.");
    return {};
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function getPathValue(source, dotPath) {
  return dotPath.split(".").reduce((value, key) => (value == null ? undefined : value[key]), source);
}

function formatColumnValue(value, type) {
  if (value == null || value === "") return undefined;
  if (type === "email") return { email: String(value), text: String(value) };
  if (type === "phone") return { phone: String(value), countryShortName: "US" };
  if (type === "status") return { label: String(value) };
  if (type === "date") return { date: String(value).slice(0, 10) };
  if (type === "long_text") return { text: typeof value === "string" ? value : JSON.stringify(value, null, 2) };
  if (type === "number") return String(value);
  return String(value);
}

function buildColumnValues(payload) {
  return Object.entries(mondayColumnMap).reduce((values, [dotPath, config]) => {
    const columnConfig = typeof config === "string" ? { id: config, type: "text" } : config;
    const value = dotPath === "full_payload" ? payload : getPathValue(payload, dotPath);
    const formatted = formatColumnValue(value, columnConfig.type || "text");
    if (formatted !== undefined) values[columnConfig.id] = formatted;
    return values;
  }, {});
}

function buildUpdateBody(payload) {
  return [
    `Lead tier: ${payload.qualification.lead_tier}`,
    `Lead score: ${payload.qualification.lead_score}/100`,
    `Loan goal: ${payload.intent.loan_goal}`,
    `Primary goal: ${payload.intent.primary_goal}`,
    `Timeline: ${payload.intent.timeline}`,
    `Name: ${payload.lead.first_name} ${payload.lead.last_name}`,
    `Email: ${payload.lead.email}`,
    `Phone: ${payload.lead.phone}`,
    `State/ZIP: ${payload.lead.state} ${payload.lead.zip}`,
    `Property value: ${payload.qualification.property_value}`,
    `Mortgage balance: ${payload.qualification.mortgage_balance}`,
    `Estimated equity ratio: ${payload.qualification.estimated_equity_ratio}`,
    `Credit range: ${payload.qualification.credit_range}`,
    `Homeowner age: ${payload.qualification.homeowner_age}`,
    `Consent captured: ${payload.consent.captured_at}`,
    `Consent language: ${payload.consent.language}`,
    `Source URL: ${payload.consent.page_url}`,
    "",
    "Full payload:",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

async function mondayRequest(query, variables) {
  const response = await fetch(mondayApiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: mondayToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();
  if (!response.ok || data.errors) {
    const message = data.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new Error(message);
  }
  return data.data;
}

async function createMondayLead(payload) {
  if (!mondayToken) {
    return {
      configured: false,
      message: "Monday is not configured yet. Set MONDAY_API_TOKEN before launch.",
    };
  }

  const itemName = `${payload.lead.first_name} ${payload.lead.last_name} - ${payload.intent.loan_goal}`;
  const columnValues = buildColumnValues(payload);
  const createVariables = {
    boardId: mondayBoardId,
    itemName,
  };
  if (mondayGroupId) createVariables.groupId = mondayGroupId;

  const createItemMutation = `
    mutation CreateMortgageLead($boardId: ID!, $groupId: String, $itemName: String!) {
      create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName) {
        id
        url
      }
    }
  `;

  const createResult = await mondayRequest(createItemMutation, createVariables);
  const item = createResult.create_item;

  const updateMutation = `
    mutation AddMortgageLeadUpdate($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) {
        id
      }
    }
  `;

  await mondayRequest(updateMutation, {
    itemId: item.id,
    body: buildUpdateBody(payload),
  });

  let columnUpdate = {
    attempted: false,
    ok: true,
    warning: "",
  };

  if (Object.keys(columnValues).length) {
    columnUpdate.attempted = true;
    try {
      const changeColumnsMutation = `
        mutation FillMortgageLeadColumns($boardId: ID!, $itemId: ID!, $columnValues: JSON!, $createLabelsIfMissing: Boolean) {
          change_multiple_column_values(
            board_id: $boardId,
            item_id: $itemId,
            column_values: $columnValues,
            create_labels_if_missing: $createLabelsIfMissing
          ) {
            id
          }
        }
      `;

      await mondayRequest(changeColumnsMutation, {
        boardId: mondayBoardId,
        itemId: item.id,
        columnValues: JSON.stringify(columnValues),
        createLabelsIfMissing: true,
      });
    } catch (error) {
      columnUpdate = {
        attempted: true,
        ok: false,
        warning: `Lead item was created, but one or more mapped columns were not filled: ${error.message}`,
      };
    }
  }

  return {
    configured: true,
    item_id: item.id,
    item_url: item.url,
    column_update: columnUpdate,
  };
}

async function handleLeadRequest(request, response) {
  try {
    const payload = await readJson(request);
    payload.metadata = {
      ...payload.metadata,
      server_received_at: new Date().toISOString(),
      ip_address: request.headers["x-forwarded-for"] || request.socket.remoteAddress,
      user_agent: request.headers["user-agent"] || "",
    };

    const monday = await createMondayLead(payload);
    sendJson(response, monday.configured ? 201 : 202, {
      ok: true,
      destination: "monday.com",
      monday,
      payload,
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error.message || "Lead submission failed.",
    });
  }
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/leads") {
      await handleLeadRequest(request, response);
      return;
    }

    if (request.method === "GET" && request.url === "/config.js") {
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      response.end(`window.HOMEPATH_CONFIG = ${JSON.stringify({ gaMeasurementId })};`);
      return;
    }

    const url = new URL(request.url, `http://${host}:${port}`);
    const requested = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const filePath = path.resolve(root, requested);

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": mime[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`HomePath Options preview: http://${displayHost}:${port}/`);
});
