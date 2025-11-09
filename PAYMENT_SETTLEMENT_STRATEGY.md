# Payment Collection & Settlement Strategy

> **Important:** Before implementing any payment model, understand the licensing requirements. See `PAYMENT_LICENSING_GUIDE.md` for details on PA license vs sub-merchant model. **TL;DR:** Use Razorpay Route (sub-merchant model) - no license needed, launch in 1 week.

## 1. Payment Flow Models

### Model A: Escrow Model (Recommended for MVP)
**How it works:**
1. User pays platform for subscription
2. Platform holds funds in escrow
3. Platform settles to vendor based on fulfillment/schedule
4. Platform deducts commission before settlement

**Advantages:**
- ✅ Platform controls payment experience
- ✅ Easy refund management
- ✅ Better fraud protection
- ✅ Unified payment gateway fees
- ✅ Can hold funds for disputes

**Disadvantages:**
- ❌ Requires payment aggregator license (or use sub-merchant model)
- ❌ Platform liable for settlements
- ❌ Need working capital for instant settlements

---

### Model B: Direct Payment with Commission
**How it works:**
1. User pays vendor directly
2. Vendor pays platform commission separately
3. Platform invoices vendors monthly

**Advantages:**
- ✅ Simpler compliance
- ✅ No settlement liability
- ✅ No working capital needed

**Disadvantages:**
- ❌ Harder to enforce commission collection
- ❌ Fragmented payment experience
- ❌ Difficult refund coordination
- ❌ Less control over user experience

---

### Model C: Split Payment (Best for Scale)
**How it works:**
1. User pays platform
2. Payment gateway automatically splits payment
3. Vendor gets (amount - commission) instantly
4. Platform gets commission instantly

**Advantages:**
- ✅ Instant settlement to vendors
- ✅ No settlement liability
- ✅ Automatic commission collection
- ✅ No working capital needed
- ✅ Unified payment experience

**Disadvantages:**
- ❌ Requires payment gateway support (Razorpay Route, Stripe Connect)
- ❌ Slightly higher gateway fees
- ❌ Complex refund handling

---

## 2. Recommended Approach: Hybrid Model

### Phase 1 (MVP): Escrow with Weekly Settlement
- Collect all payments on platform
- Hold funds for 7 days (dispute window)
- Settle to vendors weekly
- Deduct commission before settlement

### Phase 2 (Scale): Split Payment with Razorpay Route
- Migrate to automatic split payments
- Instant vendor settlements
- Platform commission auto-collected
- Better vendor experience

---

## 3. Settlement Schedule Options

### Option 1: Weekly Settlement (Recommended for MVP)
```
Collection Period: Monday - Sunday
Settlement Date: Following Friday
Hold Period: 7 days minimum
```

**Example:**
- User subscribes on Jan 1 (Monday) - ₹1,000
- Platform commission: 15% = ₹150
- Vendor receives: ₹850 on Jan 12 (Friday)

**Pros:**
- Predictable cash flow for vendors
- Sufficient dispute resolution window
- Easier reconciliation
- Lower transaction costs

**Cons:**
- Vendors wait up to 14 days for first payment
- Need working capital

---

### Option 2: Bi-weekly Settlement
```
Collection Period: 1st-15th, 16th-End of month
Settlement Dates: 22nd and 7th of next month
Hold Period: 7 days minimum
```

**Pros:**
- Aligns with vendor accounting cycles
- Lower processing overhead

**Cons:**
- Longer wait times
- More complex for vendors to track

---

### Option 3: Instant Settlement (For Scale Phase)
```
Settlement: Real-time via split payment
Hold Period: None (gateway handles disputes)
```

**Pros:**
- Best vendor experience
- No working capital needed
- Automatic reconciliation

**Cons:**
- Requires Razorpay Route/Stripe Connect
- Higher gateway fees (~0.5% extra)
- Complex refund handling

---

## 4. Settlement Calculation Logic

