import { NextResponse } from 'next/server';
import { createAuthorizationCode, getClient, MCP_SCOPES } from '@/lib/mcp-oauth';

export const dynamic = 'force-dynamic';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const responseType = url.searchParams.get('response_type');
  const clientId = url.searchParams.get('client_id') || '';
  const redirectUri = url.searchParams.get('redirect_uri') || '';
  const scopeParam = url.searchParams.get('scope') || `${MCP_SCOPES.READ} ${MCP_SCOPES.WRITE}`;
  const state = url.searchParams.get('state') || '';
  const codeChallenge = url.searchParams.get('code_challenge') || '';
  const codeChallengeMethod = url.searchParams.get('code_challenge_method') || 'S256';
  const autoApprove = url.searchParams.get('auto_approve') === 'true' || url.searchParams.get('auto_approve') === '1';

  // Validation per OAuth 2.1
  if (responseType !== 'code') {
    return NextResponse.json(
      { error: 'unsupported_response_type', error_description: 'response_type must be "code"' },
      { status: 400 },
    );
  }

  if (!redirectUri) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'redirect_uri is required' },
      { status: 400 },
    );
  }

  if (!codeChallenge) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'PKCE code_challenge is required per OAuth 2.1' },
      { status: 400 },
    );
  }

  if (codeChallengeMethod !== 'S256') {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'code_challenge_method must be S256' },
      { status: 400 },
    );
  }

  const client = getClient(clientId);
  const clientName = client?.client_name || clientId || 'ChatGPT Translation Connector';
  const scopes = scopeParam.split(' ').filter(Boolean);

  // Auto-approve flag (convenient for automated tests and headless verification)
  if (autoApprove) {
    try {
      const code = await createAuthorizationCode({
        clientId: clientId || 'chatgpt-mcp-client',
        redirectUri,
        scopes,
        codeChallenge,
        codeChallengeMethod,
      });

      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', code);
      if (state) redirectUrl.searchParams.set('state', state);

      return NextResponse.redirect(redirectUrl.toString(), 302);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authorization failed';
      return NextResponse.json({ error: 'server_error', error_description: msg }, { status: 500 });
    }
  }

  // Minimal single-owner consent UI
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize ARIA Translation MCP</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; width: 100%; max-width: 480px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    h1 { font-size: 20px; margin: 0 0 16px; font-weight: 600; color: #38bdf8; }
    p { font-size: 14px; line-height: 1.5; color: #94a3b8; margin: 0 0 16px; }
    .client { background: #0f172a; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #e2e8f0; margin-bottom: 20px; border: 1px solid #334155; }
    .scopes { list-style: none; padding: 0; margin: 0 0 24px; }
    .scopes li { background: #334155; margin-bottom: 8px; padding: 10px 14px; border-radius: 6px; font-size: 13px; display: flex; align-items: center; }
    .badge { background: #0284c7; color: white; border-radius: 4px; padding: 2px 6px; font-size: 11px; margin-right: 10px; font-weight: 600; }
    .actions { display: flex; gap: 12px; margin-top: 24px; }
    button { flex: 1; padding: 12px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.2s; }
    button.approve { background: #0284c7; color: white; }
    button.approve:hover { background: #0369a1; }
    button.deny { background: #475569; color: #cbd5e1; }
    button.deny:hover { background: #334155; }
  </style>
</head>
<body>
  <div class="card">
    <h1>ARIA HUB MCP Authorization</h1>
    <p>A client is requesting authorization to connect to the ARIA Translation Gateway:</p>
    <div class="client">Client: ${escapeHtml(clientName)}</div>
    <p>Permissions requested:</p>
    <ul class="scopes">
      ${scopes
        .map(
          (s) =>
            `<li><span class="badge">SCOPE</span> <div><strong>${escapeHtml(s)}</strong><br><small style="color:#94a3b8;">${
              s === MCP_SCOPES.WRITE
                ? 'Claim, commit, and release translations'
                : 'View translation queue counts'
            }</small></div></li>`,
        )
        .join('')}
    </ul>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${escapeHtml(clientId)}">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
      <input type="hidden" name="scope" value="${escapeHtml(scopeParam)}">
      <input type="hidden" name="state" value="${escapeHtml(state)}">
      <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}">
      <input type="hidden" name="code_challenge_method" value="${escapeHtml(codeChallengeMethod)}">
      <div class="actions">
        <button type="submit" name="action" value="deny" class="deny">Deny</button>
        <button type="submit" name="action" value="approve" class="approve">Authorize</button>
      </div>
    </form>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = formData.get('action');
    const clientId = String(formData.get('client_id') || '');
    const redirectUri = String(formData.get('redirect_uri') || '');
    const scopeParam = String(formData.get('scope') || `${MCP_SCOPES.READ} ${MCP_SCOPES.WRITE}`);
    const state = String(formData.get('state') || '');
    const codeChallenge = String(formData.get('code_challenge') || '');
    const codeChallengeMethod = String(formData.get('code_challenge_method') || 'S256');

    if (!redirectUri) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri required' }, { status: 400 });
    }

    const redirectUrl = new URL(redirectUri);

    if (action !== 'approve') {
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set('error_description', 'User denied authorization');
      if (state) redirectUrl.searchParams.set('state', state);
      return NextResponse.redirect(redirectUrl.toString(), 302);
    }

    const scopes = scopeParam.split(' ').filter(Boolean);
    const code = await createAuthorizationCode({
      clientId: clientId || 'chatgpt-mcp-client',
      redirectUri,
      scopes,
      codeChallenge,
      codeChallengeMethod,
    });

    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    return NextResponse.redirect(redirectUrl.toString(), 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Authorization failed';
    return NextResponse.json({ error: 'server_error', error_description: msg }, { status: 500 });
  }
}
