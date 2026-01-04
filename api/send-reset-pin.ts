import { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SENDER_EMAIL = process.env.SENDER_EMAIL || "no-reply@seusite.com";

const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

export default async function (req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400"); // Cache pré-voo por 24 horas

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { email, pin } = req.body;

  if (!email || !pin) {
    return res
      .status(400)
      .json({ message: "Missing email or pin in request body." });
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error("ERRO: Credenciais SMTP incompletas no Vercel.");
    return res.status(500).json({
      message: "Internal server error: Email service configuration missing.",
    });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587"),

    secure: parseInt(SMTP_PORT || "587") === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const mailOptions = {
    from: SENDER_EMAIL,
    to: email,
    subject: "Código de Redefinição de Senha do Portfolio Admin",
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #0ea5e9;">Seu Código de Redefinição de Senha</h2>
          <p>Você solicitou uma redefinição de senha para o painel de administração do seu portfólio.</p>
          <p>Use o seguinte código PIN para confirmar a alteração:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="color: #1e293b; background-color: #f1f5f9; padding: 15px 30px; border-radius: 8px; display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 5px;">${pin}</span>
          </div>
          <p>Este código é válido por um curto período de tempo.</p>
          <p style="font-size: 0.9em; color: #666;">Se você não solicitou isso, por favor, ignore este e-mail.</p>
      </div>
    `,
  };

  // 3. Enviar o e-mail
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Message sent: %s`, info.messageId);
    return res.status(200).json({ message: "Reset PIN sent successfully." });
  } catch (error) {
    console.error("Nodemailer Error:", error);

    // --- CORREÇÃO DO TS18046 AQUI ---
    let errorMessage = "An unknown error occurred during email sending.";

    // Verifica se o erro é uma instância de Error para acessar com segurança
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // ---------------------------------

    // Retorna 500 para o frontend sem expor detalhes do SMTP
    return res.status(500).json({
      message:
        "Error sending email. Please check server logs and SMTP configuration.",
      error: errorMessage,
    });
  }
}
