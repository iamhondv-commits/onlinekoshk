export const ALLOWED_EMAIL_DOMAINS = [
    'gmail.com',
    'googlemail.com',
    'outlook.com',
    'outlook.sa',
    'hotmail.com',
    'live.com',
    'yahoo.com',
    'yahoo.co.uk',
    'yahoo.fr',
    'icloud.com',
    'me.com',
    'mac.com',
    'proton.me',
    'protonmail.com',
    'aol.com',
    'zoho.com',
    'gmx.com',
    'yandex.com',
    'mail.com'
];

export function validateTrustedEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim().toLowerCase();
    const atIndex = trimmed.lastIndexOf('@');
    if (atIndex <= 0 || atIndex === trimmed.length - 1) return false;
    const domain = trimmed.slice(atIndex + 1);
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return false;
    return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export function getEmailValidationMessage() {
    return 'يرجى استخدام بريد إلكتروني موثوق (مثل Gmail، Outlook، Yahoo، iCloud، Proton)';
}

if (typeof window !== 'undefined') {
    window.validateTrustedEmail = validateTrustedEmail;
    window.getEmailValidationMessage = getEmailValidationMessage;
}
