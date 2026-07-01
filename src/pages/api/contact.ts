export const prerender = false;

import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { Resend } from 'resend';
import siteConfig from '@/config/site.config';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.email('Please enter a valid email address'),
  phone: z.string().max(50).optional(),
  company: z.string().max(100).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  honeypot: z.string().max(0),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const data = {
      name: formData.get('name')?.toString() || '',
      email: formData.get('email')?.toString() || '',
      phone: formData.get('phone')?.toString() || '',
      company: formData.get('company')?.toString() || '',
      subject: formData.get('subject')?.toString() || '',
      message: formData.get('message')?.toString() || '',
      honeypot: formData.get('honeypot')?.toString() || '',
    };

    // Validate
    const result = contactSchema.safeParse(data);

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const error of result.error.issues) {
        const field = error.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(error.message);
      }

      return new Response(
        JSON.stringify({ success: false, errors: fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Honeypot check (bot detection)
    if (result.data.honeypot) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send email via Resend
    const apiKey = import.meta.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not set');
      return new Response(
        JSON.stringify({ success: false, errors: { form: ['Email service is not configured'] } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(apiKey);
    const toEmail = siteConfig.email;
    const siteLabel = siteConfig.name;

    const subject = result.data.subject
      ? `[${siteLabel}] ${result.data.subject}`
      : `[${siteLabel}] New contact from ${result.data.name}`;

    const { error } = await resend.emails.send({
      from: `Cyberline Website <noreply@mail.cyberlinesolutions.com>`, 
      to: toEmail,
      replyTo: result.data.email,
      subject,
      html: `
        <p><strong>Name:</strong> ${result.data.name}</p>
        <p><strong>Email:</strong> ${result.data.email}</p>
        ${result.data.phone ? `<p><strong>Phone:</strong> ${result.data.phone}</p>` : ''}
        ${result.data.company ? `<p><strong>Company:</strong> ${result.data.company}</p>` : ''}
        <p><strong>Subject:</strong> ${result.data.subject || 'General Inquiry'}</p>
        <p><strong>Message:</strong></p>
        <p>${result.data.message.replace(/\n/g, '<br>')}</p>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(
        JSON.stringify({ success: false, errors: { form: [error.message || 'Failed to send email'] } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- NEW: Forward data to n8n Webhook for automations (Discord, etc.) ---
    try {
      // It is best practice to store this in your .env file as N8N_WEBHOOK_URL
      // Remember to change /webhook-test/ to /webhook/ when your n8n workflow goes live
      const n8nWebhookUrl = import.meta.env.N8N_WEBHOOK_URL || 'https://n8n.cyberlinesolutions.com/webhook-test/contact';
      
      await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: result.data.name,
          clientEmail: result.data.email,
          clientPhone: result.data.phone || 'Not provided',
          clientCompany: result.data.company || 'Not provided',
          clientSubject: result.data.subject || 'General Inquiry',
          clientMessage: result.data.message,
          submittedAt: new Date().toISOString()
        }),
      });
    } catch (n8nError) {
      // We log the error but DO NOT throw it. 
      // If the local n8n server is offline, the client still gets a successful form submission.
      console.error('Failed to ping n8n webhook (non-fatal):', n8nError);
    }
    // ------------------------------------------------------------------------

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contact form error:', error);

    return new Response(
      JSON.stringify({ success: false, errors: { form: ['An unexpected error occurred'] } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
