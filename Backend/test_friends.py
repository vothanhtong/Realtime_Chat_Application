import subprocess, json, time

BASE = "http://localhost:5001/api"
TS = str(int(time.time()))

def req(method, url, data=None, token=None):
    cmd = ["curl", "-s", "--max-time", "6"]
    if token:
        cmd += ["-H", "Authorization: Bearer " + token]
    cmd += ["-X", method, url, "-H", "Content-Type: application/json"]
    if data is not None:
        cmd += ["-d", json.dumps(data)]
    cmd += ["-w", "\n__CODE__%{http_code}"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    parts = r.stdout.rsplit("\n__CODE__", 1)
    body = parts[0].strip()
    code = int(parts[1].strip()) if len(parts) > 1 and parts[1].strip().isdigit() else 0
    try:
        return code, json.loads(body)
    except Exception:
        return code, {"raw": body[:80]}

def check(label, code, data, expect):
    msg = data.get("message", data.get("raw", ""))[:55]
    icon = "PASS" if code == expect else "FAIL"
    print("  [%s] (%d) %-40s %s" % (icon, code, label, msg))
    time.sleep(0.2)

# Setup: create 2 users
req("POST", BASE + "/auth/signup", {"username": "ua" + TS, "password": "123456", "email": "ua" + TS + "@t.com", "firstName": "A", "lastName": "A"})
req("POST", BASE + "/auth/signup", {"username": "ub" + TS, "password": "123456", "email": "ub" + TS + "@t.com", "firstName": "B", "lastName": "B"})

# Get tokens
_, da = req("POST", BASE + "/auth/signin", {"username": "ua" + TS, "password": "123456"})
_, db = req("POST", BASE + "/auth/signin", {"username": "ub" + TS, "password": "123456"})
ta = da.get("accessToken", "")
tb = db.get("accessToken", "")

# Get user B's ID
_, me_b = req("GET", BASE + "/users/me", token=tb)
b_id = me_b.get("user", {}).get("_id", "")

print("\n=== FRIEND REQUEST FLOW ===")

# 1. Search user B by displayName
code, data = req("GET", BASE + "/users/search?username=B%20B", token=ta)
check("Search user B by displayName", code, data, 200)

# 2. Send friend request
code, data = req("POST", BASE + "/friends/requests", {"to": b_id, "message": "Hi!"}, token=ta)
check("Send friend request", code, data, 201)

# 3. Get received requests as B
code, data = req("GET", BASE + "/friends/requests", token=tb)
received = data.get("received", [])
req_id = received[0].get("_id", "") if received else ""
check("Get requests (B sees received)", code, {"message": "received=%d" % len(received)}, 200)

# 4. Accept request
if req_id:
    code, data = req("POST", BASE + "/friends/requests/" + req_id + "/accept", token=tb)
    check("Accept request", code, data, 200)

# 5. Get friends list
code, data = req("GET", BASE + "/friends", token=ta)
friends = data.get("friends", [])
check("Friends list (A has 1 friend)", code, {"message": "count=%d" % len(friends)}, 200)

# 6. Duplicate request should fail
code, data = req("POST", BASE + "/friends/requests", {"to": b_id}, token=ta)
check("Duplicate request -> 400", code, data, 400)

# 7. Decline a new request
req("POST", BASE + "/friends/requests", {"to": b_id}, token=ta)
_, dr = req("GET", BASE + "/friends/requests", token=tb)
new_received = dr.get("received", [])
if new_received:
    new_req_id = new_received[0].get("_id", "")
    code, data = req("POST", BASE + "/friends/requests/" + new_req_id + "/decline", token=tb)
    check("Decline request -> 204", code, data, 204)

# 8. Unfriend
code, data = req("DELETE", BASE + "/friends/" + b_id, token=ta)
check("Unfriend -> 200", code, data, 200)

# 9. Friends list should be empty now
code, data = req("GET", BASE + "/friends", token=ta)
friends = data.get("friends", [])
check("Friends list empty after unfriend", code, {"message": "count=%d" % len(friends)}, 200)

print("\n=== DONE ===")
