import os

from django.contrib import messages
from django.contrib.auth.hashers import check_password, make_password
from django.db.models import Count, Q, Sum, Avg, Max
from django.http import HttpRequest, HttpResponseForbidden
from django.shortcuts import redirect, render, get_object_or_404
from django.utils import timezone

from .forms import AdminSignInForm, AdminSignUpForm
from .models import AdminUser, FraudReport, LandlordProfile, Listing, Payment, User


NEXT_APP_BASE_URL = os.environ.get("NEXT_APP_BASE_URL", "http://127.0.0.1:3000").rstrip("/")


def current_admin(request: HttpRequest):
    admin_id = request.session.get("admin_id")
    if not admin_id:
        return None
    return AdminUser.objects.filter(pk=admin_id, is_active=True).first()


def require_admin(request: HttpRequest):
    admin = current_admin(request)
    if admin is None:
        return redirect("admin_sign_in")
    return admin


def sign_in(request: HttpRequest):
    if current_admin(request):
        return redirect("admin_dashboard")

    form = AdminSignInForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        identifier = form.cleaned_data["identifier"].strip()
        password = form.cleaned_data["password"]

        admin = AdminUser.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier),
            is_active=True,
        ).first()

        if admin and check_password(password, admin.password_hash):
            request.session["admin_id"] = str(admin.id)
            admin.last_login = timezone.now()
            admin.save(update_fields=["last_login"])
            messages.success(request, "Signed in successfully")
            return redirect("admin_dashboard")

        form.add_error(None, "Invalid credentials or inactive admin account.")

    return render(request, "admin/sign_in.html", {"form": form})


def sign_up(request: HttpRequest):
    if current_admin(request):
        return redirect("admin_dashboard")

    form = AdminSignUpForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        username = form.cleaned_data["username"].strip()
        email = form.cleaned_data["email"].strip().lower()
        password = form.cleaned_data["password"]

        if AdminUser.objects.filter(Q(username__iexact=username) | Q(email__iexact=email)).exists():
            form.add_error(None, "An admin account with that username or email already exists.")
        else:
            admin = AdminUser.objects.create(
                username=username,
                email=email,
                password_hash=make_password(password),
            )
            request.session["admin_id"] = str(admin.id)
            messages.success(request, "Account created")
            return redirect("admin_dashboard")

    return render(request, "admin/sign_up.html", {"form": form})


def logout_view(request: HttpRequest):
    request.session.flush()
    return redirect("admin_sign_in")


