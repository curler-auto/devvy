# Subscription Aggregation Platform - Technical Design

## 1. Executive Summary

**Vision:** Unified platform for businesses to offer subscriptions and users to manage them all in one place.

**Target:** MVP in 8-12 weeks | Web + PWA | Lightweight yet scalable

**Core Value:**
- **Vendors:** Quick setup, automated billing, delivery tracking, analytics
- **Users:** Single dashboard, unified payments, pause/cancel controls, spending insights

---

## 2. System Architecture

### 2.1 Tech Stack

**Frontend:**
- React 18.2 + Shadcn UI + Tailwind CSS
- Zustand (state), React Query (API), React Hook Form (forms)
- Workbox (PWA), React Big Calendar, Recharts
- **Reuse:** Existing DevTools UI components

**Backend:**
- FastAPI + SQLAlchemy 2.0 + Pydantic v2
- Celery + Redis (async tasks)
- JWT auth, WebSocket support
- **Reuse:** Existing auth system from DevTools

**Database:**
- PostgreSQL 15+ (primary with JSONB)
- Redis 7+ (cache + queues)
- PostgreSQL full-text search initially

**Infrastructure:**
- Docker + Docker Compose (dev)
- Kubernetes (production scale)
- Cloudflare CDN
- AWS S3 (storage)

### 2.2 High-Level Architecture

```
User/Vendor Apps (React PWA)
         ↓
API Gateway (Nginx + Rate Limiting)
         ↓
Backend Services (FastAPI)
├── Auth Service
├── Subscription Service
├── Payment Service (Razorpay/Stripe)
├── Delivery Service (Dunzo/Shadowfax)
├── Notification Service (Email/SMS/Push)
└── Analytics Service
         ↓
PostgreSQL + Redis + S3
```

---

## 3. Database Schema (Core Tables)

### users
```sql
id, email, phone, password_hash, full_name, role (user/vendor/admin),
email_verified, phone_verified, metadata (JSONB), created_at
```

### vendors
```sql
id, user_id, business_name, business_type (restaurant/gym/ott/grocery),
logo_url, description, address (JSONB), is_verified, commission_rate,
status (pending/active/suspended), settings (JSONB), created_at
```

### subscription_plans
```sql
id, vendor_id, name, description, category, subcategory,
base_price, currency, billing_cycle (daily/weekly/monthly),
fulfillment_type (delivery/pickup/digital/promocode),
delivery_config (JSONB: time_slots, delivery_days),
min_commitment_cycles, max_pause_count, max_pause_days,
cancellation_policy (JSONB), items (JSONB), features (JSONB),
is_promocode_based, promocode_config (JSONB),
max_subscribers, current_subscribers, is_active, slug, tags
```

### user_subscriptions
```sql
id, user_id, plan_id, vendor_id,
status (trial/active/paused/cancelled/expired),
start_date, end_date, next_billing_date, trial_end_date,
price, billing_cycle, customizations (JSONB),
delivery_address (JSONB), delivery_instructions,
pause_count, total_paused_days, promocode, auto_renew,
payment_method_id, metadata (JSONB)
```

### deliveries
```sql
id, subscription_id, user_id, vendor_id,
scheduled_date, scheduled_time_slot,
delivery_status (scheduled/out_for_delivery/delivered/failed),
items (JSONB), delivery_address (JSONB),
tracking_id, logistics_partner, driver_info (JSONB),
dispatched_at, delivered_at, delivery_proof_url,
rating, feedback, issue_reported
```

### payments
```sql
id, user_id, subscription_id, vendor_id,
amount, currency, payment_type (subscription/renewal/refund),
status (pending/completed/failed/refunded),
payment_gateway (razorpay/stripe), gateway_transaction_id,
payment_method, payment_method_details (JSONB),
refund_amount, invoice_url, invoice_number
```

### promo_codes
```sql
id, vendor_id, subscription_id, code, provider (netflix/prime),
status (available/assigned/activated/expired),
assigned_to_user_id, assigned_at, activated_at,
valid_from, valid_until, activation_instructions, redemption_url
```

