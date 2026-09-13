# ARIA HUB — The Money Printer Plan
## "If this were my platform, here is exactly when the money arrives"

**Companion to:** `docs/GROWTH-MONETIZATION-PLAN.md` (the research). This file is the execution clock.
**Owner:** Jamshid Nabizada · myariahub.com · Updated: this round (R16).

---

## 0. The honest answer to "how many days?"

| Milestone | Days from today | Money |
|---|---|---|
| First reply from an employer | **Day 2–4** | $0 (conversation) |
| **First paid order (cash/hawala)** | **Day 5–10** | **$25–50** |
| 2–4 orders/mo running | Day 30 | $100–250/mo |
| Featured add-ons + 1 sponsored slot | Day 45–60 | $250–450/mo |
| Scholarship promo (1 university/IELTS center) | Day 60–90 | +$100–300/mo recurring |
| Steady Phase-2 state | Month 4–6 | **$400–900/mo** |

**Why this works in Afghanistan specifically:**
- Your competitors (ACBAR, Wazifaha) have **no public rate card and no self-serve order page**. You now have `/advertise` — a page an employer can open, see the price, and request an order in 60 seconds, in Dari, Pashto, or English.
- Employers here **do not pay online** — they pay **hawala, cash in the bazar, AfPay/hesabPay, or bank transfer**. The order flow is built around exactly that: request → pay your way → send the hawala code → listing live. No gateway needed, no PayPal problem.
- Your cost is ~$0 (Vercel free tier + Neon + your time). **Every dollar collected is profit.**

**The one rule:** the money printer prints when *you* press the button. The site gives you the gun (`/advertise` + Orders admin + Social Kit); the 30-day plan below is the finger on the trigger.

---

## 1. What was just built (your revenue machinery)

| Tool | Where | What it does |
|---|---|---|
| **Rate-card page** | `myariahub.com/{en,fa,ps}/advertise` | 8 products with USD+AFN prices, Afghan payment rails explained, order form. Linked in the footer of every page. |
| **Order pipeline** | Admin → Orders (Revenue) | Every request lands here with a reference code (`AR-AD-XXXXXXXX`). You verify the hawala transfer → the platform **auto-features the listing** and stamps the audit trail. |
| **Featured delivery** | Automatic | Marking an order "paid" with an attached listing sets it featured for 7 days — it jumps to the top of the feed with a badge, exactly what the buyer paid for. |
| **Social Kit** | Admin → Social Kit | Generates branded FB/Instagram posters (1080×1080 + 1080×1350) in EN/FA/PS from any listing, downloadable as PNG. Your daily posting habit is now 2 minutes. |
| **Telegram/WhatsApp digests** | already live in alerts pipeline (SMTP = owner task) | The "inventory" that makes sponsored slots sellable. |

### The rate card (already live)
| Product | USD | AFN |
|---|---|---|
| Job posting — local company (30d) | $25 | 1,800 |
| Job posting — international NGO (30d) | $50 | 3,600 |
| **Featured listing 7 days (top-of-feed + Telegram)** | **$25** | **1,800** |
| Hiring pack (3 posts + 2 TG features) | $99 | 6,900 |
| Scholarship/uni/IELTS-center promotion | $150 | 10,500 |
| Channel sponsored slot (max 1/day) | $30 | 2,100 |
| Community boost (priority + 7d pin) | $15 | 1,050 |
| CV review (candidates) | $12 | 850 |

---

## 2. The 30-day execution clock

### Week 1 — first blood (Day 1–7)
- **Day 1:** Set up your payment collection so you can say "yes" instantly:
  - Confirm your hawala partner (name + city) and your wallet numbers (AfPay/hesabPay).
  - Put them in a note to yourself — never on the site (shared privately after each order).
- **Day 1–2:** List **10 employers already posting on ACBAR/Wazifaha Facebook groups** (Kabul NGOs, private companies, training centers). You have their names publicly; message them on WhatsApp/Facebook.
- **Day 3:** Send this exact pitch (Dari/English):
  > «سلام! ما در ARIA HUB (myariahub.com) فرصت‌های شغلی را به سه زبان نشر می‌کنیم. آگهی ۳۰ روزه فقط ۱۸۰۰ افغانی (۲۵ دالر) — همان امروز فعال می‌شود. حواله/نقدی/AfPay قابل پرداخت است. صفحه تعرفه: myariahub.com/fa/advertise»
- **Day 3–7:** Post 1 poster/day from the Social Kit (1 job + 1 scholarship alternating) to Facebook groups + your Telegram/WhatsApp channels. End every post with the Advertise link.
- **Target: 1 paid order by Day 7.** Realistic close: a small company needing staff fast. Price is deliberately below ACBAR's event-ticket economics — you're buying logos, not margins, in week 1.

### Week 2 — proof & repeat (Day 8–14)
- Publish the first paying employer's listing + **make them a hero poster** (Social Kit) and tag them — social proof that others paid.
- Ask each payer for a one-line testimonial → add to `/advertise` credibility (admin → Testimonials).
- Upsell the second product: "Your posting is live — +1,800 AFN pins it to the top for 7 days." **Featured is the easiest upsell in this market** (cheaper than a taxi ride, visible instantly).
- **Target: order #2–3, first featured add-on.** Cumulative: **$50–100.**

