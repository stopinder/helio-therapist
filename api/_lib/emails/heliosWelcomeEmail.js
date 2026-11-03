function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function heliosWelcomeEmail({
  firstName,
  openHeliosUrl = 'https://helio.works/overview'
}) {
  const safeName = escapeHtml(firstName || 'there');
  const safeOpenHeliosUrl = escapeHtml(openHeliosUrl);
  const subject = 'Welcome to Helios';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#FBF7F2;color:#292A37;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#FBF7F2;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #F1E8DE;border-radius:12px;">
          <tr>
            <td style="padding:36px 40px 28px;">
              <a href="https://helio.works" style="text-decoration:none;display:inline-block;">
                <img src="https://helio.works/brand/helios-logo.png" width="188" alt="Helios" style="display:block;width:188px;max-width:100%;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;"><div style="height:1px;line-height:1px;background:#F1E8DE;font-size:1px;">&nbsp;</div></td>
          </tr>
          <tr>
            <td style="padding:38px 40px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#292A37;">
              <h1 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:#292A37;">Welcome to Helios, ${safeName}</h1>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#575966;">You’re in. Thanks for joining Helios.</p>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#575966;">Helios is a calm clinical workspace for psychotherapists — bringing together the practical parts of practice with space for reflection and professional growth.</p>
              <p style="margin:0 0 30px;font-size:16px;line-height:1.7;color:#575966;">A good place to begin is with one client, then let the workspace support the thread of the work from there.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 30px;">
                <tr>
                  <td bgcolor="#F28C2B" style="border-radius:7px;background:#F28C2B;">
                    <a href="${safeOpenHeliosUrl}" style="display:inline-block;padding:14px 23px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1;font-weight:700;color:#292A37;text-decoration:none;border-radius:7px;">Open Helios</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#667085;">Take your time exploring. Your practice details and integrations can be adjusted whenever you’re ready.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;"><div style="height:1px;line-height:1px;background:#E6E0D6;font-size:1px;">&nbsp;</div></td>
          </tr>
          <tr>
            <td style="padding:28px 40px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.5;font-weight:600;color:#292A37;">Helios</p>
              <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#746D64;">A calmer place for the work around therapy.</p>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#938B81;">This is an account email from Helios. Product updates are controlled separately by the preference you selected when signing up.</p>
              <p style="margin:0;font-size:12px;line-height:1.6;"><a href="https://helio.works" style="color:#E57D55;text-decoration:none;">helio.works</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Welcome to Helios, ${firstName || 'there'}.

You’re in. Thanks for joining Helios.

Helios is being built as a calm clinical workspace for psychotherapists — bringing together the practical parts of practice with space for reflection and professional growth.

You’re joining while Helios is still being shaped, so your experience of using it genuinely matters.

Open Helios:
${openHeliosUrl}

Take your time exploring. Your practice details and integrations can be adjusted whenever you’re ready.

Helios
A calm workspace for clinical practice.

This is an account email from Helios. Product updates are controlled separately by the preference you selected when signing up.

helio.works
  `.trim();

  return { subject, html, text };
}
