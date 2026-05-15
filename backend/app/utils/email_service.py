import logging
import os
import random
import smtplib
import string
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

_SPECIALS = "!@#$%&*"
_ALPHA = string.ascii_letters
_DIGITS = string.digits
_ALL = _ALPHA + _DIGITS + _SPECIALS


def generate_temp_password() -> str:
    """
    Generate a 6-character temporary password that contains at least:
    - 1 uppercase letter
    - 1 lowercase letter
    - 1 digit
    - 1 special character (!@#$%&*)
    The remaining 2 characters are random from letters+digits+specials.
    """
    mandatory = [
        random.choice(string.ascii_uppercase),
        random.choice(string.ascii_lowercase),
        random.choice(_DIGITS),
        random.choice(_SPECIALS),
    ]
    extras = [random.choice(_ALL) for _ in range(2)]
    chars = mandatory + extras
    random.shuffle(chars)
    return "".join(chars)


def send_welcome_survey(email: str, display_name: str | None = None) -> None:
    """
    Envoie un email de bienvenue + enquête de satisfaction à la première connexion.
    """
    mail_server = os.environ.get("MAIL_SERVER", "").strip()
    if not mail_server:
        logger.warning(
            "[DEV MODE] Email de bienvenue/satisfaction non envoyé à %s (pas de serveur mail)",
            email,
        )
        return

    mail_port = int(os.environ.get("MAIL_PORT", "587"))
    mail_username = os.environ.get("MAIL_USERNAME", "")
    mail_password = os.environ.get("MAIL_PASSWORD", "")
    mail_from = os.environ.get("MAIL_FROM", mail_username)
    survey_url = os.environ.get("SURVEY_URL", "").strip()
    platform_url = os.environ.get(
        "PLATFORM_URL", "https://hermes-bit.github.io/Accessibilite_cnig_dieppe/"
    ).strip()

    prenom = display_name or email.split("@")[0]
    subject = "Bienvenue sur la plateforme Accessibilité CNIG Dieppe"

    survey_block = ""
    if survey_url:
        survey_block = f"""
              <tr>
                <td style="padding:0 32px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0"
                         style="background:#f0f4fa;border-radius:8px;padding:20px;">
                    <tr>
                      <td style="text-align:center;">
                        <p style="margin:0 0 8px;color:#1a3a5c;font-size:15px;font-weight:bold;">
                          📋 Votre avis nous intéresse
                        </p>
                        <p style="margin:0 0 16px;color:#555555;font-size:13px;line-height:1.6;">
                          Après avoir utilisé la plateforme, prenez 2 minutes pour nous faire part de votre expérience.
                          Votre retour nous aide à améliorer l'outil.
                        </p>
                        <a href="{survey_url}"
                           style="display:inline-block;padding:12px 28px;background:#1a3a5c;
                                  color:#ffffff;text-decoration:none;border-radius:6px;
                                  font-size:14px;font-weight:bold;">
                          Répondre à l'enquête
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>"""

    html_body = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden;">
          <tr>
            <td style="background:#1a3a5c;padding:28px 32px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">
                Accessibilité CNIG &mdash; Dieppe
              </p>
              <p style="margin:6px 0 0;color:#a8c4e0;font-size:13px;">
                Plateforme de gestion d'accessibilité
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 16px;color:#333333;font-size:15px;">Bonjour {prenom},</p>
              <p style="margin:0 0 16px;color:#333333;font-size:15px;">
                Bienvenue sur la plateforme <strong>Accessibilité CNIG Dieppe</strong> !
                Votre compte est maintenant actif.
              </p>
              <p style="margin:0 0 20px;color:#555555;font-size:14px;line-height:1.6;">
                Vous pouvez dès maintenant consulter les données d'accessibilité,
                calculer des itinéraires adaptés et contribuer au recettage de la plateforme.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="text-align:center;">
                    <a href="{platform_url}"
                       style="display:inline-block;padding:12px 28px;background:#1a3a5c;
                              color:#ffffff;text-decoration:none;border-radius:6px;
                              font-size:14px;font-weight:bold;">
                      Accéder à la plateforme
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid #e8edf3;margin:0;"/>
            </td>
          </tr>
          {survey_block}
          <tr>
            <td style="background:#f4f6f9;padding:16px 32px;text-align:center;border-top:1px solid #e8edf3;">
              <p style="margin:0;color:#aaaaaa;font-size:11px;">
                CNIG Accessibilité &mdash; Dieppe &nbsp;&bull;&nbsp; Ne pas répondre à cet e-mail
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(mail_server, mail_port, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            if mail_username and mail_password:
                smtp.login(mail_username, mail_password)
            smtp.sendmail(mail_from, [email], msg.as_string())
        logger.info("Email de bienvenue/satisfaction envoyé à %s", email)
    except Exception:
        logger.exception("Échec de l'envoi de l'email de bienvenue à %s", email)


def send_temp_password(email: str, password: str) -> None:
    """
    Send the temporary password to the user.
    Falls back to console logging when MAIL_SERVER is not configured (dev mode).
    """
    mail_server = os.environ.get("MAIL_SERVER", "").strip()

    if not mail_server:
        logger.warning(
            "[DEV MODE] Mot de passe temporaire pour %s : %s", email, password
        )
        return

    mail_port = int(os.environ.get("MAIL_PORT", "587"))
    mail_username = os.environ.get("MAIL_USERNAME", "")
    mail_password = os.environ.get("MAIL_PASSWORD", "")
    mail_from = os.environ.get("MAIL_FROM", mail_username)

    subject = "Votre accès — Accessibilité CNIG Dieppe"

    html_body = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#1a3a5c;padding:28px 32px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">
                Accessibilité CNIG &mdash; Dieppe
              </p>
              <p style="margin:6px 0 0;color:#a8c4e0;font-size:13px;">
                Plateforme de gestion d'accessibilité
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#333333;font-size:15px;">Bonjour,</p>
              <p style="margin:0 0 16px;color:#333333;font-size:15px;">
                Votre accès à la plateforme <strong>Accessibilité CNIG &mdash; Dieppe</strong>
                a été créé ou réinitialisé.
              </p>
              <p style="margin:0 0 8px;color:#333333;font-size:15px;">
                Voici votre mot de passe temporaire&nbsp;:
              </p>
              <!-- Password box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
                <tr>
                  <td style="background:#f0f4fa;border:1px solid #c8d8ea;border-radius:6px;
                              padding:16px;text-align:center;">
                    <span style="font-family:'Courier New',monospace;font-size:26px;
                                 font-weight:bold;color:#1a3a5c;letter-spacing:4px;">
                      {password}
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;color:#555555;font-size:14px;">
                Vous serez invité(e) à le modifier lors de votre première connexion.
              </p>
              <p style="margin:0 0 8px;color:#555555;font-size:14px;">
                Votre adresse e-mail de connexion&nbsp;: <strong>{email}</strong>
              </p>
              <hr style="border:none;border-top:1px solid #e8edf3;margin:24px 0;"/>
              <p style="margin:0;color:#888888;font-size:12px;">
                Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f4f6f9;padding:16px 32px;text-align:center;
                        border-top:1px solid #e8edf3;">
              <p style="margin:0;color:#aaaaaa;font-size:11px;">
                CNIG Accessibilité &mdash; Dieppe &nbsp;&bull;&nbsp; Ne pas répondre à cet e-mail
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(mail_server, mail_port, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            if mail_username and mail_password:
                smtp.login(mail_username, mail_password)
            smtp.sendmail(mail_from, [email], msg.as_string())
        logger.info("Mot de passe temporaire envoyé à %s", email)
    except Exception:
        logger.exception(
            "Échec de l'envoi d'e-mail à %s — mot de passe temporaire : %s",
            email,
            password,
        )
