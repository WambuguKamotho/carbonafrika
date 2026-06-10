interface EmailTemplate {
  subject: string;
  html: (data: Record<string, unknown>) => string;
}

export const templates: Record<string, EmailTemplate> = {
  verify_email: {
    subject: "Verify your Kabon.Africa email address",
    html: (d) => `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="background:#14532d;padding:32px;text-align:center;">
            <div style="display:inline-block;background:#16a34a;border-radius:12px;padding:12px;margin-bottom:12px;">
              <span style="font-size:24px;">🌿</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">Verify your email</h1>
          </div>
          <div style="padding:32px;">
            <p style="color:#374151;font-size:16px;margin-top:0;">Hi <strong>${d["name"]}</strong>,</p>
            <p style="color:#374151;">Thanks for joining Kabon.Africa. Click the button below to verify your email address and activate your account.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${d["verifyUrl"]}" style="background:#16a34a;color:#fff;text-decoration:none;padding:16px 32px;border-radius:10px;font-weight:700;font-size:16px;display:inline-block;">
                Verify my email →
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;">This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="color:#9ca3af;font-size:12px;word-break:break-all;">
              Or copy this link into your browser:<br/>
              <a href="${d["verifyUrl"]}" style="color:#16a34a;">${d["verifyUrl"]}</a>
            </p>
          </div>
          <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© 2025 Kabon.Africa — restoring Africa, one credit at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  welcome: {
    subject: "Welcome to Kabon.Africa — your account is ready",
    html: (d) => `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="background:#14532d;padding:32px;text-align:center;">
            <div style="display:inline-block;background:#16a34a;border-radius:12px;padding:12px;margin-bottom:12px;">
              <span style="font-size:24px;">🌿</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">Welcome to Kabon.Africa</h1>
          </div>
          <div style="padding:32px;">
            <p style="color:#374151;font-size:16px;margin-top:0;">Hi <strong>${d["name"]}</strong>,</p>
            <p style="color:#374151;">Your account is live. You're one step closer to turning your land into a stream of income through verified carbon credits.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;">
              <p style="margin:0 0 12px;font-weight:700;color:#14532d;font-size:14px;">What to do next:</p>
              <ol style="color:#374151;font-size:14px;margin:0;padding-left:20px;line-height:1.8;">
                <li>Go to your <strong>Dashboard</strong> and create your first project</li>
                <li>Upload your land documents and GPS boundaries</li>
                <li>Submit for verification — our team reviews in 2–4 weeks</li>
                <li>Once approved, credits are issued and listed on the marketplace</li>
              </ol>
            </div>
            <div style="text-align:center;margin:28px 0;">
              <a href="https://kabon.africa/dashboard" style="background:#16a34a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
                Go to your dashboard →
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;margin-bottom:0;">
              Need help? Reply to this email or visit <a href="https://kabon.africa" style="color:#16a34a;">kabon.africa</a>.
            </p>
          </div>
          <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© 2025 Kabon.Africa — restoring Africa, one credit at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  admin_new_registration: {
    subject: "New user registered on Kabon.Africa",
    html: (d) => `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="background:#14532d;padding:32px;text-align:center;">
            <div style="display:inline-block;background:#16a34a;border-radius:12px;padding:12px;margin-bottom:12px;">
              <span style="font-size:24px;">🌿</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:900;">New Registration</h1>
          </div>
          <div style="padding:32px;">
            <p style="color:#374151;font-size:15px;margin-top:0;">A new user has registered on Kabon.Africa.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:20px 0;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
                <tr><td style="padding:6px 0;font-weight:600;width:100px;">Name</td><td>${d["name"]}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600;">Email</td><td>${d["email"]}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600;">Country</td><td>${d["country"] ?? "—"}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600;">Role</td><td>${d["role"]}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600;">Registered</td><td>${d["registeredAt"]}</td></tr>
              </table>
            </div>
            <div style="text-align:center;margin:28px 0;">
              <a href="${d["adminUrl"]}" style="background:#16a34a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
                View user in admin panel →
              </a>
            </div>
          </div>
          <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© 2025 Kabon.Africa — admin notification</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  forgot_password: {
    subject: "Reset your Kabon.Africa password",
    html: (d) => `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="background:#14532d;padding:32px;text-align:center;">
            <div style="display:inline-block;background:#16a34a;border-radius:12px;padding:12px;margin-bottom:12px;">
              <span style="font-size:24px;">🌿</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">Reset your password</h1>
          </div>
          <div style="padding:32px;">
            <p style="color:#374151;font-size:16px;margin-top:0;">Hi <strong>${d["name"]}</strong>,</p>
            <p style="color:#374151;">We received a request to reset your Kabon.Africa password. Click the button below to set a new one.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${d["resetUrl"]}" style="background:#16a34a;color:#fff;text-decoration:none;padding:16px 32px;border-radius:10px;font-weight:700;font-size:16px;display:inline-block;">
                Reset my password →
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your account is safe.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="color:#9ca3af;font-size:12px;word-break:break-all;">
              Or copy this link into your browser:<br/>
              <a href="${d["resetUrl"]}" style="color:#16a34a;">${d["resetUrl"]}</a>
            </p>
          </div>
          <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© 2025 Kabon.Africa — restoring Africa, one credit at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  project_submitted: {
    subject: "Your project has been submitted — CarbonAfrika",
    html: (d) => `
      <h2>Project Submitted Successfully</h2>
      <p>Your project <strong>${d["projectTitle"]}</strong> has been submitted for verification.</p>
      <p>Our team will review it shortly. You'll receive an email once the verification is complete.</p>
      <p>Project ID: <code>${d["projectId"]}</code></p>
      <br/><p>— The CarbonAfrika Team</p>
    `,
  },
  project_approved: {
    subject: "Your project has been approved! — CarbonAfrika",
    html: (d) => `
      <h2>Congratulations! Project Approved</h2>
      <p>Your project <strong>${d["projectTitle"]}</strong> has been verified.</p>
      <p>Carbon credits issued: <strong>${d["carbonTons"]} tons</strong></p>
      <p>Your carbon credit tokens are being minted to your wallet. Check your dashboard shortly.</p>
      <br/><p>— The CarbonAfrika Team</p>
    `,
  },
  project_rejected: {
    subject: "Project verification update — CarbonAfrika",
    html: (d) => `
      <h2>Project Verification Update</h2>
      <p>Your project <strong>${d["projectTitle"]}</strong> could not be verified at this time.</p>
      <p>Reason: ${d["notes"] ?? "Please contact support for details."}</p>
      <p>You may update your project documents and resubmit.</p>
      <br/><p>— The CarbonAfrika Team</p>
    `,
  },
  credit_sold: {
    subject: "Your carbon credits have been sold! — CarbonAfrika",
    html: (d) => `
      <h2>Carbon Credits Sold</h2>
      <p><strong>${d["tons"]} tons</strong> of your carbon credits from <em>${d["projectTitle"]}</em> were purchased.</p>
      <p>Amount received: <strong>${d["totalPrice"]} ${d["currency"]}</strong></p>
      <p>Check your dashboard to view your earnings.</p>
      <br/><p>— The CarbonAfrika Team</p>
    `,
  },
};