### notifications
```sql
id, user_id, type, title, message,
channels (in_app/email/sms/push), is_read, read_at,
action_url, priority, metadata (JSONB), expires_at
```

**Supporting Tables:** payment_methods, subscription_pauses, vendor_payouts, reviews, activity_logs

---

## 4. API Design

**Base:** `https://api.yourplatform.com/v1`

### Key Endpoints

**Auth:** `/auth/register`, `/auth/login`, `/auth/verify-email`, `/auth/verify-phone`

**Users:** `/users/me`, `/users/me/subscriptions`, `/users/me/payments`, `/users/me/notifications`

**Vendors:** `/vendors`, `/vendors/:id`, `/vendors/:id/plans`, `/vendors/:id/analytics`

**Plans:** `/plans` (list/search), `/plans/:id`, `/plans/categories`, `/plans/featured`

**Subscriptions:** `/subscriptions` (create), `/subscriptions/:id/pause|resume|cancel`, `/subscriptions/:id/deliveries`

**Deliveries:** `/deliveries/:id`, `/deliveries/:id/track`, `/deliveries/:id/complete`, `/deliveries/:id/feedback`

**Payments:** `/payments/initiate`, `/payments/verify`, `/payments/:id/refund`, `/payments/invoices/:id`

**Promo Codes:** `/promocodes/validate`, `/promocodes/activate`

**WebSocket:** `/ws/notifications`, `/ws/delivery-tracking/:id`

---

## 5. Category-Specific Models

### Food/Grocery Subscriptions
- **Delivery:** Daily/weekly schedules, time slots, skip delivery
- **Customization:** Meal preferences, dietary restrictions, quantity
- **Logistics:** Dunzo/Shadowfax integration, cold chain tracking
- **Items:** Menu items, portion sizes, add-ons

### Gym/Fitness Subscriptions
- **Fulfillment:** Pickup (gym visit), class bookings
- **Features:** Class schedules, trainer access, equipment usage
- **Tracking:** Visit check-ins, workout logs
- **Pause:** Vacation holds, injury pauses

### OTT/Digital Subscriptions
- **Fulfillment:** Promo code delivery
- **Activation:** Auto-apply or manual redemption
- **Providers:** Netflix, Prime, Hotstar, Spotify
- **No logistics:** Pure digital delivery

### Medicine Subscriptions
- **Compliance:** Prescription upload, verification
- **Delivery:** Temperature-controlled, signature required
- **Reminders:** Medication reminders, refill alerts
- **Tracking:** Batch numbers, expiry dates

---

## 6. Key Features Implementation

### 6.1 Subscription Lifecycle

**States:** Trial → Active → Paused → Resumed → Cancelled/Expired

**Transitions:**
```python
# Celery scheduled tasks
@celery.task
def process_subscription_renewals():
    # Run daily at 2 AM
    # Find subscriptions with next_billing_date = today
    # Initiate payment
    # Update status based on payment result
    
@celery.task
def check_trial_expirations():
    # Convert trial to active or cancel
    
@celery.task
def handle_pause_expirations():
    # Auto-resume paused subscriptions
```

### 6.2 Delivery Scheduling

```python
@celery.task
def generate_delivery_schedule(subscription_id):
    # When subscription created/resumed
    # Generate delivery records based on:
    # - billing_cycle
    # - delivery_config (days, time_slots)
    # - subscription duration
    # Insert into deliveries table
    
@celery.task
def notify_upcoming_deliveries():
    # Run daily
    # Notify users of tomorrow's deliveries
```

### 6.3 Payment Processing

```python
# Razorpay integration
def initiate_payment(subscription_id, amount):
    order = razorpay_client.order.create({
        'amount': amount * 100,  # paise
        'currency': 'INR',
        'receipt': f'sub_{subscription_id}'
    })
    return order['id']

# Webhook handler
@app.post('/webhooks/razorpay')
async def razorpay_webhook(request: Request):
    # Verify signature
    # Update payment status
    # Trigger subscription activation/renewal
```

