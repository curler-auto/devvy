# Payment Flow - Quick Reference Guide

## 🎯 TL;DR - Recommended Approach

**For MVP (First 3-6 months):**
- Collect payments from users → Hold for 7 days → Settle to vendors weekly
- Commission: 15-20% (deducted before settlement)
- Settlement: Every Friday for previous week's transactions
- Method: Manual bank transfer initially

**For Scale (After 6 months):**
- Use Razorpay Route for automatic split payments
- Vendors get money instantly (minus commission)
- Zero manual work, zero working capital needed

---

## 📊 Payment Flow Comparison

### Option 1: Escrow Model (MVP - Recommended)
```
User pays ₹1,000 for monthly food subscription
         ↓
Platform receives ₹1,000 (holds in bank account)
         ↓
Wait 7 days (dispute resolution window)
         ↓
Platform calculates: ₹1,000 - 15% commission = ₹850
         ↓
Platform transfers ₹850 to vendor's bank account
         ↓
Platform keeps ₹150 as commission
```

**Timeline:**
- Day 1: User subscribes and pays
- Day 8: Settlement eligible
- Day 12: Vendor receives money (next Friday)

**Pros:** Simple, full control, easy refunds
**Cons:** Need working capital, manual work

---

### Option 2: Split Payment (Scale - Future)
```
User pays ₹1,000 for monthly food subscription
         ↓
Razorpay automatically splits payment:
  ├─> ₹850 to vendor's account (instant)
  └─> ₹150 to platform's account (instant)
         ↓
Done! No manual settlement needed
```

**Timeline:**
- Day 1: User pays → Vendor receives money instantly

**Pros:** Instant, automated, no working capital
**Cons:** Slightly higher fees, complex setup

---

## 💰 Settlement Calculation Examples

### Example 1: Food Subscription (30 days)
```
Subscription: ₹3,000/month (30 deliveries)
Per delivery: ₹100

Week 1 Results:
- Delivered: 6 days × ₹100 = ₹600
- Failed: 1 day × ₹100 = ₹100 (refund to user)

Settlement Calculation:
Gross amount:        ₹600
Platform commission: ₹90 (15%)
Gateway fee:         ₹15 (2.5%)
Net to vendor:       ₹495

User refund:         ₹100 (for failed delivery)
```

---

### Example 2: Gym Subscription (Monthly)
```
Subscription: ₹2,000/month
User visits: 15 times (doesn't matter for settlement)

Settlement Calculation:
Gross amount:        ₹2,000
Platform commission: ₹400 (20%)
Gateway fee:         ₹43 (2% + ₹3)
Net to vendor:       ₹1,557

Settlement: End of month + 7 days
```

---

### Example 3: OTT Subscription (Annual)
```
Subscription: ₹999/year (Netflix promo code)
Code activated: Yes

Settlement Calculation:
Gross amount:        ₹999
Platform commission: ₹100 (10%)
Gateway fee:         ₹23 (2% + ₹3)
Net to vendor:       ₹876

Settlement: Immediately after code activation
```

---

## 📅 Settlement Schedule

### Weekly Settlement (Recommended for MVP)

| Day | Activity |
|-----|----------|
| **Monday-Sunday** | Collect payments from users |
| **Monday** | Calculate settlements for previous week |
| **Tuesday** | Send settlement reports to vendors |
| **Wednesday** | Vendors verify and confirm |
| **Thursday** | Process bank transfers |
| **Friday** | Vendors receive money |

**Example:**
- Jan 1-7 (Mon-Sun): Collect ₹50,000
- Jan 8 (Mon): Calculate vendor settlement = ₹42,500
- Jan 12 (Fri): Vendor receives ₹42,500

---

## 🏦 Vendor Payout Options

### Option A: Bank Transfer (NEFT/IMPS)
- Vendor provides: Account number, IFSC, Name
- Processing time: 2-4 hours
- Cost: ₹5-10 per transfer
- Best for: Large amounts (>₹10,000)

