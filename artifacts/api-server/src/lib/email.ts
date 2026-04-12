import { Resend } from "resend";
import { logError } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Ordeal <noreply@fitlog.app>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      logError("Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    logError("Send email error:", err);
    return false;
  }
}