### 6.4 Promo Code Management

```python
def assign_promocode(subscription_id):
    # Find available promo code for provider
    # Assign to user
    # Send activation instructions
    # Update status to 'assigned'
    
def activate_promocode(code_id):
    # Mark as activated
    # Send confirmation
    # Log activation timestamp
```

### 6.5 Notification System

```python
# Multi-channel notification
async def send_notification(user_id, type, data):
    notification = create_notification(user_id, type, data)
    
    # In-app (WebSocket)
    await ws_manager.send_to_user(user_id, notification)
    
    # Email (async)
    celery_send_email.delay(user_id, notification)
    
    # SMS (for critical)
    if notification.priority == 'urgent':
        celery_send_sms.delay(user_id, notification)
    
    # Push (if enabled)
    celery_send_push.delay(user_id, notification)
```

---

## 7. Frontend Structure

```
src/
├── pages/
│   ├── Home/              # Browse plans, featured, categories
│   ├── PlanDetails/       # Plan info, subscribe
│   ├── Subscriptions/     # My subscriptions, manage
│   ├── Deliveries/        # Delivery calendar, tracking
│   ├── Payments/          # Payment history, methods
│   ├── Profile/           # User settings, addresses
│   └── Vendor/            # Vendor portal (separate)
├── components/
│   ├── ui/                # Shadcn components
│   ├── subscription/      # SubscriptionCard, ManageModal
│   ├── delivery/          # DeliveryCard, TrackingMap
│   └── payment/           # PaymentForm, InvoiceList
├── stores/
│   ├── authStore.js       # Zustand auth state
│   ├── subscriptionStore.js
│   └── notificationStore.js
├── hooks/
│   ├── useSubscriptions.js  # React Query hooks
│   ├── useDeliveries.js
│   └── usePayments.js
└── utils/
    ├── api.js             # Axios instance
    ├── websocket.js       # WebSocket manager
    └── pwa.js             # Service worker utils
```

### Vendor Portal (Separate App)

```
vendor-portal/
├── pages/
│   ├── Dashboard/         # Overview, metrics
│   ├── Plans/             # Manage plans
│   ├── Subscriptions/     # Active subscribers
│   ├── Deliveries/        # Delivery management
│   ├── Payments/          # Revenue, payouts
│   └── Settings/          # Business settings
```

---

## 8. PWA Implementation

### manifest.json
```json
{
  "name": "SubHub",
  "short_name": "SubHub",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#6366f1",
  "background_color": "#ffffff",
  "icons": [
    {"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png"}
  ]
}
```

### Service Worker (Workbox)
```javascript
// Cache strategies
registerRoute(
  ({request}) => request.destination === 'image',
  new CacheFirst({cacheName: 'images'})
);

registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new NetworkFirst({cacheName: 'api'})
);

// Offline fallback
setCatchHandler(({event}) => {
  if (event.request.destination === 'document') {
    return caches.match('/offline.html');
  }
});
```

---

## 9. Third-Party Integrations

### Payment Gateways
- **Razorpay** (Primary - India): Cards, UPI, Netbanking, Wallets
- **Razorpay Route** (Settlement): Split payments, instant vendor settlements
- **Stripe** (International): Cards, Apple Pay, Google Pay
- **Abstraction Layer:** Unified payment interface

**Note:** See `PAYMENT_SETTLEMENT_STRATEGY.md` for detailed payment collection and vendor settlement approach.

### Logistics Partners
- **Dunzo API:** Hyperlocal delivery (< 10km)
- **Shadowfax API:** City-wide delivery
- **Delhivery:** Inter-city (future)
- **Self-delivery:** For vendors with own fleet

### Communication
- **Email:** AWS SES (transactional), SendGrid (marketing)
- **SMS:** Twilio (international), MSG91 (India)
- **Push:** Firebase Cloud Messaging
- **WhatsApp:** Twilio WhatsApp Business API (future)

