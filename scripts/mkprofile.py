#!/usr/bin/env python3
# Create (or reuse) an App Store distribution provisioning profile for
# com.mark.chawan and install it into ~/Library/MobileDevice/Provisioning Profiles.
import base64, json, os, sys, time, urllib.request, urllib.error, urllib.parse
import jwt  # PyJWT (already used by buffy/scripts/ship.sh)

KEY_ID = "DUPV266J6S"
ISSUER = "b0021702-5324-4cc1-9ddd-66a5a1535fe6"
KEY_PATH = os.path.expanduser(f"~/.appstoreconnect/private_keys/AuthKey_{KEY_ID}.p8")
BUNDLE = "com.mark.chawan"
PROFILE_NAME = "Chawan App Store"
DEST = os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles")

priv = open(KEY_PATH).read()
tok = jwt.encode(
    {"iss": ISSUER, "iat": int(time.time()), "exp": int(time.time()) + 1000, "aud": "appstoreconnect-v1"},
    priv, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"},
)

def api(method, path, body=None):
    url = "https://api.appstoreconnect.apple.com" + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method,
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r) if r.status != 204 else {}
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} on {method} {path}:\n{e.read().decode()}"); sys.exit(1)

def install(content, uuid):
    os.makedirs(DEST, exist_ok=True)
    p = os.path.join(DEST, f"{uuid}.mobileprovision")
    with open(p, "wb") as f:
        f.write(base64.b64decode(content))
    print(f"installed -> {p}")

# Reuse an existing profile of this name if present (idempotent).
q = urllib.parse.quote(PROFILE_NAME)
existing = api("GET", f"/v1/profiles?filter[name]={q}&limit=10")
for p in existing.get("data", []):
    a = p["attributes"]
    if a["name"] == PROFILE_NAME and a.get("profileState") == "ACTIVE":
        print(f"reusing existing profile '{PROFILE_NAME}' ({a['uuid']})")
        install(a["profileContent"], a["uuid"])
        print("OK"); sys.exit(0)

bundle = api("GET", f"/v1/bundleIds?filter[identifier]={BUNDLE}&limit=5")
if not bundle.get("data"):
    print(f"FATAL: bundle id {BUNDLE} not found in the account"); sys.exit(1)
bundle_rid = bundle["data"][0]["id"]

certs = api("GET", "/v1/certificates?filter[certificateType]=DISTRIBUTION&limit=50")
active = [c for c in certs.get("data", []) if c["attributes"].get("certificateType") == "DISTRIBUTION"]
if not active:
    print("FATAL: no DISTRIBUTION certificate in the account"); sys.exit(1)
cert_rid = active[0]["id"]
print(f"bundle={bundle_rid[:8]}… cert={cert_rid[:8]}…")

prof = api("POST", "/v1/profiles", {"data": {
    "type": "profiles",
    "attributes": {"name": PROFILE_NAME, "profileType": "IOS_APP_STORE"},
    "relationships": {
        "bundleId": {"data": {"type": "bundleIds", "id": bundle_rid}},
        "certificates": {"data": [{"type": "certificates", "id": cert_rid}]},
    },
}})
a = prof["data"]["attributes"]
print(f"created profile '{a['name']}' ({a['uuid']})")
install(a["profileContent"], a["uuid"])
print("OK")