### For Delivery-Based Subscriptions (Food, Grocery, Medicine)

**Settlement Trigger:** After successful delivery

```python
# Settlement calculation
subscription_amount = 3000  # Monthly subscription
total_deliveries = 30       # 30 days
completed_deliveries = 25   # 25 delivered so far
failed_deliveries = 2       # 2 failed
pending_deliveries = 3      # 3 upcoming

# Calculate earned amount
per_delivery_amount = subscription_amount / total_deliveries  # ₹100
earned_amount = completed_deliveries * per_delivery_amount    # ₹2,500

# Deduct commission
platform_commission_rate = 0.15  # 15%
platform_commission = earned_amount * platform_commission_rate  # ₹375
vendor_settlement = earned_amount - platform_commission         # ₹2,125

# Handle failed deliveries
failed_amount = failed_deliveries * per_delivery_amount  # ₹200
refund_to_user = failed_amount  # Refund to user
```

**Settlement Schedule:**
- **Daily settlements:** For high-volume vendors (>100 orders/day)
- **Weekly settlements:** For regular vendors
- **Pro-rata basis:** Based on successful deliveries

---

### For Promo Code Subscriptions (OTT, SaaS)

**Settlement Trigger:** After promo code activation

```python
# Settlement calculation
subscription_amount = 999   # Annual Netflix
code_activated = True       # User activated code

if code_activated:
    # Settle immediately after activation
    platform_commission_rate = 0.10  # 10% for digital (lower margin)
    platform_commission = subscription_amount * platform_commission_rate  # ₹99.90
    vendor_settlement = subscription_amount - platform_commission         # ₹899.10
else:
    # No settlement until activation
    vendor_settlement = 0
```

**Settlement Schedule:**
- **Immediate:** After successful code activation
- **Bulk settlement:** Weekly for multiple activations

---

### For Access-Based Subscriptions (Gym, Classes)

**Settlement Trigger:** Monthly, based on active subscription

```python
# Settlement calculation
subscription_amount = 2000  # Monthly gym
subscription_active_days = 30
user_checkins = 15          # User visited 15 times

# Full amount settlement (not pro-rata by visits)
platform_commission_rate = 0.20  # 20% for access-based
platform_commission = subscription_amount * platform_commission_rate  # ₹400
vendor_settlement = subscription_amount - platform_commission         # ₹1,600

# Settlement at end of billing cycle
settlement_date = end_of_billing_cycle + 7_days  # 7-day hold period
```

**Settlement Schedule:**
- **Monthly:** At end of billing cycle + 7 days
- **No pro-rata:** Full amount regardless of usage
- **Pause handling:** No settlement during pause period

---

## 5. Commission Structure

### Tiered Commission Model

| Category | Commission Rate | Rationale |
|----------|----------------|-----------|
| **OTT/Digital** | 8-10% | Low overhead, instant delivery |
| **Gym/Fitness** | 15-20% | Medium overhead, access-based |
| **Food/Grocery** | 18-25% | High overhead, logistics involved |
| **Medicine** | 12-15% | Regulated, compliance costs |
| **Premium Vendors** | 10-12% | Volume discount for established brands |

### Dynamic Commission (Future)
```python
def calculate_commission(vendor, subscription):
    base_rate = get_category_commission(subscription.category)
    
    # Volume discount
    if vendor.monthly_gmv > 1000000:  # ₹10L+
        base_rate -= 0.03  # 3% discount
    elif vendor.monthly_gmv > 500000:  # ₹5L+
        base_rate -= 0.02  # 2% discount
    
    # Performance bonus
    if vendor.rating > 4.5 and vendor.delivery_success_rate > 0.95:
        base_rate -= 0.01  # 1% discount
    
    # New vendor promotion
    if vendor.age_days < 90:  # First 3 months
        base_rate -= 0.05  # 5% discount
    
    return max(base_rate, 0.05)  # Minimum 5% commission
```

---

## 6. Payment Gateway Integration

### Razorpay Route (Recommended)

