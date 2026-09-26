// Password-protects the homepage only, with a styled password page
// (like a wedding website). Sub-pages (/recipes, /reads, etc.) stay public
// so they can be shared by direct link.
// The password is set in Vercel: Project → Settings → Environment Variables → SITE_PASSWORD.

export const config = {
  matcher: ['/', '/index.html'],
};

const COOKIE = 'site_access';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

// The cookie holds a hash of the password, so changing SITE_PASSWORD signs everyone out.
async function accessToken(password) {
  const data = new TextEncoder().encode('jessicaslocum.com:' + password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  const match = header.split(/;\s*/).find((c) => c.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : null;
}

export default async function middleware(request) {
  const password = process.env.SITE_PASSWORD;

  // Fail closed: if no password is configured, don't show the homepage.
  if (!password) {
    return new Response('Homepage password not configured.', { status: 503 });
  }

  const token = await accessToken(password);

  if (request.method === 'POST') {
    const form = await request.formData();
    if (form.get('password') === password) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/',
          'Set-Cookie': `${COOKIE}=${token}; Path=/; Max-Age=${THIRTY_DAYS}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return passwordPage(true);
  }

  if (readCookie(request, COOKIE) === token) return; // continue to the page

  return passwordPage(false);
}

function passwordPage(wrong) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jessica Slocum</title>
  <meta name="robots" content="noindex">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #FAF6F1; color: #3D2B1F; font-family: 'DM Sans', sans-serif; padding: 24px;
    }
    main { max-width: 380px; width: 100%; text-align: center; }
    h1 { font-family: 'DM Serif Display', serif; font-weight: 400; font-size: 2.75rem; line-height: 1.1; }
    .divider { width: 40px; height: 1px; background: #C97D4E; margin: 20px auto; }
    p { color: #7C6055; margin-bottom: 28px; line-height: 1.5; }
    input {
      width: 100%; padding: 14px 16px; font: inherit; font-size: 1rem; text-align: center;
      background: #FFFFFF; color: inherit; border: 1px solid #EDE3D9; border-radius: 999px; outline: none;
    }
    input:focus { border-color: #C97D4E; }
    button {
      margin-top: 12px; width: 100%; padding: 14px 16px; font: inherit; font-weight: 500; font-size: 1rem;
      background: #C97D4E; color: #FFFFFF; border: none; border-radius: 999px; cursor: pointer;
    }
    button:hover { background: #A86038; }
    .error { margin: 14px 0 0; color: #A86038; font-size: 0.9rem; }
  </style>
</head>
<body>
  <main>
    <h1>Jessica Slocum</h1>
    <div class="divider"></div>
    <p>Welcome, friend. Enter the password to come on in.</p>
    <form method="POST" action="/">
      <input type="password" name="password" placeholder="Password" aria-label="Password" autofocus required>
      <button type="submit">Enter</button>
    </form>
    ${wrong ? '<p class="error">That’s not quite right — try again.</p>' : ''}
  </main>
</body>
</html>`;
  return new Response(html, {
    status: wrong ? 401 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
