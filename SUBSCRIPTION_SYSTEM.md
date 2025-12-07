# Osprey Subscription System - Implementation Guide

## Overview

Transform Osprey into a paid SaaS with subscription tiers, payment processing, and usage limits.

---

## Recommended Subscription Tiers

### Free Tier
- **Price:** $0/month
- **Features:**
  - 5 sessions per month
  - Basic analytics
  - 30-day data retention
  - Community support
- **Target:** Casual pilots, trying out the service

### Pilot Tier
- **Price:** $9/month or $90/year (save $18)
- **Features:**
  - Unlimited sessions
  - Advanced analytics
  - Unlimited data retention
  - Thermal analysis
  - Email support
- **Target:** Regular pilots, hobbyists

### Club Tier
- **Price:** $49/month or $490/year (save $98)
- **Features:**
  - Everything in Pilot
  - Up to 25 users
  - Shared club analytics
  - Club leaderboards
  - Priority support
  - Custom branding
- **Target:** Flying clubs, small organizations

### Pro Tier
- **Price:** $149/month or $1,490/year (save $298)
- **Features:**
  - Everything in Club
  - Unlimited users
  - API access
  - White-label option
  - Dedicated support
  - Custom integrations
- **Target:** Large clubs, commercial operations

---

## Technical Implementation

### Phase 1: Database Schema (2-3 hours)

#### New Models

**1. Subscription Plans**
```python
# backend/models.py

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(String, primary_key=True)  # "free", "pilot", "club", "pro"
    name = Column(String, nullable=False)
    price_monthly = Column(Float, nullable=False)
    price_yearly = Column(Float, nullable=False)
    features = Column(JSON)  # List of features
    limits = Column(JSON)  # Usage limits
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True))
    
    subscriptions = relationship("Subscription", back_populates="plan")
```

**2. User Subscriptions**
```python
class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    plan_id = Column(String, ForeignKey("subscription_plans.id"))
    status = Column(String)  # "active", "canceled", "past_due", "trialing"
    billing_cycle = Column(String)  # "monthly", "yearly"
    
    # Stripe integration
    stripe_customer_id = Column(String, unique=True, index=True)
    stripe_subscription_id = Column(String, unique=True, index=True)
    
    # Dates
    current_period_start = Column(DateTime(timezone=True))
    current_period_end = Column(DateTime(timezone=True))
    trial_end = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="subscription")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    usage = relationship("UsageTracking", back_populates="subscription")

# Update User model
class User(Base):
    # ... existing fields ...
    subscription = relationship("Subscription", back_populates="user", uselist=False)
```

**3. Usage Tracking**
```python
class UsageTracking(Base):
    __tablename__ = "usage_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    user_id = Column(String, ForeignKey("users.id"))
    
    # Usage metrics
    sessions_uploaded = Column(Integer, default=0)
    storage_used_mb = Column(Float, default=0)
    api_calls = Column(Integer, default=0)
    
    # Period tracking
    period_start = Column(DateTime(timezone=True))
    period_end = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True))
    
    subscription = relationship("Subscription", back_populates="usage")
```

**4. Payment History**
```python
class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    
    amount = Column(Float)
    currency = Column(String, default="USD")
    status = Column(String)  # "succeeded", "failed", "pending", "refunded"
    
    stripe_payment_intent_id = Column(String, unique=True)
    stripe_invoice_id = Column(String)
    
    created_at = Column(DateTime(timezone=True))
    
    user = relationship("User")
    subscription = relationship("Subscription")
```

#### Migration

```bash
cd backend
alembic revision --autogenerate -m "Add subscription system"
alembic upgrade head
```

---

### Phase 2: Payment Integration - Stripe (4-6 hours)

#### Why Stripe?
- Industry standard for SaaS
- Handles PCI compliance
- Built-in subscription management
- Automatic invoicing
- Supports trials, coupons, metered billing
- Excellent documentation

#### Setup

**1. Install Stripe**
```bash
pip install stripe
```

**2. Environment Variables**
```bash
# backend/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**3. Create Stripe Service**
```python
# backend/stripe_service.py

