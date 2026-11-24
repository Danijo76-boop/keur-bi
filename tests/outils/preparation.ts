// Exécuté avant chaque fichier de test : environnement neutre et prévisible.
// Aucun service d'envoi (WhatsApp, SMS, email) n'est configuré : les codes passent en « mode démo »,
// sauf dans les tests qui les simulent explicitement.
for (const cle of [
  "WHATSAPP_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_MODELE_ALERTE",
  "ORANGE_CLIENT_ID",
  "ORANGE_CLIENT_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM",
  "TWILIO_MESSAGING_SERVICE_SID",
  "RESEND_API_KEY",
  "OTP_WHATSAPP",
  "ANTHROPIC_API_KEY",
])
  delete process.env[cle];
// Le journal technique écrit aussi en base : on le garde discret pendant les tests.
process.env.LOG_LEVEL ??= "erreur";