### Week 3 — channels become inventory (Day 15–21)
- Telegram/WhatsApp subscriber push: cross-promo with 2 Afghan scholarship channels (offer: free featured listing for a channel they run — trade reach, not money).
- Sell sponsored slot #1 at $30 (hard cap 1/day, always labeled «تبلیغ» — trust is the asset).
- Email SMTP: configure Resend/Brevo free tier (30 min) — alert digests start flowing; every digest carries the Advertise footer.
- **Target: 4–6 total orders. Cumulative: $120–200.**

### Week 4 — institutional money (Day 22–30)
- Pitch 3 universities/IELTS centers the **Scholarship promotion package** ($150/mo): their programs as featured listings + a monthly digest mention. Kardan, Rana, Gawharshad, AUAF career offices — they have marketing budgets; frame it as cheaper than one Facebook boost.
- Offer the **Hiring pack ($99)** to any NGO hiring >2 roles this quarter (UN sub-implementers included).
- Set your weekly rhythm (30 min/day): check GSC → post 3 posters → message 5 new employers → verify orders in Admin.
- **Target by Day 30: 6–10 orders, 1 recurring promo. Cumulative: $150–300 cash + $150/mo recurring.**

---

## 3. Where each dollar comes from (revenue mix by day 90)

```
Job postings (local)         ████████░░  ~35%   $150–250/mo
Featured add-ons             ██████░░░░  ~25%   $100–180/mo
Scholarship/uni promos       ████░░░░░░  ~15%   $150–300/mo (recurring!)
Sponsored slots              ███░░░░░░░  ~12%   $60–120/mo
Hiring packs / intl NGOs     ██░░░░░░░░  ~8%    $100–200/mo (lumpy)
CV reviews                   █░░░░░░░░░  ~5%    $25–60/mo
AdSense                      ▌           ~2%    $10–50/mo (housekeeping)
                                              ─────────────
                              TOTAL           $500–1,000/mo by month 3
```

AdSense stays as passive garnish — Afghan CPM ≈ $0.12 means 100k in-country views ≈ $30–50. The **employers and diaspora pay the bills**; keep ad placement disciplined (already: manual slots only, never near Apply buttons).

---

## 4. Payment ops (the Afghan bazar reality)

1. **Pricing is dual-currency on purpose:** AFN anchored for locals (1,800 AFN reads as "cheap" in a way "$25" doesn't), USD for NGOs/UN contractors whose budgets are in dollars.
2. **Hawala is your card network.** Confirm money by: sender's full name + hawala company + transfer code + amount. Cross-check against the order's reference code the buyer must quote. Typical partners: M-Paisa-linked hawaladars, Saraf markets in Kabul/Herat/Mazar.
3. **Wallets (AfPay/hesabPay)** are growing fast among NGOs' HR staff — offer them first for urban employers; they leave a clean digital trail.
4. **Cash** only with a stamped receipt + photo of the receipt stored with the order note (the Orders panel keeps your audit trail — use the internal note field).
5. **International:** Payoneer/Wise for INGOs. Send the USD amount + reference; they often need a simple invoice — generate one from the order details (title, product, amount, your entity name).
6. **Never** hold delivery hostage longer than a few hours — speed-to-live is your competitive advantage over every Afghan job board. Verify fast, feature fast.

### Fraud/abuse guardrails
- No delivery before payment verification (the pipeline's `requested → payment_claimed → paid` gates enforce this).
- One Telegram sponsored slot per day, maximum — the audience is the asset; over-selling kills the printer permanently.
- If an employer disputes a feature: refund the $25, keep the goodwill — in this market reputation compounds faster than revenue.

---

## 5. What the owner still must do (unclogs the printer)

| # | Task | Unblocks |
|---|---|---|
| 1 | **Neon quota** — upgrade or wait for reset, then run the 3 migrate scripts in the worklog | Production data + trilingual backfill (the site employers will judge) |
| 2 | **SMTP** (Resend/Brevo free) | Alert digests + submission decision emails — the channel that makes sponsored slots sellable |
| 3 | **Telegram + WhatsApp channels** (`t.me/ariahub` etc.) | 20–50k subscriber distribution; the daily digest habit |
| 4 | **AdSense ad slots** (3 env vars) | Passive garnish revenue |
| 5 | **Deploy current build** | Everything above is invisible until this ships |

---

## 6. KPI dashboard (check every Sunday, 15 minutes)

- Orders created / paid this week (Admin → Orders)
- Revenue collected (USD + AFN) — the panel computes it for you
- Telegram/WhatsApp subscriber count
- Posters published (target: 5/week)
- Employer pitches sent (target: 10/week, Day 1–30)
- GSC clicks on `/advertise` (organic inbound = the machine printing by itself)

**The printer's speed limit is outreach, not code.** The code is done. 10 messages a day for 30 days is the whole secret.
