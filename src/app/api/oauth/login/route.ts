import { NextResponse } from "next/server";
import { generatePkce, getAuthorizeUrl } from "@/lib/fanvue/oauth";
import { cookies } from "next/headers";

/**
 * OAuth Login Route - initiates Fanvue OAuth flow
 * Following the official fanvue-app-starter pattern
 * https://github.com/fanvue/fanvue-app-starter
 */
export async function GET(request: Request) {
  const { verifier, challenge } = generatePkce();
  const state = crypto.randomUUID();

  const url = new URL(request.url);
  const clientId = process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback`;

  console.log("[OAuth Login] Starting OAuth flow");
  console.log("[OAuth Login] Client ID:", clientId);
  console.log("[OAuth Login] Redirect URI:", redirectUri);

  const authUrl = getAuthorizeUrl({
    state,
    codeChallenge: challenge,
    clientId,
    redirectUri,
  });

  console.log("[OAuth Login] Auth URL:", authUrl);

  const cookieStore = await cookies();
  const secure = url.protocol === "https:";
  
  cookieStore.set("oauth_state", state, { 
    httpOnly: true, 
    path: "/", 
    sameSite: "lax", 
    secure, 
    maxAge: 600 
  });
  cookieStore.set("oauth_verifier", verifier, { 
    httpOnly: true, 
    path: "/", 
    sameSite: "lax", 
    secure, 
    maxAge: 600 
  });

  const res = NextResponse.redirect(authUrl);
  res.headers.set("Content-Security-Policy", "frame-ancestors 'self'");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  return res;
}
