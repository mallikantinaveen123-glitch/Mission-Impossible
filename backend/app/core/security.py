import hashlib
import hmac
import secrets
import string
import time
import base64
import json
from app.config import settings

SECRET_KEY = settings.AUTH_SECRET_KEY

def hash_password(password: str) -> tuple[str, str]:
    """Hashes a password with PBKDF2-HMAC-SHA256 and a random 16-byte salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations=100000
    )
    return key.hex(), salt

def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    """Verifies a password against the stored hash and salt using constant-time comparison."""
    new_key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations=100000
    )
    return hmac.compare_digest(new_key.hex(), hashed_password)

def hash_otp(otp: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        'sha256', otp.encode('utf-8'), salt.encode('utf-8'), iterations=100000
    ).hex()

def generate_otp(length: int = 6) -> str:
    """Generates a cryptographically secure numeric OTP."""
    digits = string.digits
    return "".join(secrets.choice(digits) for _ in range(length))

def generate_strong_password(length: int = 16, include_symbols: bool = True) -> str:
    """Generates a high-entropy password guaranteed to have lowercase, uppercase, digits, and symbols."""
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?" if include_symbols else ""

    chars = lowercase + uppercase + digits + symbols

    # Ensure at least one character from each class
    pwd = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
    ]
    if include_symbols:
        pwd.append(secrets.choice(symbols))

    remaining = length - len(pwd)
    pwd.extend(secrets.choice(chars) for _ in range(remaining))
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)

def create_session_token(user_id: int, role: str, email: str, expires_in_seconds: int = 86400 * 7) -> str:
    """Creates a tamper-proof HMAC-SHA256 signed session token."""
    payload = {
        "sub": user_id,
        "role": role,
        "email": email,
        "exp": int(time.time()) + expires_in_seconds,
        "iat": int(time.time())
    }
    payload_bytes = json.dumps(payload).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip("=")
    signature = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def verify_session_token(token: str) -> dict | None:
    """Verifies the session token and returns the payload if valid."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, signature):
            return None
        # Add padding back if necessary
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
        payload = json.loads(payload_bytes.decode('utf-8'))
        if payload.get("exp", 0) < int(time.time()):
            return None # Expired
        return payload
    except Exception:
        return None

