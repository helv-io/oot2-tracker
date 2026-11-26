// Static privacy policy page served at /privacy.

export const PRIVACY_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Privacy Policy — OoT 100% Tracker</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; background: #e9dcbc; color: #2a1e10;
             margin: 0; padding: 2rem 1.25rem 3rem; line-height: 1.55; }
      main { max-width: 44rem; margin: 0 auto; background: #f5ecd4; border: 1.5px solid #c3ab72;
             border-radius: 10px; padding: 1.5rem 1.75rem; }
      h1 { font-size: 1.6rem; margin-top: 0; }
      h2 { font-size: 1.15rem; margin-top: 1.6rem; }
      a { color: #8a6d1f; }
    </style>
  </head>
  <body>
    <main>
      <h1>Privacy Policy — OoT 100% Tracker</h1>
      <p><em>Last updated: November 26, 2026</em></p>
      <p>
        OoT 100% Tracker (https://oot.helv.io) is a fan-made checklist for
        <em>The Legend of Zelda: Ocarina of Time</em>. It is not affiliated
        with Nintendo. This page says exactly what the app stores — no more,
        no less.
      </p>
      <h2>What we store</h2>
      <p>
        <strong>If you only browse:</strong> your checklist progress is kept
        in your own browser's local storage, on your device. Nothing about
        your progress leaves your device.
      </p>
      <p>
        <strong>If you sign in with Google:</strong> we store your Google
        account ID, your email address, and the name and profile-picture URL
        Google provides, together with your checklist progress (which of the
        272 deeds you have ticked). This is stored in the app's own database
        so your progress can follow you between devices. A session cookie is
        used to keep you signed in; it contains only a random session
        identifier.
      </p>
      <h2>What we do not collect</h2>
      <p>
        We do not run analytics or advertising, we do not load fonts or
        scripts from other sites, we do not track you across other sites, and we never sell or share your information with third
        parties. The app asks Google only for your basic identity (name,
        email, profile picture) — it cannot read your email, files, or any
        other Google data.
      </p>
      <h2>Deleting your data</h2>
      <p>
        Signing out ends your session on that device. "Start over" erases
        your stored progress. "Delete my account", under More at the bottom
        of the checklist, removes your account record, progress and
        sessions from the server right away.
      </p>
      <p><a href="/">← Back to the checklist</a></p>
    </main>
  </body>
</html>
`;
