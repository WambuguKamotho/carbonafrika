import { Worker, type Job } from "bullmq";
import { prisma } from "@carbonafrika/db";

interface NotificationPayload {
  userId: string;
  type: "email" | "admin_alert";
  template: string;
  data: Record<string, unknown>;
}

// Short title/body for the native push that accompanies the email. Only the
// templates a mobile user (project owner) cares about are mapped; others push
// nothing. `(d) => ...` receives the same data object as the email template.
const pushTemplates: Record<string, (d: Record<string, unknown>) => { title: string; body: string }> = {
  project_submitted:      (d) => ({ title: "Project submitted", body: `${d.projectTitle} is now pending review.` }),
  project_approved_admin: (d) => ({ title: "Project approved", body: `${d.projectTitle} passed review and is in carbon verification.` }),
  project_rejected_admin: (d) => ({ title: "Project needs attention", body: `${d.projectTitle}: ${d.reason ?? "review update"}` }),
  verification_approved:  (d) => ({ title: "Project verified 🌿", body: `${d.carbonTons} t CO₂e confirmed for ${d.projectTitle}.` }),
  verification_rejected:  (d) => ({ title: "Verification update", body: `${d.projectTitle} could not be verified.` }),
  credit_sold:            (d) => ({ title: "Credits sold 🎉", body: `${d.tons} t from ${d.projectTitle} · $${Number(d.totalPrice).toFixed(2)} ${d.currency}` }),
  project_comment:        (d) => ({ title: d.fromAdmin ? "Reviewer left a note" : "New comment", body: String(d.body ?? "").slice(0, 120) }),
};

// Send Expo push to all of a user's registered device tokens. Best-effort.
async function sendExpoPush(tokens: string[], title: string, body: string, data: Record<string, unknown>) {
  const valid = tokens.filter((t) => t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken"));
  if (valid.length === 0) return;
  const messages = valid.map((to) => ({ to, title, body, sound: "default", data }));
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    if (!res.ok) console.warn(`[notification.push] Expo push API ${res.status}`);
    else console.log(`[notification.push] pushed "${title}" to ${valid.length} device(s)`);
  } catch (e) {
    console.warn("[notification.push] failed:", e instanceof Error ? e.message : e);
  }
}

interface EmailTemplate {
  subject: string;
  html: string;
}

