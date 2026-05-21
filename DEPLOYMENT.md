# Deployment Checklist

Deploy this as a small Node app, not as static-only hosting, because the Monday API token must stay server-side.

## Required Environment Variables

```text
MONDAY_API_TOKEN=your_monday_token
MONDAY_BOARD_ID=18414192074
MONDAY_COLUMN_MAP={"lead.email":{"id":"text_mm3h4t6b","type":"text"},"lead.phone":{"id":"text_mm3h5tb2","type":"text"},"intent.loan_goal":{"id":"text_mm3hmw91","type":"text"},"qualification.lead_tier":{"id":"text_mm3hxkbm","type":"text"},"qualification.lead_score":{"id":"numeric_mm3h9dak","type":"number"},"lead.state":{"id":"text_mm3hsqmt","type":"text"},"lead.zip":{"id":"text_mm3h1n9w","type":"text"},"qualification.property_value":{"id":"numeric_mm3hyz7p","type":"number"},"qualification.mortgage_balance":{"id":"numeric_mm3hbt8x","type":"number"},"consent.captured_at":{"id":"date_mm3h5pxr","type":"date"}}
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

`GA_MEASUREMENT_ID` is optional until Google Analytics is ready. When set, the site loads the Google tag and sends a `lead_submit` event after a successful Monday submission.

## Before Public Traffic

- Confirm the final business entity name and any mailing address.
- Have mortgage compliance counsel review consent, privacy, terms, disclosures, lead-sale model, reverse mortgage copy, and state coverage.
- Add analytics and ad conversion tracking only after privacy disclosures are updated.
- Submit one production test lead and verify the Monday item and columns.

## Google Analytics

Create a GA4 web data stream for `homepathoptions.com`, then copy the Measurement ID that starts with `G-`. Add it to Render as `GA_MEASUREMENT_ID`.

After the first successful form submission, GA4 should receive an event named `lead_submit`. Mark that event as a key event/conversion inside Google Analytics once it appears.
