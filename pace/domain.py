"""
Pure business rules — no Flask, database, or network. Fully unit-testable.
These are the functions the Flask routes call to build local demo view models.
"""
from __future__ import annotations

from datetime import datetime, timezone


# ---- Rules -------------------------------------------------------------

def tier_for_limit(limit: float) -> int:
    if limit >= 15000:
        return 3
    if limit >= 5000:
        return 2
    return 1


def compute_limit(monthly_income: float) -> int:
    """
    Indicative limit = 20% of monthly income, rounded to nearest R100,
    capped at R25,000 for the sandbox demo.
    """
    raw = max(0.0, monthly_income) * 0.20
    return int(min(25_000, round(raw, -2)))


def tier_label(tier: int) -> str:
    return {1: "Tier 1 — Building", 2: "Tier 2 — Growing", 3: "Tier 3 — Established"}[tier]


# ---- View-model builders ----------------------------------------------

def build_dashboard(user: dict) -> dict:
    income = 8500
    limit = compute_limit(income)
    tier = tier_for_limit(limit)
    return {
        "user": {**user, "tier": tier},
        "funds": {"total_available": 2450.00, "own_funds": 2450.00},
        "credit": {
            "limit": limit,
            "available": round(limit * 0.60, 2),
            "tier": tier,
            "tier_label": tier_label(tier),
            "basis": "Based on your income and account activity",
        },
        "recent_activity": [
            {"type": "payment", "label": "Payment to Merchants", "amount": -350.00, "when": "Today, 10:24"},
            {"type": "repayment", "label": "Repayment", "amount": -200.00, "when": "Yesterday, 14:32"},
            {"type": "savings", "label": "Savings contribution", "amount": -150.00, "when": "12 Apr 2025"},
        ],
    }


def build_eligibility(user: dict, monthly_income: float = 8500) -> dict:
    limit = compute_limit(monthly_income)
    tier = tier_for_limit(limit)
    return {
        "monthly_income": monthly_income,
        "eligible": True,
        "limit": limit,
        "tier": tier,
        "tier_label": tier_label(tier),
        "reason": (
            "Based on your income and banking activity, you qualify for a "
            "credit limit of up to R{:,.0f}.".format(limit)
        ),
        "how_calculated": [
            "20% of verified monthly income",
            "Rounded to the nearest R100",
            "Capped at R25,000 in the sandbox",
        ],
    }


# ---- Insights (replaces Credit History page) --------------------------

_INSIGHTS_BY_TIER = {
    1: [
        {
            "title": "Build a 3-month track record",
            "body": "Consistent inflows for three months are the fastest way to move up a tier. Try to keep the same bank account active.",
            "cta": "Read the guide",
        },
        {
            "title": "Keep utilisation below 30%",
            "body": "Using less than 30% of your available limit signals healthy money management to future lenders.",
            "cta": "Mark as read",
        },
    ],
    2: [
        {
            "title": "You're on track for Tier 3",
            "body": "Two more on-time repayments and consistent savings will unlock the next tier.",
            "cta": "See how it's calculated",
        },
        {
            "title": "Set a small savings goal",
            "body": "A R1,000 emergency fund is the single biggest signal of financial stability.",
            "cta": "Create a goal",
        },
    ],
    3: [
        {
            "title": "You're ready for formal credit",
            "body": "Your activity is consistent. You can now apply to partner banks with a stronger profile.",
            "cta": "Learn more",
        },
    ],
}


def build_insights(user: dict) -> list[dict]:
    tier = user.get("tier", 2)
    tips = _INSIGHTS_BY_TIER.get(tier, _INSIGHTS_BY_TIER[2])
    now = datetime.now(timezone.utc).strftime("%B %Y")
    return [{"month": now, **tip} for tip in tips]


def build_monthly_report(user: dict) -> dict:
    """
    The 'credit report replacement' — a plain-English monthly summary of
    behaviour, not a bureau report. Explicitly labelled as indicative.
    """
    tier = user.get("tier", 2)
    return {
        "period": datetime.now(timezone.utc).strftime("%B %Y"),
        "summary": (
            "You had a steady month. Payments were on time, you saved every "
            "month, and your available credit stayed healthy."
        ),
        "metrics": [
            {"label": "On-time repayments", "value": "4 / 4", "status": "good"},
            {"label": "Savings contributions", "value": "R 150 / month", "status": "good"},
            {"label": "Credit utilisation", "value": "40%", "status": "warn"},
            {"label": "Account tenure", "value": "3 months", "status": "good"},
        ],
        "next_steps": [
            {
                "title": "Lower utilisation to 30%",
                "body": "Try keeping spend under 30% of your R-tier limit for the next cycle.",
            },
            {
                "title": "Keep your savings streak alive",
                "body": "Another two months of R150 contributions will upgrade your savings tier.",
            },
            {
                "title": f"Progress toward Tier {min(3, tier + 1)}",
                "body": "Consistency is the single biggest driver. No missed payments for 90 days.",
            },
        ],
        "disclaimer": (
            "Indicative only. This is a simulated monthly summary generated "
            "from sandbox data — it is not a credit bureau report and does "
            "not represent a credit offer."
        ),
    }