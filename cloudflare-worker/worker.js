/**
 * Cloudflare Worker — CV download gate
 *
 * Intercepts every request to /cv.pdf. Expects the Vue app to pass the
 * hCaptcha token in the X-Captcha-Token request header. Verifies the token
 * against the hCaptcha siteverify API before forwarding to origin.
 *
 * Required secret (set via `wrangler secret put HCAPTCHA_SECRET_KEY`):
 *   HCAPTCHA_SECRET_KEY — the server-side secret from hcaptcha.com/dashboard
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only gate /cv.pdf — all other paths pass through untouched
    if (url.pathname !== '/cv.pdf') {
      return fetch(request);
    }

    const token = request.headers.get('X-Captcha-Token');

    if (!token) {
      return new Response('Forbidden', { status: 403 });
    }

    // Verify token server-side with hCaptcha
    const body = new URLSearchParams({
      secret: env.HCAPTCHA_SECRET_KEY,
      response: token,
    });

    let verified = false;
    try {
      const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = await verifyRes.json();
      verified = data.success === true;
    } catch {
      return new Response('Verification service unavailable', { status: 503 });
    }

    if (!verified) {
      return new Response('Forbidden', { status: 403 });
    }

    // Token valid — forward to origin without the captcha header
    const headers = new Headers(request.headers);
    headers.delete('X-Captcha-Token');

    return fetch(new Request(request.url, {
      method: request.method,
      headers,
    }));
  },
};