const templates: Record<string, (d: Record<string, unknown>) => EmailTemplate> = {
  credit_sold: (d) => ({
    subject: `Credits sold — ${d.tons} tonnes · $${Number(d.totalPrice).toFixed(2)} ${d.currency}`,
    html: `
      <h2 style="color:#15803d">Your carbon credits just sold 🎉</h2>
      <p>Great news — someone purchased credits from your project <strong>${d.projectTitle}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px;color:#6b7280;border-bottom:1px solid #f3f4f6">Tonnes sold</td>
            <td style="padding:8px;font-weight:700;border-bottom:1px solid #f3f4f6">${d.tons}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Total earned</td>
            <td style="padding:8px;font-weight:700;color:#15803d">$${Number(d.totalPrice).toFixed(2)} ${d.currency}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:14px">
        Funds will arrive in your wallet once the on-chain settlement completes (usually within minutes).
      </p>
    `,
  }),

  purchase_confirmed: (d) => ({
    subject: `Purchase confirmed — ${d.tons} tonnes of ${d.projectTitle}`,
    html: `
      <h2 style="color:#15803d">Purchase confirmed ✅</h2>
      <p>You purchased <strong>${d.tons} tonnes</strong> from <strong>${d.projectTitle}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px;color:#6b7280;border-bottom:1px solid #f3f4f6">Tonnes</td>
            <td style="padding:8px;font-weight:700;border-bottom:1px solid #f3f4f6">${d.tons}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;border-bottom:1px solid #f3f4f6">Total paid</td>
            <td style="padding:8px;font-weight:700;border-bottom:1px solid #f3f4f6">$${Number(d.totalPrice).toFixed(2)} ${d.currency}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Transaction</td>
            <td style="padding:8px;font-family:monospace;font-size:12px">${d.txHash ?? "Settling…"}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:14px">
        You can retire your credits from the dashboard to receive your NFT retirement certificate.
      </p>
    `,
  }),

  verification_approved: (d) => ({
    subject: `Project verified — credits ready to list on marketplace`,
    html: `
      <h2 style="color:#15803d">Verification approved 🌿</h2>
      <p>Your project <strong>${d.projectTitle}</strong> has been independently verified.</p>
      <p><strong>${d.carbonTons} tonnes</strong> of CO₂ have been confirmed and minted as carbon credits.</p>
      <p style="color:#6b7280;font-size:14px">
        Your credits are now available in your dashboard. List them on the marketplace to start earning.
      </p>
    `,
  }),

  verification_rejected: (d) => ({
    subject: `Project review update — ${d.projectTitle}`,
    html: `
      <h2 style="color:#dc2626">Verification update</h2>
      <p>Your project <strong>${d.projectTitle}</strong> could not be verified at this time.</p>
      ${d.notes ? `<p><strong>Reason:</strong> ${d.notes}</p>` : ""}
      <p style="color:#6b7280;font-size:14px">
        You can resubmit with updated documentation. Contact support if you need help.
      </p>
    `,
  }),

  project_submitted: (d) => ({
    subject: `Project submitted — ${d.projectTitle}`,
    html: `
      <h2 style="color:#15803d">We've received your project ✓</h2>
      <p>Thanks for submitting <strong>${d.projectTitle}</strong>. Our team will review it shortly and may reach out with questions or document requests.</p>
      <p style="color:#6b7280;font-size:14px">
        While you wait, you can keep editing the project and uploading supporting documents from your dashboard.
        Once we approve, it moves on to independent carbon verification.
      </p>
    `,
  }),

  project_approved_admin: (d) => ({
    subject: `Project approved — ${d.projectTitle} now in carbon verification`,
    html: `
      <h2 style="color:#15803d">Approved by Kabon.Africa ✓</h2>
      <p>Your project <strong>${d.projectTitle}</strong> passed initial review. It's been forwarded to our verifier team for independent carbon assessment.</p>
      ${d.note ? `<p style="background:#f0fdf4;border-left:3px solid #15803d;padding:12px 16px;border-radius:6px"><strong>Note from reviewer:</strong><br/>${d.note}</p>` : ""}
      <p style="color:#6b7280;font-size:14px">
        Verification usually takes a few business days. You'll get another email once it's complete.
      </p>
    `,
  }),

  project_rejected_admin: (d) => ({
    subject: `Project review needs attention — ${d.projectTitle}`,
    html: `
      <h2 style="color:#dc2626">Project review update</h2>
      <p>We couldn't approve <strong>${d.projectTitle}</strong> as submitted.</p>
      <p style="background:#fef2f2;border-left:3px solid #dc2626;padding:12px 16px;border-radius:6px"><strong>Reason:</strong><br/>${d.reason}</p>
      <p style="color:#6b7280;font-size:14px">
        Reply in the project's comment thread on your dashboard once you've addressed the issue — we'll re-review.
      </p>
    `,
  }),

  partner_invite: (d) => ({
    subject: `Welcome to the Kabon.Africa Community Partner programme`,
    html: `
      <h2 style="color:#15803d">Welcome, ${d.partnerName} 🌍</h2>
      <p>Your application to join the Kabon.Africa Community Partner programme has been approved.</p>
      <p>You can now register projects on behalf of landowners in <strong>${d.organization}</strong>'s communities. Every project you bring earns you onboarding and verification milestone payouts plus a lifetime royalty on every credit sold.</p>
      <p style="text-align:center;margin:32px 0">
        <a href="${d.inviteUrl}"
           style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:12px">
          Set up my partner account
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px">
        Or paste this link into your browser:<br/>
        <span style="font-family:monospace;font-size:12px;word-break:break-all">${d.inviteUrl}</span>
      </p>
      <p style="color:#9ca3af;font-size:13px">
        This link expires on ${new Date(d.expiresAt as string).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
      </p>
    `,
  }),

  buyer_invite: (d) => ({
    subject: `You're approved — set up your Kabon.Africa buyer account`,
    html: `
      <h2 style="color:#15803d">Welcome to Kabon.Africa 🌿</h2>
      <p>Hi ${d.contactName},</p>
      <p>Your buyer account for <strong>${d.companyName}</strong> has been approved. Click below to set your password and start purchasing verified African carbon credits.</p>
      <p style="text-align:center;margin:32px 0">
        <a href="${d.inviteUrl}"
           style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:12px">
          Set up my account
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px">
        Or paste this link into your browser:<br/>
        <span style="font-family:monospace;font-size:12px;word-break:break-all">${d.inviteUrl}</span>
      </p>
      <p style="color:#9ca3af;font-size:13px">
        This link expires on ${new Date(d.expiresAt as string).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
        If you didn't request this, you can ignore the email.
      </p>
    `,
  }),

  project_comment: (d) => ({
    subject: `New comment on ${d.projectTitle}`,
    html: `
      <h2 style="color:#15803d">${d.fromAdmin ? "Reviewer left a note" : "New comment"}</h2>
      <p>On your project <strong>${d.projectTitle}</strong>:</p>
      <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #15803d;background:#f9fafb;border-radius:6px;color:#374151">
        ${d.body}
      </blockquote>
      <p style="color:#6b7280;font-size:14px">
        Reply from the project page in your dashboard.
      </p>
    `,
  }),
};