### Maps & Location
- **Google Maps API:** Geocoding, routing, distance matrix
- **Mapbox** (alternative): Cost-effective for high volume

### Storage
- **AWS S3:** Images, documents, invoices
- **Cloudflare R2** (alternative): Zero egress fees

---

## 10. Deployment Strategy

### Phase 1: MVP (Weeks 1-8)
**Features:**
- User auth, vendor onboarding
- 3 categories: Food, Gym, OTT
- Basic subscription management
- Razorpay integration
- Manual delivery tracking
- Email notifications

**Infrastructure:**
- Single DigitalOcean droplet (4GB RAM)
- PostgreSQL + Redis on same server
- Nginx reverse proxy
- Docker Compose

### Phase 2: Scale (Weeks 9-12)
**Features:**
- 5+ categories
- Logistics integration (Dunzo)
- SMS + Push notifications
- Analytics dashboard
- Vendor payouts
- Review system

**Infrastructure:**
- Separate app + DB servers
- Redis cluster
- CDN (Cloudflare)
- Background workers (Celery)

### Phase 3: Production (Month 4+)
**Features:**
- Advanced analytics
- Recommendation engine
- WhatsApp notifications
- Multi-language support
- Vendor white-label widgets

**Infrastructure:**
- Kubernetes cluster
- PostgreSQL replication
- Elasticsearch for search
- Monitoring (Prometheus + Grafana)
- Auto-scaling

---

## 11. Development Roadmap

### Week 1-2: Foundation
- [ ] Database schema setup
- [ ] Auth system (reuse DevTools)
- [ ] Basic API structure
- [ ] Frontend scaffolding
- [ ] CI/CD pipeline

### Week 3-4: Core Features
- [ ] Subscription plan CRUD
- [ ] User subscription flow
- [ ] Payment integration (Razorpay)
- [ ] Basic vendor portal
- [ ] Email notifications

### Week 5-6: Category Models
- [ ] Food subscription model
- [ ] Gym subscription model
- [ ] OTT promo code model
- [ ] Delivery scheduling
- [ ] Calendar views

### Week 7-8: Polish & Testing
- [ ] PWA implementation
- [ ] Mobile responsiveness
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Beta launch

---

## 12. Scalability Considerations

### Database
- **Partitioning:** Partition deliveries table by date
- **Indexing:** Proper indexes on foreign keys, status fields
- **Read replicas:** For analytics queries
- **Connection pooling:** PgBouncer

### Caching Strategy
```python
# Redis caching layers
- L1: Plan details (1 hour TTL)
- L2: User subscriptions (5 min TTL)
- L3: Vendor data (30 min TTL)
- Real-time: Delivery tracking (no cache)
```

### Background Jobs
```python
# Celery queues
- high_priority: Payment processing, OTP
- default: Notifications, delivery scheduling
- low_priority: Analytics, reports
```

### API Rate Limiting
```python
# Per user/vendor
- Anonymous: 100 req/hour
- Authenticated: 1000 req/hour
- Vendor: 5000 req/hour
- Admin: Unlimited
```

---

## 13. Security Measures

- **Authentication:** JWT with refresh tokens, 15-min access token expiry
- **Authorization:** Role-based access control (RBAC)
- **Data encryption:** TLS 1.3, encrypted DB fields for sensitive data
- **Payment security:** PCI-DSS compliance via Razorpay/Stripe
- **API security:** Rate limiting, CORS, input validation
- **Audit logs:** Track all critical operations
- **GDPR compliance:** Data export, deletion, consent management

---

## 14. Monitoring & Observability

### Metrics
- **Business:** Active subscriptions, MRR, churn rate, CAC
- **Technical:** API latency, error rates, DB query time
- **Infrastructure:** CPU, memory, disk usage

### Tools
- **APM:** Sentry (errors), New Relic (performance)
- **Logs:** ELK Stack or CloudWatch
- **Uptime:** UptimeRobot, PagerDuty
- **Analytics:** Mixpanel or Amplitude

---

## 15. Cost Estimation (Monthly)

