import hashlib
import hmac

from django.conf import settings
from django.contrib.auth.hashers import check_password as django_check_password, make_password


def make_admin_password(password: str) -> str:
    return make_password(password)


def verify_admin_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("pbkdf2_") or stored_hash.startswith("argon2$") or stored_hash.startswith("bcrypt$"):
        return django_check_password(password, stored_hash)

    return hmac.compare_digest(hashlib.sha256(password.encode("utf-8")).hexdigest(), stored_hash)
