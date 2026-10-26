from __future__ import annotations

import hmac
import math
import os
import secrets
from importlib import import_module

from dotenv import load_dotenv
from flask import Flask, abort, jsonify, redirect, render_template, request, session, url_for
from httpx import HTTPError
from supabase import Client, create_client
from supabase._sync.client import SupabaseException

from pace.domain import (
    build_dashboard,
    build_eligibility,
    build_insights,
    build_monthly_report,
)


try:
    AuthApiError = import_module("supabase_auth.errors").AuthApiError
except ModuleNotFoundError as exc:
    if exc.name != "supabase_auth":
        raise
    AuthApiError = import_module("gotrue.errors").AuthApiError


load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY")
if not app.secret_key:
    if os.environ.get("VERCEL"):
        raise RuntimeError("FLASK_SECRET_KEY must be configured in Vercel")
    app.secret_key = secrets.token_urlsafe(32)
    app.logger.warning(
        "FLASK_SECRET_KEY is unset; sessions will be invalidated when the app restarts."
    )


def csrf_token() -> str:
    token = session.get("_csrf_token")
    if token is None:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return token


@app.context_processor
def inject_csrf_token():
    return {"csrf_token": csrf_token}


@app.before_request
def validate_csrf_token():
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None

    expected = session.get("_csrf_token", "")
    submitted = request.form.get("csrf_token") or request.headers.get("X-CSRFToken", "")
    if expected and submitted and hmac.compare_digest(expected, submitted):
        return None
    if request.path.startswith("/api/"):
        return jsonify(error="Invalid or missing CSRF token."), 400
    abort(400, description="Invalid or missing CSRF token.")


def _supabase_client() -> Client:
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
    if not supabase_url or not supabase_key:
        raise SupabaseException("Supabase authentication is not configured.")
    return create_client(supabase_url, supabase_key)


def _current_user() -> dict:
    name = session.get("user_name", "Pace user")
    dashboard_user = build_dashboard(
        {"name": name, "initials": session.get("user_initials", name[:1].upper())}
    )["user"]
    return dashboard_user


def _monthly_income() -> float:
    return session.get("monthly_income", 8500)


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/signin", methods=["GET", "POST"])
def signin_page():
    error = None
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        if not email or not password:
            error = "Enter your email address and password."
        else:
            try:
                response = _supabase_client().auth.sign_in_with_password(
                    {"email": email, "password": password}
                )
            except SupabaseException as exc:
                app.logger.error("Supabase sign-in is unavailable (%s).", type(exc).__name__)
                error = "Sign-in is temporarily unavailable. Please try again later."
            except (AuthApiError, HTTPError) as exc:
                app.logger.warning("Supabase sign-in failed (%s).", type(exc).__name__)
                error = "Unable to sign in with those credentials."
            else:
                user = response.user
                if user is None:
                    error = "Unable to sign in with those credentials."
                else:
                    metadata = user.user_metadata or {}
                    name = metadata.get("full_name") or metadata.get("name")
                    if not name:
                        name = (user.email or email).split("@", 1)[0]
                    session.clear()
                    session["user_name"] = name
                    session["user_initials"] = name[:1].upper()
                    return redirect(url_for("dashboard_page"))

    return render_template("signin.html", error=error)


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/dashboard", methods=["GET"])
def dashboard_page():
    return render_template("dashboard.html")


@app.route("/eligibility", methods=["GET"])
def eligibility_page():
    eligibility = build_eligibility(_current_user(), _monthly_income())
    return render_template("eligibility.html", eligibility=eligibility)


@app.route("/insights", methods=["GET"])
def insights_page():
    user = _current_user()
    return render_template(
        "insights.html",
        insights=build_insights(user),
        report=build_monthly_report(user),
    )


@app.route("/credit-guide", methods=["GET"])
def credit_guide_page():
    return render_template("credit_guide.html")


@app.route("/api/dashboard", methods=["GET"])
def api_dashboard():
    return jsonify(build_dashboard(_current_user()))


@app.route("/api/eligibility", methods=["GET"])
def api_eligibility_get():
    return jsonify(build_eligibility(_current_user(), _monthly_income()))


@app.route("/api/eligibility", methods=["POST"])
def api_eligibility_post():
    data = request.get_json(silent=True)
    income = data.get("monthly_income") if isinstance(data, dict) else None
    if (
        isinstance(income, bool)
        or not isinstance(income, (int, float))
    ):
        return jsonify(error="monthly_income must be a finite, non-negative number."), 400

    try:
        monthly_income = float(income)
    except OverflowError:
        return jsonify(error="monthly_income must be a finite, non-negative number."), 400
    if not math.isfinite(monthly_income) or monthly_income < 0:
        return jsonify(error="monthly_income must be a finite, non-negative number."), 400

    session["monthly_income"] = monthly_income
    return jsonify(build_eligibility(_current_user(), monthly_income))


@app.route("/api/insights", methods=["GET"])
def api_insights():
    user = _current_user()
    return jsonify(
        insights=build_insights(user),
        report=build_monthly_report(user),
    )


if __name__ == "__main__":
    app.run(debug=True)
