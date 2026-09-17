import hashlib
import hmac
import secrets
import string
import time
import base64
import json
from typing import Tuple, Optional, Dict, Any
from app.config import settings

SECRET_KEY = settings.AUTH_SECRET_KEY
HASH_ALGO = settings.PASSWORD_HASH_ALGORITHM
HASH_ITERATIONS = settings.PASSWORD_HASH_ITERATIONS
SALT_BYTES = settings.SALT_LENGTH

def hash_password(password: str) -> Tuple[str, str]:
    """
    Hashes a password with PBKDF2 using configurable algorithm,
    iterations, and cryptographically secure salt length.
    """
    salt = secrets.token_hex(SALT_BYTES)
    key = hashlib.pbkdf2_hmac(
        HASH_ALGO,
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations=HASH_ITERATIONS
    )
    return key.hex(), salt

def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    """Verifies a password against the stored hash and salt using constant-time comparison."""
    new_key = hashlib.pbkdf2_hmac(
        HASH_ALGO,
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations=HASH_ITERATIONS
    )
    return hmac.compare_digest(new_key.hex(), hashed_password)

def hash_otp(otp: str, salt: str) -> str:
    """Generates a PBKDF2 hash for a 6-digit OTP using a unique per-code salt."""
    return hashlib.pbkdf2_hmac(
        HASH_ALGO, otp.encode('utf-8'), salt.encode('utf-8'), iterations=HASH_ITERATIONS
    ).hex()

def create_otp_hash_record(otp: str) -> Tuple[str, str]:
    """
    Returns (full_stored_hash, raw_salt) where full_stored_hash is in the format 'salt$hash'.
    Guarantees raw OTP is NEVER stored in plaintext in the database.
    """
    salt = secrets.token_hex(8)
    hashed = hash_otp(otp, salt)
    return f"{salt}${hashed}", salt

def verify_otp_hash_record(plain_otp: str, stored_record: str) -> bool:
    """Safely verifies a candidate OTP against a 'salt$hash' stored record in constant time."""
    try:
        parts = stored_record.split("$", 1)
        if len(parts) != 2:
            return False
        salt, expected_hash = parts
        computed_hash = hash_otp(plain_otp.strip(), salt)
        return hmac.compare_digest(computed_hash, expected_hash)
    except Exception:
        return False

def calculate_audit_hash(event_payload: Dict[str, Any], previous_hash: Optional[str] = None) -> str:
    """
    Calculates SHA-256 hash for an audit log event linked to previous_hash,
    forming a verifiable cryptographic hash chain:
    Event(N) Hash = SHA256(Event(N) + previous_hash)
    """
    prev = previous_hash or "0" * 64
    serialized = json.dumps(event_payload, sort_keys=True, default=str)
    raw = f"{prev}:{serialized}".encode('utf-8')
    return hashlib.sha256(raw).hexdigest()

def calculate_file_sha256(file_bytes: bytes) -> str:
    """Generates SHA-256 checksum for evidence media integrity verification."""
    return hashlib.sha256(file_bytes).hexdigest()

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

def verify_session_token(token: str) -> Optional[dict]:
    """Verifies the session token and returns the payload if valid."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, signature):
            return None
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
        payload = json.loads(payload_bytes.decode('utf-8'))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None