def dashboard(request: HttpRequest):
    admin = require_admin(request)
    if isinstance(admin, str) or hasattr(admin, "url"):
        return admin

    active_tab = request.GET.get("tab", "dashboard")
    search_email = request.GET.get("email", "").strip()

    open_reports_count = FraudReport.objects.filter(status__in=["pending", "open", "under_review"]).count()

    raw_reports = (
        FraudReport.objects.select_related("listing", "reported_by", "listing__landlord", "listing__landlord__user")
        .prefetch_related("listing__photos")
        .order_by("-created_at")[:10]
    )

    fraud_reports = []
    for report in raw_reports:
        reporter = report.reported_by
        listing = report.listing
        photo_urls = list(listing.photos.order_by("display_order").values_list("photo_url", flat=True))
        evidence_urls = [normalize_asset_url(url) for url in (report.evidence_urls or []) if isinstance(url, str)]
        report_data = {
            "id": report.id,
            "category": report.category,
            "reason": report.reason,
            "status": report.status,
            "visitedProperty": report.visited_property,
            "acknowledged": report.acknowledged,
            "createdAt": report.created_at.isoformat(),
            "evidenceUrls": evidence_urls,
            "listing": {
                "id": listing.id,
                "title": listing.title,
                "address": listing.address,
                "price": float(listing.price),
                "status": listing.status,
                "photoUrl": photo_urls[0] if photo_urls else None,
                "photos": photo_urls,
                    "landlord": {
                        "id": listing.landlord.id,
                        "name": format_user_name(listing.landlord.user.first_name, listing.landlord.user.last_name, listing.landlord.user.username),
                        "email": listing.landlord.user.email,
                        "username": listing.landlord.user.username,
                        "phone": listing.landlord.user.phone,
                        "verified": listing.landlord.is_landlord_verified,
                    },
                },
            "reporter": {
                "id": reporter.id,
                "name": format_user_name(reporter.first_name, reporter.last_name, reporter.username),
                "username": reporter.username,
                "email": reporter.email,
                "phone": reporter.phone,
            },
        }
        fraud_reports.append(report_data)

    landlords = (
        LandlordProfile.objects.select_related("user")
        .prefetch_related("listings", "listings__photos")
        .annotate(listing_count=Count("listings"))
        .order_by("-user__created_at")
    )

    if search_email:
        landlords = landlords.filter(user__email__icontains=search_email)

    landlord_search_data = []
    for item in landlords:
        landlord_search_data.append(
            {
                "id": item.id,
                "userId": item.user_id,
                "name": format_user_name(item.user.first_name, item.user.last_name, item.user.username),
                "username": item.user.username,
                "email": item.user.email,
                "phone": item.user.phone,
                "verified": item.is_landlord_verified,
                "listings": [
                    {
                        "id": listing.id,
                        "title": listing.title,
                        "address": listing.address,
                        "price": float(listing.price),
                        "status": listing.status,
                    }
                    for listing in item.listings.all().order_by("-created_at")
                ],
            }
        )

    payment_rows = []
    payments = (
        Payment.objects.select_related("user", "listing", "listing__landlord", "listing__landlord__user")
        .order_by("-created_at")[:50]
    )
    for payment in payments:
        payment_rows.append(
            {
                "id": payment.id,
                "amount": float(payment.amount),
                "purpose": payment.purpose,
                "status": payment.status,
                "mpesaPhone": payment.mpesa_phone,
                "mpesaReference": payment.mpesa_reference,
                "checkoutRequestId": payment.checkout_request_id,
                "merchantRequestId": payment.merchant_request_id,
                "accountReference": payment.account_reference,
                "transactionDesc": payment.transaction_desc,
                "transactionDateRaw": payment.transaction_date_raw,
                "resultCode": payment.result_code,
                "resultDesc": payment.result_desc,
                "createdAt": payment.created_at.isoformat() if payment.created_at else None,
                "initiatedAt": payment.initiated_at.isoformat() if payment.initiated_at else None,
                "confirmedAt": payment.confirmed_at.isoformat() if payment.confirmed_at else None,
                "failedAt": payment.failed_at.isoformat() if payment.failed_at else None,
                "user": {
                    "name": format_user_name(payment.user.first_name, payment.user.last_name, payment.user.username),
                    "email": payment.user.email,
                    "username": payment.user.username,
                    "phone": payment.user.phone,
                },
                "listing": {
                    "title": payment.listing.title if payment.listing else None,
                    "address": payment.listing.address if payment.listing else None,
                    "status": payment.listing.status if payment.listing else None,
                    "landlord": format_user_name(
                        payment.listing.landlord.user.first_name,
                        payment.listing.landlord.user.last_name,
                        payment.listing.landlord.user.username,
                    ) if payment.listing else None,
                },
            }
        )

    summary_cards = [
        {"value": User.objects.count(), "label": "Total Users", "sublabel": "+8 this week", "tone": "text-slate-900"},
        {"value": Listing.objects.filter(status__in=["active", "published"]).count(), "label": "Active Listings", "sublabel": "+5 today", "tone": "text-slate-900"},
        {"value": open_reports_count, "label": "Open Reports", "sublabel": "Needs action", "tone": "text-red-500"},
        {"value": LandlordProfile.objects.count(), "label": "Landlords", "sublabel": "Managed accounts", "tone": "text-slate-900"},
    ]

    listing_status_breakdown = list(
        Listing.objects.values("status").annotate(count=Count("id")).order_by("status")
    )
    report_status_breakdown = list(
        FraudReport.objects.values("status").annotate(count=Count("id")).order_by("status")
    )
    payment_status_breakdown = list(
        Payment.objects.values("status").annotate(count=Count("id")).order_by("status")
    )
    total_listings = Listing.objects.count()
    inactive_listings = Listing.objects.filter(status="inactive").count()
    total_listings_value = Listing.objects.aggregate(total=Sum("price"))["total"] or 0
    average_listing_price = Listing.objects.aggregate(avg=Avg("price"))["avg"] or 0
    latest_listing = Listing.objects.order_by("-created_at").select_related("landlord", "landlord__user").first()
    top_landlords = (
        LandlordProfile.objects.select_related("user")
        .annotate(listing_count=Count("listings"))
        .order_by("-listing_count", "-trust_score")[:5]
    )
    top_landlord_rows = [
        {
            "name": format_user_name(item.user.first_name, item.user.last_name, item.user.username),
            "email": item.user.email,
            "count": item.listing_count,
        }
        for item in top_landlords
    ]

    payments_summary = {
        "total": Payment.objects.count(),
        "successful": Payment.objects.filter(status__iexact="SUCCESS").count(),
        "pending": Payment.objects.filter(status__in=["PENDING", "PROCESSING"]).count(),
        "failed": Payment.objects.filter(status__in=["FAILED", "CANCELLED"]).count(),
        "amount_total": Payment.objects.aggregate(total=Sum("amount"))["total"] or 0,
    }

    revenue_by_purpose = list(
        Payment.objects.values("purpose").annotate(total=Sum("amount"), count=Count("id")).order_by("purpose")
    )

    return render(
        request,
        "admin/dashboard.html",
        {
            "admin": admin,
            "full_name": admin.username,
            "email": admin.email,
            "initials": admin.username[:2].upper(),
            "active_tab": active_tab,
            "search_email": search_email,
            "open_reports_count": open_reports_count,
            "fraud_reports": fraud_reports,
            "landlord_search_data": landlord_search_data,
            "summary_cards": summary_cards,
            "listing_status_breakdown": listing_status_breakdown,
            "report_status_breakdown": report_status_breakdown,
            "payment_status_breakdown": payment_status_breakdown,
            "total_listings": total_listings,
            "inactive_listings": inactive_listings,
            "active_listings": total_listings - inactive_listings,
            "total_listings_value": total_listings_value,
            "average_listing_price": average_listing_price,
            "latest_listing": latest_listing,
            "top_landlord_rows": top_landlord_rows,
            "revenue_by_purpose": revenue_by_purpose,
            "payments_summary": payments_summary,
            "payment_rows": payment_rows,
            "today_label": timezone.localdate().strftime("%A, %d %b %Y"),
        },
    )