**Setup:**
```python
import razorpay

client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))

# Create linked account for vendor
account = client.account.create({
    "email": vendor.email,
    "phone": vendor.phone,
    "type": "route",
    "legal_business_name": vendor.business_name,
    "business_type": "partnership",
    "contact_name": vendor.contact_name,
    "profile": {
        "category": "healthcare",
        "subcategory": "clinic",
        "addresses": {
            "registered": {
                "street1": vendor.address.street,
                "city": vendor.address.city,
                "state": vendor.address.state,
                "postal_code": vendor.address.pincode,
                "country": "IN"
            }
        }
    },
    "legal_info": {
        "pan": vendor.pan_number,
        "gst": vendor.gst_number
    }
})

# Store account_id in vendor record
vendor.razorpay_account_id = account['id']
```

**Create Order with Split Payment:**
```python
# When user subscribes
order = client.order.create({
    "amount": 100000,  # ₹1,000 in paise
    "currency": "INR",
    "receipt": f"sub_{subscription.id}",
    "transfers": [
        {
            "account": vendor.razorpay_account_id,
            "amount": 85000,  # ₹850 (85% to vendor)
            "currency": "INR",
            "notes": {
                "subscription_id": str(subscription.id),
                "vendor_id": str(vendor.id)
            },
            "linked_account_notes": ["subscription_payment"],
            "on_hold": 1,  # Hold for 7 days
            "on_hold_until": int(time.time()) + (7 * 24 * 60 * 60)  # 7 days
        }
    ]
})

# Platform automatically receives ₹150 (15% commission)
```

**Release Payment After Delivery:**
```python
# After successful delivery
transfer = client.transfer.fetch(transfer_id)
transfer.edit({
    "on_hold": 0  # Release payment to vendor
})
```

---

### Stripe Connect (Alternative)

**Setup:**
```python
import stripe

stripe.api_key = STRIPE_SECRET_KEY

# Create connected account for vendor
account = stripe.Account.create(
    type="express",
    country="IN",
    email=vendor.email,
    capabilities={
        "card_payments": {"requested": True},
        "transfers": {"requested": True},
    },
    business_profile={
        "name": vendor.business_name,
        "product_description": vendor.description,
    }
)

vendor.stripe_account_id = account.id
```

**Create Payment Intent with Split:**
```python
# When user subscribes
payment_intent = stripe.PaymentIntent.create(
    amount=100000,  # ₹1,000 in paise
    currency="inr",
    application_fee_amount=15000,  # ₹150 platform commission
    transfer_data={
        "destination": vendor.stripe_account_id,
    },
    metadata={
        "subscription_id": str(subscription.id),
        "vendor_id": str(vendor.id)
    }
)
```

---

## 7. Settlement Database Schema

### vendor_settlements Table
```sql
CREATE TABLE vendor_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id),
    
    -- Period
    settlement_period_start DATE NOT NULL,
    settlement_period_end DATE NOT NULL,
    settlement_date DATE NOT NULL,
    
    -- Amounts
    gross_amount DECIMAL(10,2) NOT NULL,      -- Total subscription amount
    platform_commission DECIMAL(10,2) NOT NULL,
    payment_gateway_fee DECIMAL(10,2) NOT NULL,
    adjustments DECIMAL(10,2) DEFAULT 0,      -- Refunds, chargebacks
    net_amount DECIMAL(10,2) NOT NULL,        -- Amount to settle
    
    -- Status
    status VARCHAR(20) NOT NULL,  -- pending, processing, completed, failed
    
    -- Payment Details
    payment_method VARCHAR(50),   -- bank_transfer, upi, razorpay_route
    payment_reference VARCHAR(255),
    payment_date TIMESTAMP,
    
    -- Reconciliation
    transaction_count INTEGER NOT NULL,
    subscription_ids UUID[],
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_settlements_vendor ON vendor_settlements(vendor_id);
CREATE INDEX idx_settlements_status ON vendor_settlements(status);
CREATE INDEX idx_settlements_date ON vendor_settlements(settlement_date);
```