### MVP Phase
- **Hosting:** DigitalOcean Droplet 4GB - $24
- **Database:** Managed PostgreSQL - $15
- **CDN:** Cloudflare Free
- **Storage:** S3 (10GB) - $0.23
- **Email:** AWS SES (10K emails) - $1
- **SMS:** MSG91 (1K SMS) - $10
- **Domain + SSL:** $2
- **Total:** ~$52/month

### Scale Phase (10K users)
- **Hosting:** 2x Droplets (8GB) - $96
- **Database:** Managed PostgreSQL (4GB) - $60
- **Redis:** Managed Redis - $15
- **CDN:** Cloudflare Pro - $20
- **Storage:** S3 (100GB) - $2.3
- **Email:** SES (100K emails) - $10
- **SMS:** MSG91 (10K SMS) - $100
- **Payment gateway:** 2% transaction fee
- **Monitoring:** Sentry + New Relic - $50
- **Total:** ~$353/month + transaction fees

---

## 16. Key Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Payment gateway downtime | High | Implement fallback gateway (Stripe) |
| Logistics partner failure | Medium | Multi-partner integration, manual fallback |
| Vendor churn | High | Strong onboarding, analytics, support |
| Scalability issues | High | Load testing, horizontal scaling ready |
| Data breach | Critical | Security audit, encryption, compliance |
| Regulatory compliance | High | Legal review, GDPR/PCI-DSS compliance |

---

## 17. Success Metrics

### Launch (Month 1-3)
- 50+ vendors onboarded
- 1,000+ active subscriptions
- < 5% churn rate
- 4.0+ app rating

### Growth (Month 4-6)
- 200+ vendors
- 10,000+ active subscriptions
- $100K+ GMV
- Break-even on operations

### Scale (Month 7-12)
- 1,000+ vendors
- 100,000+ active subscriptions
- $1M+ GMV
- Profitable unit economics

---

## 18. Next Steps

1. **Week 1:** Finalize tech stack, setup development environment
2. **Week 1:** Design database schema, create migrations
3. **Week 2:** Implement auth system, basic API structure
4. **Week 2:** Setup frontend with routing, layouts
5. **Week 3:** Build subscription plan management
6. **Week 4:** Implement payment integration
7. **Week 5-6:** Category-specific models
8. **Week 7:** PWA implementation, testing
9. **Week 8:** Beta launch with 10 vendors

---

## 19. Technology Reuse from DevTools

**Can Reuse:**
- ✅ Auth system (JWT, user management)
- ✅ Frontend components (Shadcn UI, layouts)
- ✅ API structure (FastAPI patterns)
- ✅ Database abstraction layer
- ✅ Build configuration (CRACO, Docker)

**Need to Build:**
- ❌ Subscription lifecycle engine
- ❌ Payment gateway integration
- ❌ Delivery scheduling system
- ❌ Logistics partner integrations
- ❌ Category-specific models
- ❌ Vendor portal
- ❌ Analytics dashboard

---

## 20. Recommended Libraries

### Backend
```txt
fastapi==0.104.1
sqlalchemy==2.0.23
alembic==1.12.1
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
razorpay==1.4.1
stripe==7.4.0
celery==5.3.4
redis==5.0.1
python-multipart==0.0.6
jinja2==3.1.2
weasyprint==60.1
twilio==8.10.0
boto3==1.29.7
```

### Frontend
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "zustand": "^4.4.7",
  "@tanstack/react-query": "^5.8.4",
  "axios": "^1.6.2",
  "react-hook-form": "^7.48.2",
  "zod": "^3.22.4",
  "tailwindcss": "^3.3.5",
  "lucide-react": "^0.294.0",
  "recharts": "^2.10.3",
  "react-big-calendar": "^1.8.5",
  "workbox-webpack-plugin": "^7.0.0",
  "react-hot-toast": "^2.4.1"
}
```

---

**Document Version:** 1.0  
**Last Updated:** Nov 2024  
**Status:** Ready for Implementation