def moderate_fraud_report(request: HttpRequest, report_id: str):
    admin = require_admin(request)
    if isinstance(admin, str) or hasattr(admin, "url"):
        return admin

    if request.method != "POST":
        return HttpResponseForbidden("POST required")

    report = get_object_or_404(
        FraudReport.objects.select_related("listing", "listing__landlord", "listing__landlord__user", "reported_by"),
        pk=report_id,
    )
    action = request.POST.get("action", "")

    if action == "suspend-listing":
        report.listing.status = "inactive"
        report.listing.save(update_fields=["status"])
        report.delete()
        messages.success(request, "Listing suspended.")
    elif action == "reject-report":
        report.delete()
        messages.success(request, "Report rejected.")
    else:
        messages.error(request, "Invalid action.")

    return redirect("admin_dashboard")


def suspend_listing(request: HttpRequest, listing_id: str):
    admin = require_admin(request)
    if isinstance(admin, str) or hasattr(admin, "url"):
        return admin

    if request.method != "POST":
        return HttpResponseForbidden("POST required")

    listing = get_object_or_404(Listing, pk=listing_id)
    listing.status = "inactive"
    listing.save(update_fields=["status"])
    messages.success(request, "Listing suspended.")
    return redirect("admin_dashboard")


def toggle_listing_status(request: HttpRequest, listing_id: str):
    admin = require_admin(request)
    if isinstance(admin, str) or hasattr(admin, "url"):
        return admin

    if request.method != "POST":
        return HttpResponseForbidden("POST required")

    listing = get_object_or_404(Listing, pk=listing_id)
    listing.status = "active" if listing.status == "inactive" else "inactive"
    listing.save(update_fields=["status"])
    messages.success(request, f"Listing marked as {listing.status}.")
    return redirect("admin_dashboard")


def delete_listing(request: HttpRequest, listing_id: str):
    admin = require_admin(request)
    if isinstance(admin, str) or hasattr(admin, "url"):
        return admin

    if request.method != "POST":
        return HttpResponseForbidden("POST required")

    listing = get_object_or_404(Listing, pk=listing_id)
    listing.delete()
    messages.success(request, "Property deleted.")
    return redirect("admin_dashboard")


def format_user_name(first_name, last_name, username):
    return f"{first_name or ''} {last_name or ''}".strip() or username or "Unknown"


def normalize_asset_url(url: str) -> str:
    if url.startswith(("http://", "https://")):
        return url
    if not url.startswith("/"):
        url = f"/{url}"
    return f"{NEXT_APP_BASE_URL}{url}"
