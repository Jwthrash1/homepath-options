# HomePath Options Operations

## Daily Lead Check

1. Open the Monday `Mortgage Leads` board.
2. Review new items created today.
3. Confirm each lead has:
   - Name
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
