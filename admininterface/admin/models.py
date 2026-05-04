from django.db import models
import uuid


def generate_uuid_str():
    return str(uuid.uuid4())


class User(models.Model):
    id = models.CharField(primary_key=True, max_length=36, db_column="user_id")
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True, null=True)
    role = models.CharField(max_length=32, default="student")
    first_name = models.CharField(max_length=150, blank=True, null=True, db_column="first_name")
    last_name = models.CharField(max_length=150, blank=True, null=True, db_column="last_name")
    profile_photo = models.CharField(max_length=255, blank=True, null=True, db_column="profile_photo")
    is_active = models.BooleanField(default=True, db_column="is_active")
    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")
    updated_at = models.DateTimeField(auto_now=True, db_column="updated_at")

    class Meta:
        db_table = "users"
        managed = False


class LandlordProfile(models.Model):
    id = models.CharField(primary_key=True, max_length=36, db_column="landlord_id")
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="landlord_profile", db_column="user_id")
    trust_score = models.IntegerField(default=0, db_column="trust_score")
    is_phone_verified = models.BooleanField(default=False, db_column="is_phone_verified")
    is_id_verified = models.BooleanField(default=False, db_column="is_id_verified")
    is_landlord_verified = models.BooleanField(default=False, db_column="is_landlord_verified")
    verification_status = models.CharField(max_length=32, default="pending", db_column="verification_status")
    organisation_name = models.CharField(max_length=255, blank=True, null=True, db_column="organisation_name")
    is_organisation = models.BooleanField(default=False, db_column="is_organisation")

    class Meta:
        db_table = "landlord_profiles"
        managed = False


class Listing(models.Model):
    id = models.CharField(primary_key=True, max_length=36, db_column="listing_id")
    landlord = models.ForeignKey(LandlordProfile, on_delete=models.CASCADE, related_name="listings", db_column="landlord_id")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    deposit = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    address = models.CharField(max_length=255)
    amenities = models.JSONField(default=list)
    bedroom_type = models.CharField(max_length=64, blank=True, null=True, db_column="bedroom_type")
    main_walking_minutes = models.IntegerField(blank=True, null=True, db_column="main_walking_min")
    chiromo_walking_minutes = models.IntegerField(blank=True, null=True, db_column="chiromo_walking_min")
    parklands_walking_minutes = models.IntegerField(blank=True, null=True, db_column="parklands_walking_min")
    status = models.CharField(max_length=32, default="draft")
    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")
    updated_at = models.DateTimeField(auto_now=True, db_column="updated_at")
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = "listings"
        managed = False


class ListingPhoto(models.Model):
    id = models.CharField(primary_key=True, max_length=36)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="photos", db_column="listing_id")
    photo_url = models.CharField(max_length=500, db_column="photo_url")
    is_primary = models.BooleanField(default=False, db_column="is_primary")
    display_order = models.IntegerField(default=0, db_column="display_order")
    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")

    class Meta:
        db_table = "listing_photos"
        managed = False


class FraudReport(models.Model):
    id = models.CharField(primary_key=True, max_length=36, db_column="report_id")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="fraud_reports", db_column="listing_id")
    reported_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="fraud_reports", db_column="reported_by")
    category = models.CharField(max_length=255)
    reason = models.TextField()
    evidence_urls = models.JSONField(default=list, db_column="evidence_urls")
    visited_property = models.BooleanField(default=False, db_column="visited_property")
    acknowledged = models.BooleanField(default=False)
    status = models.CharField(max_length=32, default="pending")
    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")

    class Meta:
        db_table = "fraud_reports"
        managed = False


class Payment(models.Model):
    id = models.CharField(primary_key=True, max_length=36, db_column="payment_id")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments", db_column="user_id")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="payments", db_column="listing_id", blank=True, null=True)
    purpose = models.CharField(max_length=64, db_column="purpose")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=32, default="PENDING")
    mpesa_phone = models.CharField(max_length=32, db_column="mpesa_phone")
    mpesa_reference = models.CharField(max_length=255, blank=True, null=True, unique=True, db_column="mpesa_reference")
    checkout_request_id = models.CharField(max_length=255, blank=True, null=True, unique=True, db_column="checkout_request_id")
    merchant_request_id = models.CharField(max_length=255, blank=True, null=True, unique=True, db_column="merchant_request_id")
    account_reference = models.CharField(max_length=255, blank=True, null=True, db_column="account_reference")
    transaction_desc = models.CharField(max_length=255, blank=True, null=True, db_column="transaction_desc")
    transaction_date_raw = models.CharField(max_length=255, blank=True, null=True, db_column="transaction_date_raw")
    result_code = models.IntegerField(blank=True, null=True, db_column="result_code")
    result_desc = models.CharField(max_length=255, blank=True, null=True, db_column="result_desc")
    callback_payload = models.JSONField(blank=True, null=True, db_column="callback_payload")
    initiated_at = models.DateTimeField(db_column="initiated_at")
    confirmed_at = models.DateTimeField(blank=True, null=True, db_column="confirmed_at")
    failed_at = models.DateTimeField(blank=True, null=True, db_column="failed_at")
    created_at = models.DateTimeField(db_column="created_at")
    updated_at = models.DateTimeField(db_column="updated_at")

    class Meta:
        db_table = "payments"
        managed = False


class AdminUser(models.Model):
    id = models.CharField(primary_key=True, max_length=36, default=generate_uuid_str, editable=False)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255, db_column="password_hash")
    is_active = models.BooleanField(default=True, db_column="is_active")
    last_login = models.DateTimeField(blank=True, null=True, db_column="last_login")
    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")

    class Meta:
        db_table = "admin_users"
