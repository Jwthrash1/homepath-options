# HomePath Options Operations

## Daily Lead Check

1. Open the Monday `Mortgage Leads` board.
2. Review new items created today.
3. Confirm each lead has:
   - Name
   - Follow Up Status
   - Lead Email
   - Lead Phone
   - Loan Type
   - Lead Priority
   - Lead Score
   - State and ZIP
4. Mark test leads clearly or archive them.
5. Follow up with licensed partners according to your partner process.

## Live Test

Use the live domain:

```text
https://homepathoptions.com
```

Submit a test lead with:

```text
First name: Test
Last name: Lead
Email: test@example.com
Phone: 555-555-1212
Loan goal: HELOC
State: FL
ZIP: 33101
```

Then confirm the item appears in Monday.

## Analytics Setup

1. Create a Google Analytics 4 property.
2. Create a Web data stream for `https://homepathoptions.com`.
3. Copy the Measurement ID, which starts with `G-`.
4. Add it in Render as:

```text
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

5. Redeploy the site.
6. Submit a test lead.
7. In GA4, watch for the `lead_submit` event and mark it as a key event/conversion.

## Production Notes

- Do not paste API tokens into chat, email, docs, GitHub, or Monday updates.
- Keep `MONDAY_API_TOKEN` only in Render environment variables and the local `.env` file.
- Have mortgage compliance counsel review all public legal pages before paid advertising.
- Avoid rate, approval, savings, or payment claims unless counsel has reviewed the exact advertising language and disclosures.

## Follow-Up Process

Recommended `Follow Up Status` values:

```text
New
Contacted
Appointment Set
Sent to Partner
Not Qualified
Closed
```

Simple workflow:

1. Every new website lead starts as `New`.
2. Call or text as soon as possible.
3. Change to `Contacted` after the first real contact attempt.
4. Change to `Appointment Set` when a licensed partner call is scheduled.
5. Change to `Sent to Partner` when the lead has been routed.
6. Change to `Not Qualified` if the lead is outside partner criteria.
7. Change to `Closed` after the opportunity is resolved.

## Monday Notification Automation

Inside monday.com, open the `Mortgage Leads` board and create an automation:

```text
When an item is created, notify someone.
```

Notify yourself with a message like:

```text
New HomePath Options lead received. Review the Mortgage Leads board for contact details and follow-up status.
```
