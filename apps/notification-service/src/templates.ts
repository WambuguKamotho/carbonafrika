interface EmailTemplate {
  subject: string;
  html: (data: Record<string, unknown>) => string;
}

export const templates: Record<string, EmailTemplate> = {
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
