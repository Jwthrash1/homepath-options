import { readFile, writeFile } from "node:fs/promises";

let token = process.env.MONDAY_API_TOKEN || "";
let boardId = process.env.MONDAY_BOARD_ID || "";
let columnMap = {};

async function loadDotEnv() {
  const env = await readFile(new URL(".env", import.meta.url), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.replace(/^\uFEFF/, "").trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim();
    if (key === "MONDAY_API_TOKEN" && !token) token = value;
    if (key === "MONDAY_BOARD_ID" && !boardId) boardId = value;
    if (key === "MONDAY_COLUMN_MAP") {
      try {
        columnMap = JSON.parse(value);
      } catch {
        columnMap = {};
      }
    }
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

async function createColumn() {
  const mutation = `
    mutation CreateFollowUpColumn($boardId: ID!) {
      create_column(board_id: $boardId, title: "Follow Up Status", column_type: text) {
        id
        title
        type
      }
    }
  `;
  const data = await mondayRequest(mutation, { boardId });
  return data.create_column;
}

async function updateLocalEnv(nextMap) {
  const envUrl = new URL(".env", import.meta.url);
  const current = await readFile(envUrl, "utf8");
  const lines = current
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .filter((line) => !line.replace(/^\uFEFF/, "").startsWith("MONDAY_COLUMN_MAP="));
  lines.push(`MONDAY_COLUMN_MAP=${JSON.stringify(nextMap)}`);
  lines.push("");
  await writeFile(envUrl, lines.join("\n"), "utf8");
}

await loadDotEnv();

if (!token || !boardId) {
  console.error("Missing MONDAY_API_TOKEN or MONDAY_BOARD_ID. Check your local .env file.");
  process.exit(1);
}

const columns = await getColumns();
let followUpColumn = columns.find((column) => column.title.toLowerCase() === "follow up status");

if (!followUpColumn) {
  followUpColumn = await createColumn();
  console.log(`Created Follow Up Status: ${followUpColumn.id} (${followUpColumn.type})`);
} else {
  console.log(`Found Follow Up Status: ${followUpColumn.id} (${followUpColumn.type})`);
}

columnMap["workflow.follow_up_status"] = { id: followUpColumn.id, type: "text" };
await updateLocalEnv(columnMap);

console.log("Updated .env so new leads start with Follow Up Status = New.");