### Option B: UPI Transfer
- Vendor provides: UPI ID (vendor@paytm)
- Processing time: Instant
- Cost: Free
- Best for: Small amounts (<₹10,000)

### Option C: Razorpay Route (Automatic)
- Vendor onboards via Razorpay
- Processing time: Instant (split payment)
- Cost: 0.5% extra gateway fee
- Best for: Scale phase

---

## 🔄 Refund Scenarios

### Scenario 1: User Cancels Subscription
```
Subscription: ₹3,000 for 30 days
Used: 10 days
Unused: 20 days

Refund calculation:
Per day cost: ₹3,000 / 30 = ₹100
Refund amount: 20 days × ₹100 = ₹2,000

Action:
1. Refund ₹2,000 to user
2. Deduct ₹2,000 from vendor's next settlement
3. Platform keeps commission on used portion only
```

### Scenario 2: Delivery Failed
```
Subscription: ₹3,000 for 30 days
Failed delivery: 1 day

Refund calculation:
Per day cost: ₹3,000 / 30 = ₹100
Refund amount: ₹100

Action:
1. Refund ₹100 to user
2. Deduct ₹100 from vendor's settlement
3. No commission on failed delivery
```

### Scenario 3: User Disputes Quality
```
Subscription: ₹2,000 gym membership
Complaint: Equipment not working

Resolution options:
1. Partial refund: ₹500 (25%)
2. Free extension: 1 week extra
3. Full refund: ₹2,000 (if severe)

Action:
1. Platform investigates (7-day hold period)
2. Decide resolution
3. Adjust vendor settlement accordingly
```

---

## 💡 Commission Structure

### By Category
| Category | Commission | Rationale |
|----------|-----------|-----------|
| Food/Grocery | 20-25% | High logistics cost |
| Gym/Fitness | 15-20% | Medium overhead |
| Medicine | 12-15% | Regulated, compliance |
| OTT/Digital | 8-10% | Low overhead |

### By Volume (Discounts)
| Monthly GMV | Discount |
|-------------|----------|
| < ₹1L | 0% (base rate) |
| ₹1L - ₹5L | -2% |
| ₹5L - ₹10L | -3% |
| > ₹10L | -5% |

### By Performance (Bonuses)
- Rating > 4.5 stars: -1%
- Delivery success > 95%: -1%
- New vendor (first 3 months): -5%

---

## 🚨 Important Considerations

### Working Capital Requirement
```
Scenario: 100 subscriptions × ₹1,000 = ₹1,00,000/week

If you settle weekly:
- Week 1: Collect ₹1L, hold
- Week 2: Collect ₹1L, settle ₹85K from Week 1
- Week 3: Collect ₹1L, settle ₹85K from Week 2

Minimum capital needed: ₹85,000
Buffer recommended: ₹2,00,000 (for refunds, disputes)
```

### Payment Gateway Fees
```
Razorpay/Stripe charges:
- Domestic cards: 2% + ₹3
- International cards: 3% + ₹3
- UPI: 0% (free up to ₹2,000)
- Netbanking: 2% + ₹3

Who pays?
- Option 1: Platform absorbs (reduce commission)
- Option 2: Pass to vendor (deduct from settlement)
- Option 3: Pass to user (add to subscription price)

Recommended: Platform absorbs initially, pass to vendor at scale
```

### Tax Implications
```
GST on Commission:
Platform commission: ₹150
GST (18%): ₹27
Total platform earning: ₹177

Vendor receives: ₹850 (no GST deduction)
Platform files GST return monthly

TDS (if applicable):
If vendor PAN available: Deduct 1% TDS
If no PAN: Deduct 20% TDS
Issue Form 16A quarterly
```

---

## 📱 Vendor Dashboard Features

