import asyncio
import json
import sys

from riot_auth import RiotAuth

async def main():
    # Read JSON from stdin
    input_data = sys.stdin.read()
    if not input_data:
        print(json.dumps({"error": "No input provided"}), file=sys.stderr)
        sys.exit(1)

    try:
        req = json.loads(input_data)
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON"}), file=sys.stderr)
        sys.exit(1)

    auth = RiotAuth()
    
    action = req.get("action", "auth")

    try:
        if action == "auth":
            username = req.get("username", "")
            password = req.get("password", "")
            
            mfa_required = await auth.authorize(username, password)
            
            if mfa_required:
                # Need to return cookies so we can continue later
                ssid_cookie = ""
                for cookie in auth._cookie_jar:
                    if cookie.key == "ssid":
                        ssid_cookie = f"ssid={cookie.value}"
                        break
                        
                # Actually, python-riot-auth requires the whole cookie jar. 
                # We can dump the cookies to JSON.
                cookies = []
                for c in auth._cookie_jar:
                    cookies.append({"key": c.key, "value": c.value, "domain": c["domain"], "path": c["path"]})
                
                # RiotAuth doesn't expose the email directly, but we know it's MFA.
                print(json.dumps({
                    "type": "multifactor", 
                    "email": "your email", 
                    "cookies": cookies
                }))
                sys.exit(0)
                
        elif action == "mfa":
            code = req.get("code", "")
            cookies_data = req.get("cookies", [])
            
            # Reconstruct cookie jar
            for c_data in cookies_data:
                auth._cookie_jar.update_cookies({c_data["key"]: c_data["value"]})
                
            await auth.authorize_mfa(code)
            
        else:
            print(json.dumps({"error": "Unknown action"}), file=sys.stderr)
            sys.exit(1)

        # Build result
        result = {
            "type": "success",
            "access_token": auth.access_token,
            "id_token": auth.id_token or "",
            "entitlement_token": auth.entitlements_token or "",
            "puuid": auth.user_id or "",
            "expires_at": auth.expires_at or 0,
        }

        ssid_cookie = ""
        for cookie in auth._cookie_jar:
            if cookie.key == "ssid":
                ssid_cookie = f"ssid={cookie.value}"
                break
        result["ssid_cookie"] = ssid_cookie

        # Geo/Region needs to be extracted manually since python-riot-auth doesn't fetch region
        # But wait! Node can just use the tokens to fetch region/geo because it just needs Authorization header!
        
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        error_msg = str(e)
        print(json.dumps({"error": error_msg}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # Fix for Windows asyncio loop
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
