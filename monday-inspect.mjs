import { readFile } from "node:fs/promises";

const boardId = process.env.MONDAY_BOARD_ID || "18414158813";
let token = process.env.MONDAY_API_TOKEN || "";

async function loadDotEnv() {
  try {
    const env = await readFile(new URL(".env", import.meta.url), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.replace(/^\uFEFF/, "").trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (key === "MONDAY_API_TOKEN" && !token) token = valueParts.join("=").trim();
    }
  } catch {
    // A .env file is optional; environment variables work too.
  }
}

await loadDotEnv();

if (!token) {
  console.error("Missing MONDAY_API_TOKEN. Set it as an environment variable or in a local .env file.");
  process.exit(1);
}

const query = `
  query InspectMortgageLeadBoard($boardId: [ID!]) {
    boards(ids: $boardId) {
      id
      name
      groups {
        id
        title
      }
      columns {
        id
        title
        type
      }
    }
  }
`;

const response = await fetch("https://api.monday.com/v2", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: token,
  },
  body: JSON.stringify({ query, variables: { boardId: [boardId] } }),
});

const result = await response.json();

if (!response.ok || result.errors) {
  console.error(JSON.stringify(result.errors || result, null, 2));
  process.exit(1);
}

const board = result.data.boards[0];

if (!board) {
  console.error(`No board found for ID ${boardId}.`);
  process.exit(1);
}

console.log(`Board: ${board.name} (${board.id})`);
console.log("\nGroups:");
for (const group of board.groups) {
  console.log(`- ${group.title}: ${group.id}`);
}

console.log("\nColumns:");
for (const column of board.columns) {
  console.log(`- ${column.title}: ${column.id} (${column.type})`);
}

console.log("\nNext: copy the relevant column IDs into MONDAY_COLUMN_MAP.");
