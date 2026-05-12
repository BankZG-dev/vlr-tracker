"""
Interactive Riot Auth test - type credentials at the prompts.
Run: python scripts/test_auth_interactive.py
"""
import asyncio
import getpass
import json

from riot_auth import RiotAuth


async def main():
    print("=== Riot Auth Test ===")
    print("Enter your Riot account credentials (the ones you use to log into the game).\n")

    username = input("Username: ").strip()
    password = getpass.getpass("Password: ").strip()

    print(f"\nAuthenticating as '{username}'...")

    auth = RiotAuth()

    try:
        mfa_required = await auth.authorize(username, password)

        if mfa_required:
            print("\n⚠️  MFA Required! Your account has 2-factor authentication enabled.")
            print("You need to disable it temporarily or use the MFA flow.")
            return

        print("\n✅ SUCCESS!")
        print(f"   PUUID: {auth.user_id}")
        print(f"   Access Token: {auth.access_token[:20]}...")
        print(f"   Entitlement: {auth.entitlements_token[:20]}...")
        print(f"   Expires at: {auth.expires_at}")

        # Get SSID cookie
        ssid = ""
        for cookie in auth._cookie_jar:
            if cookie.key == "ssid":
                ssid = f"ssid={cookie.value}"
                break
        print(f"   SSID Cookie: {'present' if ssid else 'missing'}")

    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        print("\nPossible reasons:")
        print("  1. Wrong username - this is your SIGN-IN NAME, not your display name")
        print("     Check at: https://account.riotgames.com → Sign-in Name")
        print("  2. Wrong password")
        print("  3. Account may need password reset")
        print("  4. Riot may be blocking automated logins temporarily")


if __name__ == "__main__":
    asyncio.run(main())
