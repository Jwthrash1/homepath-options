# HomePath Options Lead Funnel MVP

This is a static mortgage lead-generation intake for purchase, refinance, HELOC, and reverse mortgage interest.

## Files

- `index.html` contains the landing page, intake form, and compliance copy.
- `styles.css` contains the responsive visual system.
- `app.js` handles step navigation, validation, lead scoring, routing labels, consent metadata, and CRM payload generation.
- `server.mjs` serves the site and posts leads to monday.com.
- `monday-inspect.mjs` lists your monday.com board groups and column IDs for mapping.

## Launch Notes

- Run `node server.mjs` and open `http://127.0.0.1:8017/` for a local preview. If `node` is not on PATH, use `C:\Users\jwthr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe server.mjs`.
- Run `node qa.mjs` for a quick asset and funnel-hook check.
- Before paid traffic, replace `HomePath Options` with the actual business name and licensed partner names.
- Have counsel review the consent language, privacy policy, TCPA process, state coverage, and RESPA/payment model.
- Do not advertise rates, payments, savings claims, approval likelihood, government affiliation, or reverse mortgage benefits without substantiation and required disclosures.

## CRM Payload

The form generates a JSON payload with:

- Lead contact data
- Loan intent
- Property and qualification signals
- Lead score and tier
- Consent language, timestamp, and page URL
- Source and campaign metadata

## monday.com Setup

The default board ID is `18414158813`.

1. Copy `.env.example` into your production host environment.
2. Set `MONDAY_API_TOKEN` to a monday.com API token with access to the board.
3. Keep `MONDAY_BOARD_ID=18414158813`, unless you move the funnel to another board.
4. Optionally set `MONDAY_GROUP_ID` if leads should go into a specific board group.
5. Create board columns, then map their column IDs with `MONDAY_COLUMN_MAP`.

The integration always creates a monday.com item and adds a full lead update. If `MONDAY_COLUMN_MAP` is configured, it also fills matching board columns.

Use `monday-column-map.example.json` as the starting point for column mapping. The keys on the left are payload paths; the `id` values must match your actual monday.com column IDs.

Current board mapping:

- Full lead details are also added to the Monday item update.

If adding columns manually is awkward, run:

```powershell
C:\Users\jwthr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe monday-create-lead-columns.mjs
```

This creates simple lead-specific columns and updates `.env` with the new map.

To create a separate board for incoming leads, run:

```powershell
C:\Users\jwthr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe monday-create-leads-board.mjs
```

This creates a new `Mortgage Leads` board, adds the lead columns, and updates `.env` so new submissions go there instead of the original contacts board.

To add the follow-up workflow column to an existing Mortgage Leads board, run:

```powershell
C:\Users\jwthr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe monday-add-follow-up-status.mjs
```

### Local Token Setup

Do not paste your monday.com token into chat.

For local testing only, run this PowerShell command from the project folder:

```powershell
.\setup-monday-token.ps1
```

It will ask for your token and create a local `.env` file for you.

The `.env` file will look like this:

```text
MONDAY_API_TOKEN=your_new_token_here
MONDAY_BOARD_ID=18414158813
```

The `.env` file is ignored by git.

Then run:

```powershell
C:\Users\jwthr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe monday-inspect.mjs
```

This prints your board groups and column IDs.

After confirming the column IDs, run:

```powershell
.\apply-monday-map.ps1
```

This writes the current board mapping into your local `.env` file.