### Settlement Overview
```
Current Period (Jan 1-7):
├─ Gross Revenue: ₹50,000
├─ Platform Commission: ₹7,500 (15%)
├─ Gateway Fees: ₹1,000
├─ Adjustments: -₹500 (refunds)
└─ Net Settlement: ₹41,000
   Settlement Date: Jan 12, 2024
   Status: Pending
```

### Transaction Breakdown
```
Date       | Type        | Amount  | Commission | Net
-----------|-------------|---------|------------|--------
Jan 1      | Subscription| ₹1,000  | ₹150       | ₹850
Jan 2      | Subscription| ₹2,000  | ₹300       | ₹1,700
Jan 3      | Refund      | -₹500   | ₹0         | -₹500
Jan 4      | Subscription| ₹1,500  | ₹225       | ₹1,275
-----------|-------------|---------|------------|--------
Total      |             | ₹4,000  | ₹675       | ₹3,325
```

### Settlement History
```
Period        | Amount   | Status    | Paid On
--------------|----------|-----------|----------
Dec 25-31     | ₹45,000  | Completed | Jan 5
Dec 18-24     | ₹38,000  | Completed | Dec 29
Dec 11-17     | ₹42,000  | Completed | Dec 22
```

---

## 🎬 Implementation Steps

### Phase 1: MVP (Week 1-4)
- [ ] Setup Razorpay account (standard)
- [ ] Implement payment collection
- [ ] Create vendor bank details form
- [ ] Build settlement calculation logic
- [ ] Create manual settlement process
- [ ] Build vendor settlement dashboard

### Phase 2: Automation (Week 5-8)
- [ ] Integrate Razorpay Payout API
- [ ] Automate settlement calculation (Celery)
- [ ] Automate bank transfers
- [ ] Add settlement notifications
- [ ] Build admin settlement approval panel

### Phase 3: Scale (Month 3+)
- [ ] Setup Razorpay Route
- [ ] Onboard vendors to Route
- [ ] Migrate to split payments
- [ ] Implement instant settlements
- [ ] Add advanced analytics

---

## ✅ Quick Decision Matrix

**Choose Escrow Model if:**
- ✅ Just starting (MVP phase)
- ✅ Want full control over payments
- ✅ Have working capital available
- ✅ Need flexibility for refunds
- ✅ Want to keep things simple

**Choose Split Payment if:**
- ✅ Scaling to 100+ vendors
- ✅ Want to eliminate manual work
- ✅ Don't have working capital
- ✅ Want instant vendor settlements
- ✅ Can handle complex setup

---

## 📞 Support & Dispute Resolution

### 7-Day Hold Period Purpose:
1. **Quality issues:** User reports bad food/service
2. **Delivery failures:** Order not delivered
3. **Fraud detection:** Suspicious transactions
4. **Chargebacks:** User disputes with bank
5. **Vendor verification:** Ensure vendor legitimacy

### Dispute Resolution Process:
```
Day 1: User reports issue
Day 1-3: Platform investigates
Day 3-5: Vendor responds
Day 5-7: Platform decides
Day 7: Settlement adjusted accordingly
```

---

## 🎯 Recommended for Your Platform

**Start with:**
- ✅ Escrow model with 7-day hold
- ✅ Weekly settlements (every Friday)
- ✅ 15-20% flat commission
- ✅ Manual bank transfers
- ✅ Simple vendor dashboard

**Migrate to (after 6 months):**
- ✅ Razorpay Route split payments
- ✅ Instant settlements
- ✅ Tiered commission structure
- ✅ Automated everything
- ✅ Advanced analytics

**Why this approach?**
1. **Low risk:** Start simple, scale gradually
2. **Low cost:** No expensive integrations upfront
3. **Learning:** Understand vendor needs first
4. **Flexibility:** Easy to adjust commission rates
5. **Trust:** Build vendor relationships before automation

---

**Need Help?** Refer to `PAYMENT_SETTLEMENT_STRATEGY.md` for detailed implementation code and examples.
