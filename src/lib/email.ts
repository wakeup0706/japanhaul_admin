// Email service for sending verification codes using EmailJS
// EmailJS credentials are public by design - no security issues putting them in client code

import emailjs from '@emailjs/browser';

export interface EmailVerificationData {
  email: string;
  verificationCode: string;
  name: string;
}

export async function sendVerificationEmail(data: EmailVerificationData): Promise<boolean> {
  try {
    // EmailJS configuration - these are public credentials by design
    // Service ID, Template ID, and Public Key are meant to be exposed client-side
    const serviceId = 'service_3n5yq85'; // Your Service ID
    const templateId = 'template_z7sc9kf'; // Your Template ID
    const publicKey = 'Fr5sN-PFKqzhJe8RQ'; // Your Public Key

    const templateParams = {
      email: data.email,
      from_name: data.name || 'User',
      passcode: data.verificationCode,
      to_name: data.name || 'User',
      company_name: 'JapanHaul',
      reply_to: 'noreply@japanhaul.com',
    };

    // Send email using EmailJS (client-side)
    const result = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      publicKey
    );

    return result.status === 200;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

// Generate a 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