### settlement_transactions Table
```sql
CREATE TABLE settlement_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID REFERENCES vendor_settlements(id),
    subscription_id UUID REFERENCES user_subscriptions(id),
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL,  -- subscription, delivery, refund
    amount DECIMAL(10,2) NOT NULL,
    commission DECIMAL(10,2) NOT NULL,
    gateway_fee DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    
    -- Reference
    payment_id UUID REFERENCES payments(id),
    delivery_id UUID REFERENCES deliveries(id),
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 8. Settlement Process Flow

### Automated Weekly Settlement (Celery Task)

```python
from celery import shared_task
from datetime import datetime, timedelta
from app.models import Vendor, Payment, VendorSettlement
from app.services.payment_service import PaymentService

@shared_task
def process_weekly_settlements():
    """
    Run every Friday at 2 AM
    Settle payments for previous week (Mon-Sun)
    """
    today = datetime.now().date()
    period_end = today - timedelta(days=today.weekday() + 1)  # Last Sunday
    period_start = period_end - timedelta(days=6)  # Previous Monday
    settlement_date = today + timedelta(days=7)  # Next Friday
    
    # Get all active vendors
    vendors = Vendor.query.filter_by(status='active').all()
    
    for vendor in vendors:
        # Calculate settlement amount
        settlement_data = calculate_vendor_settlement(
            vendor_id=vendor.id,
            period_start=period_start,
            period_end=period_end
        )
        
        if settlement_data['net_amount'] > 0:
            # Create settlement record
            settlement = VendorSettlement(
                vendor_id=vendor.id,
                settlement_period_start=period_start,
                settlement_period_end=period_end,
                settlement_date=settlement_date,
                gross_amount=settlement_data['gross_amount'],
                platform_commission=settlement_data['commission'],
                payment_gateway_fee=settlement_data['gateway_fee'],
                adjustments=settlement_data['adjustments'],
                net_amount=settlement_data['net_amount'],
                status='pending',
                transaction_count=settlement_data['transaction_count'],
                subscription_ids=settlement_data['subscription_ids']
            )
            db.session.add(settlement)
            
            # Send notification to vendor
            notify_vendor_settlement_created(vendor, settlement)
    
    db.session.commit()


def calculate_vendor_settlement(vendor_id, period_start, period_end):
    """Calculate settlement amount for vendor"""
    
    # Get all successful payments in period
    payments = Payment.query.filter(
        Payment.vendor_id == vendor_id,
        Payment.status == 'completed',
        Payment.completed_at >= period_start,
        Payment.completed_at <= period_end
    ).all()
    
    gross_amount = sum(p.amount for p in payments)
    
    # Calculate commission
    commission_rate = get_vendor_commission_rate(vendor_id)
    platform_commission = gross_amount * commission_rate
    
    # Calculate gateway fees (typically 2% + ₹3)
    gateway_fee = sum(
        (p.amount * 0.02) + 3 for p in payments
    )
    
    # Get adjustments (refunds, chargebacks)
    adjustments = calculate_adjustments(vendor_id, period_start, period_end)
    
    # Calculate net amount
    net_amount = gross_amount - platform_commission - gateway_fee - adjustments
    
    return {
        'gross_amount': gross_amount,
        'commission': platform_commission,
        'gateway_fee': gateway_fee,
        'adjustments': adjustments,
        'net_amount': net_amount,
        'transaction_count': len(payments),
        'subscription_ids': [p.subscription_id for p in payments]
    }


