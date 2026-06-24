"use client";
import { useState } from "react";
import { Mail, MapPin, Clock, Send, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState("");

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("https://formsubmit.co/ajax/admin@kabon.africa", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name:    form.name,
          email:   form.email,
          subject: form.subject,
          message: form.message,
          _subject: `[Kabon Contact] ${form.subject}`,
          _captcha: "false",
        }),
      });
      if (!res.ok) throw new Error("Delivery failed");
      setSent(true);
    } catch {
      setError("Something went wrong. Please email us directly at admin@kabon.africa");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero banner */}
      <div className="relative overflow-hidden bg-forest-900">
        {/* Background image layer */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/70 via-forest-900/60 to-forest-950/80" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/80 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/20">
            <Mail className="w-3.5 h-3.5" />
            Get in Touch
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            We'd love to<br />hear from you
          </h1>
          <p className="text-forest-200 text-lg max-w-xl mx-auto">
            Whether you're a landowner, buyer, partner, or just curious — our team responds within 24 hours.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Contact info panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative overflow-hidden rounded-2xl shadow-card">
              {/* Panel background */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=800&q=70&auto=format&fit=crop"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-forest-950/85" />
              <div className="relative p-7 space-y-7">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Contact Information</h2>
                  <p className="text-forest-300 text-sm">Reach out any time — we're here to help.</p>
                </div>
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-forest-700/60 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-forest-200" />
                    </div>
                    <div>
                      <div className="text-xs text-forest-400 font-medium uppercase tracking-wide mb-0.5">Email</div>
                      <a href="mailto:admin@kabon.africa" className="text-white font-semibold hover:text-forest-300 transition-colors">
                        admin@kabon.africa
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-forest-700/60 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-forest-200" />
                    </div>
                    <div>
                      <div className="text-xs text-forest-400 font-medium uppercase tracking-wide mb-0.5">Location</div>
                      <div className="text-white font-semibold">Nairobi, Kenya</div>
                      <div className="text-forest-400 text-sm">East Africa</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-forest-700/60 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-forest-200" />
                    </div>
                    <div>
                      <div className="text-xs text-forest-400 font-medium uppercase tracking-wide mb-0.5">Response Time</div>
                      <div className="text-white font-semibold">Within 24 hours</div>
                      <div className="text-forest-400 text-sm">Mon – Fri, 8 am – 6 pm EAT</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <p className="text-forest-300 text-sm leading-relaxed">
                    For project verification or partnership inquiries, please include your project type and location in your message so we can route you to the right team.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 space-y-3">
              <h3 className="font-bold text-gray-900 text-sm">Quick Links</h3>
              <div className="space-y-2">
                {[
                  { href: "/register",            label: "Register as a Landowner" },
                  { href: "/partner-application", label: "Apply as a Community Partner" },
                  { href: "/marketplace",         label: "Browse Carbon Credits" },
                  { href: "/standard",            label: "Kabon Carbon Standard" },
                  { href: "/guides",              label: "Project Guides" },
                ].map(l => (
                  <a key={l.href} href={l.href}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-forest-50 hover:text-forest-700 text-sm text-gray-700 transition-colors group">
                    {l.label}
                    <span className="text-gray-300 group-hover:text-forest-500 text-xs">→</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card">
              {/* Subtle background pattern */}
              <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=60&auto=format&fit=crop"
                  alt=""
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>

              <div className="relative p-8">
                {sent ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-forest-100 flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-forest-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-500 max-w-sm">
                      Thank you for reaching out. We'll get back to you at <strong>{form.email}</strong> within 24 hours.
                    </p>
                    <button
                      onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                      className="mt-6 text-sm text-forest-600 hover:text-forest-800 font-medium underline">
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-7">
                      <h2 className="text-2xl font-black text-gray-900 mb-1">Send us a message</h2>
                      <p className="text-gray-500 text-sm">Fill in the form and we'll reply to your email directly.</p>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 flex items-start gap-2">
                        <span>⚠️</span><span>{error}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Your Name</label>
                          <input className="input" value={form.name} onChange={set("name")} placeholder="Jane Wanjiru" required />
                        </div>
                        <div>
                          <label className="label">Email Address</label>
                          <input type="email" className="input" value={form.email} onChange={set("email")} placeholder="jane@example.com" required />
                        </div>
                      </div>

                      <div>
                        <label className="label">Subject</label>
                        <select className="input" value={form.subject} onChange={set("subject")} required>
                          <option value="">Select a topic…</option>
                          <option value="Project Registration">Project Registration</option>
                          <option value="Carbon Credit Purchase">Carbon Credit Purchase</option>
                          <option value="Partnership Inquiry">Partnership Inquiry</option>
                          <option value="Verification Process">Verification Process</option>
                          <option value="Technical Support">Technical Support</option>
                          <option value="Press & Media">Press & Media</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Message</label>
                        <textarea
                          className="input resize-none leading-relaxed"
                          rows={6}
                          value={form.message}
                          onChange={set("message")}
                          placeholder="Tell us about your project, question, or how we can help…"
                          required
                          minLength={20}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full btn-primary py-3.5 text-base font-bold flex items-center justify-center gap-2"
                        disabled={sending}>
                        {sending ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Message
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
