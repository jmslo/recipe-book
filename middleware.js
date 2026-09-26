// Password-protects the homepage only. Sub-pages (/recipes, /reads, etc.)
// stay public so they can be shared by direct link.
// The password is set in Vercel: Project → Settings → Environment Variables → SITE_PASSWORD.

export const config = {
  matcher: ['/', '/index.html'],
};

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD;

  // Fail closed: if no password is configured, don't show the homepage.
  if (!password) {
    return new Response('Homepage password not configured.', { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      // Any username is accepted; only the password is checked.
      const supplied = decoded.slice(decoded.indexOf(':') + 1);
      if (supplied === password) return; // continue to the page
    } catch {}
  }

  return new Response('Password required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="jessicaslocum.com", charset="UTF-8"' },
  });
}
