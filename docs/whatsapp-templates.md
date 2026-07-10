# WhatsApp Templates (LA-341 / LA-342)

Submit these in **Meta Business → WhatsApp Manager → Message Templates**.
Approval takes 24–48 h. Until `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`
are set in env, all senders in code are logged no-ops (`packages/trpc/src/whatsapp.ts`).

Copy below is adjusted from the marketing brief to stay factually defensible —
no "zero fraud guarantee", invented user counts, or "guaranteed transactions"
(the platform does not hold funds; see the LA-337 note in `TrustBadges.tsx`).

## Marketing (signup nudges — sent by `api/cron/wa-followups`)

### 1. `nxtsft_owner_welcome` — MARKETING, en
Header: image ({{2}} badge preview JPG)

```
Hi {{1}},

List your property on Nxtsft with the *Verified Owner + NRI Trusted* badges.

You get:
✓ More genuine buyer calls
✓ Visibility to NRI + HNI buyers
✓ Zero brokerage — buyers contact you directly

₹4,999 / 90 days — 5 listings with verified badges.

This is how your listing will appear:
{{2}}

List now: {{3}}
Team Nxtsft
```

Variables: 1 = first name, 2 = badge preview image URL
(`https://www.nxtsft.com/images/listing-preview-badge.jpg` — **still needs to
be uploaded**), 3 = `https://www.nxtsft.com/list-property`

### 2. `nxtsft_broker_offer` — MARKETING, en

```
Hello {{1}},

Get the *Certified Agent + Verified* badge set on Nxtsft.

Broker benefits:
✓ RERA-verified profile
✓ Buyer leads from NRI + HNI audience
✓ Featured placement
✓ Multi-listing plans

List now: {{2}}
Call: {{3}}
Team Nxtsft
```

Variables: 1 = name, 2 = link, 3 = sales phone number.

### 3. `nxtsft_followup_48hr` — MARKETING, en

```
Hi {{1}},

Quick reminder — your Nxtsft listing is still *non-verified*.
Verified listings are contacted first by NRI buyers.

Get the Verified Owner badge + NRI reach for ₹4,999.
Link: {{2}}

Team Nxtsft
```

Variables: 1 = first name, 2 = link.

## CRM internal (LA-342 — UTILITY category)

| Template | Trigger | Body sketch |
|---|---|---|
| `lead_assigned_to_supervisor` | Admin routes leads | "{{1}} lead(s) routed to your team. Open the supervisor portal: {{2}}" |
| `lead_assigned_to_salesrep` | Supervisor reassigns | "New lead: {{1}} ({{2}}). Call and send the payment link: {{3}}" |
| `payment_link_from_salesrep` | Rep creates link | Razorpay already SMSes the link (`notify.sms: true`); template optional |
| `payment_success_internal` | Webhook `payment_link.paid` | "{{1}} paid ₹{{2}} for {{3}}. Lead auto-listed." |
| `daily_lead_report` | 9AM cron | "{{1}} new leads, {{2}} paid, ₹{{3}} collected. CSV: {{4}}" |

In-app notifications for all five triggers are already live; the WA copies
send automatically once templates are approved and the sender is wired to
those call sites.

## Ops checklist

1. Create Meta Business + WhatsApp Business API number (or use Wati/AiSensy/Interakt on top).
2. Submit the 3 marketing templates + 5 utility templates above.
3. Upload badge preview JPG to `apps/web/public/images/listing-preview-badge.jpg`.
4. Set env: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
5. Schedule `GET /api/cron/wa-followups` (Bearer `CRON_SECRET`) every 15–30 min
   **inside** 6–10 AM / 7–9 PM IST windows (brief's read-rate guidance).
6. Schedule `GET /api/cron/daily-report` at 09:00 IST daily.
7. Bulk campaigns (area-personalised blasts from the brief) run from the
   vendor's broadcast tool, not from this codebase — use the marketing
   templates above with a 7s+ inter-message delay.