async function sendEmail(to: string, _name: string, template: EmailTemplate): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.FROM_EMAIL ?? "Kabon.Africa <admin@kabon.africa>";

  if (!apiKey) {
    console.log(`[notification] (dev — no RESEND_API_KEY) Would send to ${to}: "${template.subject}"`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to:      [to],
      subject: template.subject,
      html: `
        <div style="font-family:Inter,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff">
          <div style="margin-bottom:24px">
            <span style="font-size:18px;font-weight:900;color:#15803d">CarbonAfrika</span>
          </div>
          ${template.html}
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0" />
          <p style="color:#9ca3af;font-size:12px">
            CarbonAfrika · Verified African Carbon Credits ·
            <a href="https://kabon.africa" style="color:#15803d">kabon.africa</a>
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }

  console.log(`[notification] Email sent to ${to}: "${template.subject}"`);
}

export function startNotificationWorker(connection: { url: string }) {
  const worker = new Worker<NotificationPayload>(
    "notification",
    async (job: Job<NotificationPayload>) => {
      const { userId, type, template: templateName, data } = job.data;

      // admin_alert jobs have no target user (broadcast-style) — skip for now.
      if (type === "admin_alert" || !userId) {
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, pushTokens: true },
      });
      if (!user) {
        console.log(`[notification] User ${userId} not found, skipping`);
        return;
      }

      // Native push (best-effort, runs regardless of email).
      const pushRender = pushTemplates[templateName];
      if (pushRender && user.pushTokens?.length) {
        const { title, body } = pushRender(data);
        await sendExpoPush(user.pushTokens, title, body, { template: templateName, ...data });
      }

      // Email.
      const render = templates[templateName];
      if (!render) {
        console.warn(`[notification] Unknown template "${templateName}"`);
        return;
      }
      if (!user.email) {
        console.log(`[notification] No email on file for user ${userId}, push-only`);
        return;
      }
      const rendered = render(data);
      await sendEmail(user.email, user.name, rendered);
    },
    { connection, concurrency: 10, drainDelay: 30000, stalledInterval: 30000 },
  );

  worker.on("failed", (job, err) => {
    console.error(`[notification] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
