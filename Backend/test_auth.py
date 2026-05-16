import subprocess
import json
import time
import sys

BASE = "http://localhost:5001"
COOKIE = "/tmp/auth_cookies.txt"
TS = str(int(time.time()))
TOKEN = ""
PASS = 0
FAIL = 0

# Clear cookie file at start
import os
try:
    os.remove(COOKIE)
except FileNotFoundError:
    pass


def call(method, path, body=None, use_cookie=True, auth=None):
    """Make an HTTP request and return (status_code, response_dict)."""
    cmd = ["curl", "-s", "--max-time", "6"]
    if use_cookie:
        cmd += ["-c", COOKIE, "-b", COOKIE]
    if auth:
        cmd += ["-H", "Authorization: Bearer " + auth]
    cmd += ["-X", method, BASE + path, "-H", "Content-Type: application/json"]
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    cmd += ["-w", "\n__STATUS__%{http_code}"]

    result = subprocess.run(cmd, capture_output=True, text=True)
    raw = result.stdout

    if "__STATUS__" not in raw:
        return 0, {}

    body_str, code_str = raw.rsplit("__STATUS__", 1)
    code = int(code_str.strip()) if code_str.strip().isdigit() else 0

    if code == 0:
        print("  [CRASH] Server not responding — stopping tests.")
        sys.exit(1)

    try:
        data = json.loads(body_str.strip())
    except Exception:
        data = {"raw": body_str.strip()[:80]}

    return code, data


def check(label, code, data, expect_code):
    global PASS, FAIL
    msg = data.get("message", data.get("raw", ""))[:55]
    ok = code == expect_code
    icon = "PASS" if ok else "FAIL"
    if ok:
        PASS += 1
    else:
        FAIL += 1
    print("  [%s] %s  (%d) %s" % (icon, label.ljust(42), code, msg))
    time.sleep(0.3)  # small delay to avoid rate limiting


def section(title):
    print("\n--- %s ---" % title)


# ─── SIGNUP ───────────────────────────────────────────────────────────────────
section("SIGNUP")

code, data = call("POST", "/api/auth/signup", {
    "username": "u" + TS, "password": "123456",
    "email": "u" + TS + "@test.com",
    "firstName": "Auth", "lastName": "Test"
})
check("Success", code, data, 201)

code, data = call("POST", "/api/auth/signup", {
    "username": "u" + TS, "password": "123456",
    "email": "other" + TS + "@test.com",
    "firstName": "A", "lastName": "B"
}, use_cookie=False)
check("Duplicate username -> 409", code, data, 409)

code, data = call("POST", "/api/auth/signup", {
    "username": "other" + TS, "password": "123456",
    "email": "u" + TS + "@test.com",
    "firstName": "A", "lastName": "B"
}, use_cookie=False)
check("Duplicate email -> 409", code, data, 409)

code, data = call("POST", "/api/auth/signup", {
    "username": "vld99", "password": "123456",
    "email": "notanemail",
    "firstName": "A", "lastName": "B"
}, use_cookie=False)
check("Invalid email -> 400", code, data, 400)

code, data = call("POST", "/api/auth/signup", {
    "username": "vld99", "password": "123",
    "email": "v@t.com",
    "firstName": "A", "lastName": "B"
}, use_cookie=False)
check("Password too short -> 400", code, data, 400)

code, data = call("POST", "/api/auth/signup", {
    "username": "ab", "password": "123456",
    "email": "v@t.com",
    "firstName": "A", "lastName": "B"
}, use_cookie=False)
check("Username too short -> 400", code, data, 400)

code, data = call("POST", "/api/auth/signup", {
    "username": "vld99", "password": "123456"
}, use_cookie=False)
check("Missing fields -> 400", code, data, 400)

# ─── SIGNIN ───────────────────────────────────────────────────────────────────
section("SIGNIN")

code, data = call("POST", "/api/auth/signin", {
    "username": "u" + TS, "password": "123456"
})
check("Success", code, data, 200)
TOKEN = data.get("accessToken", "")
if TOKEN:
    print("  [INFO] Token: %s..." % TOKEN[:40])

code, data = call("POST", "/api/auth/signin", {
    "username": "u" + TS, "password": "wrongpass"
}, use_cookie=False)
check("Wrong password -> 401", code, data, 401)

code, data = call("POST", "/api/auth/signin", {
    "username": "nonexistent999", "password": "123456"
}, use_cookie=False)
check("User not found -> 401", code, data, 401)

code, data = call("POST", "/api/auth/signin", {}, use_cookie=False)
check("Missing fields -> 400", code, data, 400)

# ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────
section("PROTECTED ROUTES")

code, data = call("GET", "/api/users/me", auth=TOKEN, use_cookie=False)
name = data.get("user", {}).get("displayName", "")
check("GET /me with valid token -> 200", code, {"message": "user: " + name}, 200)

code, data = call("GET", "/api/users/me", use_cookie=False)
check("GET /me without token -> 401", code, data, 401)

code, data = call("GET", "/api/users/me", auth="invalid.token.here", use_cookie=False)
check("GET /me with bad token -> 403", code, data, 403)

# ─── REFRESH & LOGOUT ─────────────────────────────────────────────────────────
section("REFRESH & LOGOUT")

code, data = call("POST", "/api/auth/refresh")
check("Refresh with valid cookie -> 200", code, data, 200)
new_token = data.get("accessToken", "")
if new_token:
    print("  [INFO] New token: %s..." % new_token[:40])

code, data = call("POST", "/api/auth/signout")
check("Signout -> 204", code, data, 204)

code, data = call("POST", "/api/auth/refresh")
check("Refresh after logout -> 401", code, data, 401)

# ─── SUMMARY ──────────────────────────────────────────────────────────────────
total = PASS + FAIL
print("\n=== RESULT: %d/%d passed ===" % (PASS, total))
if FAIL > 0:
    sys.exit(1)