@shared_task
def execute_settlements():
    """
    Run daily at 10 AM
    Execute pending settlements scheduled for today
    """
    today = datetime.now().date()
    
    pending_settlements = VendorSettlement.query.filter(
        VendorSettlement.settlement_date == today,
        VendorSettlement.status == 'pending'
    ).all()
    
    payment_service = PaymentService()
    
    for settlement in pending_settlements:
        try:
            # Update status
            settlement.status = 'processing'
            db.session.commit()
            
            # Execute payment
            result = payment_service.transfer_to_vendor(
                vendor_id=settlement.vendor_id,
                amount=settlement.net_amount,
                reference=f"settlement_{settlement.id}"
            )
            
            # Update settlement
            settlement.status = 'completed'
            settlement.payment_reference = result['reference']
            settlement.payment_date = datetime.now()
            settlement.payment_method = result['method']
            
            # Notify vendor
            notify_vendor_settlement_completed(settlement)
            
        except Exception as e:
            settlement.status = 'failed'
            settlement.notes = str(e)
            
            # Notify admin
            notify_admin_settlement_failed(settlement, e)
        
        db.session.commit()
```

---

## 9. Refund Handling

### Full Refund (Subscription Cancelled)
```python
def process_full_refund(subscription_id):
    subscription = UserSubscription.query.get(subscription_id)
    payment = Payment.query.filter_by(subscription_id=subscription_id).first()
    
    # Calculate refund amount
    if subscription.status == 'trial':
        refund_amount = 0  # No refund during trial
    else:
        # Pro-rata refund based on unused days
        total_days = (subscription.end_date - subscription.start_date).days
        used_days = (datetime.now().date() - subscription.start_date).days
        unused_days = total_days - used_days
        
        refund_amount = (payment.amount / total_days) * unused_days
    
    # Initiate refund
    if refund_amount > 0:
        razorpay_client.payment.refund(
            payment.gateway_transaction_id,
            {
                "amount": int(refund_amount * 100),  # Convert to paise
                "notes": {
                    "reason": "subscription_cancelled",
                    "subscription_id": str(subscription_id)
                }
            }
        )
        
        # Update settlement (deduct from next settlement)
        adjust_vendor_settlement(
            vendor_id=subscription.vendor_id,
            adjustment_amount=-refund_amount,
            reason="refund_issued"
        )
```

### Partial Refund (Failed Deliveries)
```python
def process_delivery_refund(delivery_id):
    delivery = Delivery.query.get(delivery_id)
    subscription = delivery.subscription
    
    # Calculate per-delivery amount
    total_deliveries = get_total_deliveries(subscription)
    per_delivery_amount = subscription.price / total_deliveries
    
    # Refund to user
    refund_amount = per_delivery_amount
    
    # Initiate refund
    razorpay_client.payment.refund(
        delivery.payment_id,
        {
            "amount": int(refund_amount * 100),
            "notes": {
                "reason": "delivery_failed",
                "delivery_id": str(delivery_id)
            }
        }
    )
    
    # Adjust vendor settlement
    adjust_vendor_settlement(
        vendor_id=subscription.vendor_id,
        adjustment_amount=-refund_amount,
        reason="delivery_failed"
    )
```

---

## 10. Vendor Payout Methods

### Bank Transfer (NEFT/RTGS/IMPS)
```python
# Vendor provides bank details
vendor_bank_details = {
    "account_number": "1234567890",
    "ifsc_code": "HDFC0001234",
    "account_holder_name": "Vendor Business Name",
    "account_type": "current",
    "bank_name": "HDFC Bank"
}

# Verify bank account (Razorpay Account Validation API)
validation = razorpay_client.fund_account.validate({
    "account_number": vendor_bank_details['account_number'],
    "ifsc": vendor_bank_details['ifsc_code'],
    "name": vendor_bank_details['account_holder_name']
})

# Store verified details
vendor.bank_details = vendor_bank_details
vendor.bank_verified = True
```

### UPI Transfer
```python
# Vendor provides UPI ID
vendor_upi_details = {
    "upi_id": "vendor@paytm",
    "verified": False
}

# Verify UPI (send ₹1 test transaction)
test_transfer = razorpay_client.fund_account.create({
    "contact_id": vendor.razorpay_contact_id,
    "account_type": "vpa",
    "vpa": {
        "address": vendor_upi_details['upi_id']
    }
})