import stripe
import os
from datetime import datetime, timedelta

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class StripeService:
    
    @staticmethod
    def create_customer(email: str, name: str, user_id: str):
        """Create Stripe customer"""
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={"user_id": user_id}
        )
        return customer.id
    
    @staticmethod
    def create_subscription(customer_id: str, price_id: str, trial_days: int = 14):
        """Create subscription with trial"""
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            trial_period_days=trial_days,
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"]
        )
        return subscription
    
    @staticmethod
    def cancel_subscription(subscription_id: str, at_period_end: bool = True):
        """Cancel subscription"""
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=at_period_end
        )
        return subscription
    
    @staticmethod
    def update_subscription(subscription_id: str, new_price_id: str):
        """Upgrade/downgrade subscription"""
        subscription = stripe.Subscription.retrieve(subscription_id)
        stripe.Subscription.modify(
            subscription_id,
            items=[{
                "id": subscription["items"]["data"][0].id,
                "price": new_price_id,
            }],
            proration_behavior="create_prorations"
        )
        return subscription
    
    @staticmethod
    def create_checkout_session(customer_id: str, price_id: str, success_url: str, cancel_url: str):
        """Create Stripe Checkout session"""
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            subscription_data={"trial_period_days": 14}
        )
        return session
    
    @staticmethod
    def create_portal_session(customer_id: str, return_url: str):
        """Create customer portal session for managing subscription"""
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url
        )
        return session
```

**4. Backend API Endpoints**
```python
# backend/main.py

from stripe_service import StripeService
import stripe

