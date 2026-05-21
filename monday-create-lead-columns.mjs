import { readFile, writeFile } from "node:fs/promises";

const boardId = process.env.MONDAY_BOARD_ID || "18414158813";
let token = process.env.MONDAY_API_TOKEN || "";

const desiredColumns = [
  { key: "lead.email", title: "Lead Email", type: "text" },
  { key: "lead.phone", title: "Lead Phone", type: "text" },
  { key: "intent.loan_goal", title: "Loan Type", type: "text" },
  { key: "qualification.lead_tier", title: "Lead Priority", type: "text" },
  { key: "qualification.lead_score", title: "Lead Score", type: "numbers" },
  { key: "lead.state", title: "State", type: "text" },
  { key: "lead.zip", title: "ZIP", type: "text" },
  { key: "qualification.property_value", title: "Property Value", type: "numbers" },
  { key: "qualification.mortgage_balance", title: "Mortgage Balance", type: "numbers" },
  { key: "consent.captured_at", title: "Consent Date", type: "date" },
];

async function loadDotEnv() {
  try {
    const env = await readFile(new URL(".env", import.meta.url), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.replace(/^\uFEFF/, "").trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (key === "MONDAY_API_TOKEN" && !token) token = valueParts.join("=").trim();
      if (key === "MONDAY_BOARD_ID" && !process.env.MONDAY_BOARD_ID) process.env.MONDAY_BOARD_ID = valueParts.join("=").trim();
    }
  } catch {
    // .env is optional when environment variables are already set.
  }
}

async function mondayRequest(query, variables) {
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (!response.ok || result.errors) {
    const message = result.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new Error(message);
  }
  return result.data;
}

async function getColumns() {
  const query = `
    query LeadBoardColumns($boardId: [ID!]) {
      boards(ids: $boardId) {
        columns {
          id
          title
          type
        }
      }
    }
  `;

  const data = await mondayRequest(query, { boardId: [boardId] });
  return data.boards[0]?.columns || [];
}

async function createColumn(column) {
  const mutation = `
    mutation CreateLeadColumn($boardId: ID!, $title: String!, $columnType: ColumnType!) {
      create_column(board_id: $boardId, title: $title, column_type: $columnType) {
        id
        title
        type
      }
    }
  `;

  const data = await mondayRequest(mutation, {
    boardId,
    title: column.title,
    columnType: column.type,
  });
  return data.create_column;
}

function formatType(type) {
  if (type === "numbers") return "number";
  if (type === "date") return "date";
  return "text";
}

async function updateLocalEnv(columnMap) {
  const envUrl = new URL(".env", import.meta.url);
  const current = await readFile(envUrl, "utf8");
  const next = [
    ...current.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith("MONDAY_COLUMN_MAP=")),
    `MONDAY_COLUMN_MAP=${JSON.stringify(columnMap)}`,
    "",
  ].join("\n");
  await writeFile(envUrl, next, "utf8");
}

await loadDotEnv();

if (!token) {
  console.error("Missing MONDAY_API_TOKEN. Run setup-monday-token.ps1 first.");
  process.exit(1);
}

const existingColumns = await getColumns();
const columnsByTitle = new Map(existingColumns.map((column) => [column.title.toLowerCase(), column]));
const columnMap = {};

for (const desired of desiredColumns) {
  const existing = columnsByTitle.get(desired.title.toLowerCase());
  const column = existing || (await createColumn(desired));
  columnMap[desired.key] = { id: column.id, type: formatType(desired.type) };
  console.log(`${existing ? "Found" : "Created"} ${column.title}: ${column.id} (${column.type})`);
}

await updateLocalEnv(columnMap);

console.log("\nUpdated .env with the new lead column map.");
console.log("Restart the site, then submit another test lead.");
