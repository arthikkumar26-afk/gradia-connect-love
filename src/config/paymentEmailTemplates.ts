export interface PaymentEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const paymentEmailTemplates: PaymentEmailTemplate[] = [
  {
    id: "internship-registration",
    name: "Internship registration — detailed",
    subject: "Payment Request {{amount}} – {{job_title}}",
    body: `Dear {{candidate_name}},

Thank you for your interest in the {{job_title}} with Gradia.

We are pleased to invite you to take the next step by completing the {{amount}} registration fee. This registration activates your access to Gradia’s internship and career-support services, starting from the interview process through project completion and post-internship job assistance.

What’s Included with Your {{amount}} Registration:
1. Interview & Onboarding Assistance – Guidance throughout the interview and selection process, candidate onboarding and program orientation, and assistance in understanding the internship structure, expectations, and process.
2. Dedicated Project Manager / Mentor Support – Project allocation and orientation, regular project guidance and reviews, technical and project-related support, progress monitoring and feedback, assistance with project completion and submission.
3. Industry-Oriented Project – An opportunity to work on a practical, industry-oriented project designed to provide hands-on experience and strengthen your professional profile.
4. Internship Completion Support – Upon successfully completing the applicable internship requirements, you will receive the relevant internship documentation and certificate as per the program terms.
5. Post-Internship Job Assistance – Resume and professional profile guidance, relevant job opportunity sharing, interview preparation and guidance, candidate profile assistance, support throughout the recruitment process.

Please note: Job assistance is a career-support service and does not constitute a guarantee of employment or placement.

Registration Fee:
{{amount}} — One-Time Registration Fee.
To proceed with your registration and activate the above services, please complete the payment using the payment option below.

{{payment_section}}

We look forward to welcoming you to Gradia and supporting you throughout your internship and career journey.`,
  },
  {
    id: "payment-request",
    name: "Payment request — concise",
    subject: "Payment Request {{amount}} – {{job_title}}",
    body: `Dear {{candidate_name}},

You have a payment request of {{amount}} for {{job_title}}.

Please complete the payment using the secure payment option below. You can pay by UPI, card, net banking, or wallet.

You will receive a confirmation email after your payment is received.

Thank you.`,
  },
];