# Create subscription
@app.post("/api/subscriptions/create-checkout")
async def create_checkout_session(
    plan_id: str,
    billing_cycle: str,  # "monthly" or "yearly"
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create Stripe Checkout session"""
    
    # Get or create Stripe customer
    subscription = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).first()
    
    if not subscription or not subscription.stripe_customer_id:
        customer_id = StripeService.create_customer(
            email=current_user.email,
            name=f"{current_user.first_name} {current_user.last_name}",
            user_id=current_user.id
        )
    else:
        customer_id = subscription.stripe_customer_id
    
    # Get price ID from plan
    plan = db.query(models.SubscriptionPlan).filter(
        models.SubscriptionPlan.id == plan_id
    ).first()
    
    # In production, store Stripe price IDs in database
    price_id = plan.stripe_price_id_monthly if billing_cycle == "monthly" else plan.stripe_price_id_yearly
    
    # Create checkout session
    session = StripeService.create_checkout_session(
        customer_id=customer_id,
        price_id=price_id,
        success_url=f"{os.getenv('FRONTEND_URL')}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{os.getenv('FRONTEND_URL')}/subscription/canceled"
    )
    
    return {"checkout_url": session.url}

# Get current subscription
@app.get("/api/subscriptions/current")
async def get_current_subscription(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's current subscription"""
    subscription = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        # Return free tier
        return {
            "plan": "free",
            "status": "active",
            "features": ["5 sessions/month", "Basic analytics"]
        }
    
    return subscription

# Cancel subscription
@app.post("/api/subscriptions/cancel")
async def cancel_subscription(
    at_period_end: bool = True,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel user's subscription"""
    subscription = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    StripeService.cancel_subscription(
        subscription.stripe_subscription_id,
        at_period_end=at_period_end
    )
    
    if not at_period_end:
        subscription.status = "canceled"
        subscription.canceled_at = datetime.now()
    
    db.commit()
    return {"message": "Subscription canceled"}

# Customer portal
@app.post("/api/subscriptions/portal")
async def create_portal_session(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create Stripe customer portal session"""
    subscription = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).first()
    
    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    session = StripeService.create_portal_session(
        customer_id=subscription.stripe_customer_id,
        return_url=f"{os.getenv('FRONTEND_URL')}/settings"
    )
    
    return {"portal_url": session.url}

# Stripe webhooks
@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhooks"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle different event types
    if event["type"] == "customer.subscription.created":
        handle_subscription_created(event["data"]["object"], db)
    elif event["type"] == "customer.subscription.updated":
        handle_subscription_updated(event["data"]["object"], db)
    elif event["type"] == "customer.subscription.deleted":
        handle_subscription_deleted(event["data"]["object"], db)
    elif event["type"] == "invoice.payment_succeeded":
        handle_payment_succeeded(event["data"]["object"], db)
    elif event["type"] == "invoice.payment_failed":
        handle_payment_failed(event["data"]["object"], db)
    
    return {"status": "success"}

def handle_subscription_created(subscription_data, db):
    """Handle new subscription"""
    customer_id = subscription_data["customer"]
    
    # Find user by Stripe customer ID
    subscription = db.query(models.Subscription).filter(
        models.Subscription.stripe_customer_id == customer_id
    ).first()
    
    if not subscription:
        # Create new subscription record
        subscription = models.Subscription(
            user_id=subscription_data["metadata"]["user_id"],
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_data["id"],
            status=subscription_data["status"],
            current_period_start=datetime.fromtimestamp(subscription_data["current_period_start"]),
            current_period_end=datetime.fromtimestamp(subscription_data["current_period_end"]),
            created_at=datetime.now()
        )
        db.add(subscription)
    else:
        subscription.stripe_subscription_id = subscription_data["id"]
        subscription.status = subscription_data["status"]
    
    db.commit()

# Similar handlers for other webhook events...
```

---

### Phase 3: Usage Limits & Enforcement (3-4 hours)

**1. Usage Middleware**
```python
# backend/usage_limits.py

from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import models

class UsageLimits:
    
    PLAN_LIMITS = {
        "free": {
            "sessions_per_month": 5,
            "storage_mb": 100,
            "api_calls_per_day": 100
        },
        "pilot": {
            "sessions_per_month": -1,  # Unlimited
            "storage_mb": 5000,
            "api_calls_per_day": 1000
        },
        "club": {
            "sessions_per_month": -1,
            "storage_mb": 50000,
            "api_calls_per_day": 10000
        },
        "pro": {
            "sessions_per_month": -1,
            "storage_mb": -1,  # Unlimited
            "api_calls_per_day": -1
        }
    }
    
    @staticmethod
    def check_session_limit(user: models.User, db: Session):
        """Check if user can upload more sessions"""
        subscription = db.query(models.Subscription).filter(
            models.Subscription.user_id == user.id
        ).first()
        
        plan_id = subscription.plan_id if subscription else "free"
        limit = UsageLimits.PLAN_LIMITS[plan_id]["sessions_per_month"]
        
        if limit == -1:  # Unlimited
            return True
        
        # Count sessions this month
        from sqlalchemy import func, extract
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        session_count = db.query(func.count(models.FlightSession.id)).filter(
            models.FlightSession.user_id == user.id,
            extract('month', models.FlightSession.start_time) == current_month,
            extract('year', models.FlightSession.start_time) == current_year
        ).scalar()
        
        if session_count >= limit:
            raise HTTPException(
                status_code=403,
                detail=f"Monthly session limit reached ({limit}). Upgrade to upload more."
            )
        
        return True

# Use in upload endpoint
@app.post("/api/upload")
async def upload_tlm_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check usage limits
    UsageLimits.check_session_limit(current_user, db)
    
    # ... rest of upload logic ...
```

---

### Phase 4: Frontend Implementation (6-8 hours)

**1. Pricing Page**
```jsx
// frontend/src/components/Pricing.jsx

import { useState } from 'react';
import { Check } from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    features: [
      '5 sessions per month',
      'Basic analytics',
      '30-day data retention',
      'Community support'
    ]
  },
  {
    id: 'pilot',
    name: 'Pilot',
    price: { monthly: 9, yearly: 90 },
    popular: true,
    features: [
      'Unlimited sessions',
      'Advanced analytics',
      'Unlimited data retention',
      'Thermal analysis',
      'Email support'
    ]
  },
  {
    id: 'club',
    name: 'Club',
    price: { monthly: 49, yearly: 490 },
    features: [
      'Everything in Pilot',
      'Up to 25 users',
      'Shared club analytics',
      'Club leaderboards',
      'Priority support',
      'Custom branding'
    ]
  }
];

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  const handleSubscribe = async (planId) => {
    const response = await fetch(`${API_URL}/api/subscriptions/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`
      },
      body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle })
    });
    
    const data = await response.json();
    window.location.href = data.checkout_url;
  };
  
  return (
    <div className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Choose Your Plan</h2>
        <div className="mt-4">
          <button onClick={() => setBillingCycle('monthly')}>Monthly</button>
          <button onClick={() => setBillingCycle('yearly')}>Yearly (Save 17%)</button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map(plan => (
          <div key={plan.id} className={`border rounded-lg p-6 ${plan.popular ? 'border-blue-500' : ''}`}>
            {plan.popular && <span className="text-blue-500">Most Popular</span>}
            <h3 className="text-2xl font-bold">{plan.name}</h3>
            <div className="text-4xl font-bold my-4">
              ${plan.price[billingCycle]}
              <span className="text-sm">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map(feature => (
                <li key={feature} className="flex items-center">
                  <Check size={20} className="text-green-500 mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.id)}
              className="w-full bg-blue-500 text-white py-2 rounded"
            >
              {plan.id === 'free' ? 'Current Plan' : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**2. Subscription Management**
```jsx
// frontend/src/components/SubscriptionManagement.jsx

export default function SubscriptionManagement() {
  const [subscription, setSubscription] = useState(null);
  
  useEffect(() => {
    fetchSubscription();
  }, []);
  
  const fetchSubscription = async () => {
    const response = await fetch(`${API_URL}/api/subscriptions/current`, {
      headers: { 'Authorization': `Bearer ${getAccessToken()}` }
    });
    const data = await response.json();
    setSubscription(data);
  };
  
  const openCustomerPortal = async () => {
    const response = await fetch(`${API_URL}/api/subscriptions/portal`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getAccessToken()}` }
    });
    const data = await response.json();
    window.location.href = data.portal_url;
  };
  
  return (
    <div>
      <h2>Your Subscription</h2>
      <p>Plan: {subscription?.plan}</p>
      <p>Status: {subscription?.status}</p>
      <button onClick={openCustomerPortal}>
        Manage Subscription
      </button>
    </div>
  );
}
```

---

### Phase 5: Testing & Launch (4-6 hours)

**Testing Checklist:**
- [ ] User can view pricing page
- [ ] User can subscribe to paid plan
- [ ] Stripe Checkout works
- [ ] Subscription is created in database
- [ ] Usage limits are enforced
- [ ] User can manage subscription via portal
- [ ] User can cancel subscription
- [ ] Webhooks update subscription status
- [ ] Trial period works correctly
- [ ] Upgrade/downgrade works
- [ ] Invoices are sent
- [ ] Payment failures are handled

---

## Cost Analysis

### Revenue Projections (1,000 Users)

**Conservative (10% paid conversion):**
- 900 Free users: $0
- 80 Pilot ($9/mo): $720/mo
- 15 Club ($49/mo): $735/mo
- 5 Pro ($149/mo): $745/mo
- **Total: $2,200/month** ($26,400/year)

**Moderate (20% paid conversion):**
- 800 Free users: $0
- 160 Pilot: $1,440/mo
- 30 Club: $1,470/mo
- 10 Pro: $1,490/mo
- **Total: $4,400/month** ($52,800/year)

**Optimistic (30% paid conversion):**
- 700 Free users: $0
- 240 Pilot: $2,160/mo
- 45 Club: $2,205/mo
- 15 Pro: $2,235/mo
- **Total: $6,600/month** ($79,200/year)

### Costs

**Hosting (DigitalOcean):** $33/month
**Stripe Fees:** 2.9% + $0.30 per transaction
**Email Service:** $15/month (SendGrid)
**Domain/SSL:** $2/month
**Total Fixed Costs:** ~$50/month

**Net Profit (Conservative):** $2,150/month ($25,800/year)
**Net Profit (Moderate):** $4,350/month ($52,200/year)
**Net Profit (Optimistic):** $6,550/month ($78,600/year)

---

## Implementation Timeline

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Authentication system | 16-23 hrs | Critical |
| 2 | Database schema | 2-3 hrs | Critical |
| 3 | Stripe integration | 4-6 hrs | Critical |
| 4 | Usage limits | 3-4 hrs | High |
| 5 | Frontend pricing page | 3-4 hrs | High |
| 6 | Subscription management | 3-4 hrs | High |
| 7 | Webhooks | 2-3 hrs | High |
| 8 | Testing | 4-6 hrs | Critical |
| 9 | Documentation | 2-3 hrs | Medium |
| **Total** | | **39-56 hours** | |

**Realistic Timeline:** 2-3 weeks part-time, 1 week full-time

---

## Next Steps

1. **Implement authentication first** (see AUTHENTICATION_TODO.md)
2. **Set up Stripe account** (test mode initially)
3. **Create subscription database schema**
4. **Build backend API endpoints**
5. **Create pricing page**
6. **Test with Stripe test cards**
7. **Launch with free tier + one paid tier**
8. **Iterate based on user feedback**

---

## Questions to Answer

- [ ] What features should be in each tier?
- [ ] Should you offer a free trial?
- [ ] Annual discount percentage?
- [ ] Refund policy?
- [ ] How to handle downgrades?
- [ ] Grace period for failed payments?
- [ ] Student/nonprofit discounts?

---

**Ready to build a profitable SaaS!** 🚀

Start with authentication, then add Stripe. You can launch with just Free + Pilot tiers and add more later.