# If successful, mark as verified
vendor.upi_details = vendor_upi_details
vendor.upi_verified = True
```

### Razorpay Route (Instant Settlement)
```python
# Already configured during vendor onboarding
# Settlements happen automatically via split payment
# No manual payout needed
```

---

## 11. Settlement Dashboard (Vendor Portal)

### Key Metrics to Show
```javascript
// Vendor Settlement Dashboard
{
  "current_period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-07",
    "gross_revenue": 50000,
    "platform_commission": 7500,
    "gateway_fees": 1000,
    "adjustments": -500,
    "net_settlement": 42000,
    "settlement_date": "2024-01-12",
    "status": "pending"
  },
  "lifetime_stats": {
    "total_settled": 500000,
    "total_commission": 75000,
    "average_commission_rate": 0.15,
    "total_transactions": 1250
  },
  "recent_settlements": [
    {
      "period": "Dec 25 - Dec 31",
      "amount": 45000,
      "settled_on": "2024-01-05",
      "status": "completed"
    }
  ]
}
```

---

## 12. Recommended Implementation Plan

### Phase 1 (MVP - Week 1-8): Manual Settlement
- ✅ Collect all payments on platform
- ✅ Hold funds for 7 days
- ✅ Manual bank transfer to vendors weekly
- ✅ Simple settlement dashboard
- ✅ Commission: 15-20% flat rate

**Pros:** Simple to implement, full control
**Cons:** Manual work, requires working capital

---

### Phase 2 (Month 2-3): Automated Settlement
- ✅ Automated settlement calculation
- ✅ Razorpay Payout API integration
- ✅ Automatic bank transfers
- ✅ Detailed settlement reports
- ✅ Tiered commission structure

**Pros:** Automated, scalable
**Cons:** Still need working capital

---

### Phase 3 (Month 4+): Split Payment
- ✅ Migrate to Razorpay Route
- ✅ Instant vendor settlements
- ✅ Zero working capital
- ✅ Automatic commission collection
- ✅ Advanced analytics

**Pros:** Best experience, no capital needed
**Cons:** Higher gateway fees, complex setup

---

## 13. Key Recommendations

### For MVP Launch:
1. **Use Escrow Model** with weekly settlements
2. **Hold funds for 7 days** for dispute resolution
3. **Flat commission:** 15% for all categories
4. **Manual bank transfers** initially (reduce overhead)
5. **Simple settlement dashboard** for vendors

### For Scale:
1. **Migrate to Razorpay Route** for instant settlements
2. **Tiered commission** based on category and volume
3. **Automated payouts** via API
4. **Advanced analytics** for vendors
5. **Dynamic commission** based on performance

### Critical Success Factors:
- ✅ **Transparency:** Clear settlement schedule and calculations
- ✅ **Predictability:** Vendors know exactly when they'll get paid
- ✅ **Automation:** Minimize manual intervention
- ✅ **Support:** Quick resolution of settlement issues
- ✅ **Compliance:** Proper tax handling (TDS, GST)

---

## 14. Tax & Compliance

### TDS (Tax Deducted at Source)
```python
# For vendors with PAN
if vendor.pan_number:
    tds_rate = 0.01  # 1% TDS on commission
    tds_amount = platform_commission * tds_rate
    net_settlement = net_settlement - tds_amount
    
    # File TDS return quarterly
    # Issue Form 16A to vendor
```

### GST Handling
```python
# Platform charges commission + GST
platform_commission = gross_amount * commission_rate
gst_on_commission = platform_commission * 0.18  # 18% GST
total_platform_earning = platform_commission + gst_on_commission

# Vendor receives amount excluding commission
vendor_settlement = gross_amount - platform_commission

# Platform files GST return monthly
```

---

**Recommended for Your Platform:** Start with **Escrow + Weekly Settlement** for MVP, migrate to **Razorpay Route** after 3-6 months once you have steady volume and vendor trust.
