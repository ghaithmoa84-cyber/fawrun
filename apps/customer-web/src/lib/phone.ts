/**
 * Formats a phone number for WhatsApp wa.me links.
 * Automatically converts Syrian mobile numbers (e.g., 09XXXXXXXX) to 9639XXXXXXXX.
 */
export function formatWhatsappUrl(phone: string, text?: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('09') && cleaned.length === 10) {
    cleaned = '963' + cleaned.substring(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  const baseUrl = `https://wa.me/${cleaned}`;
  return text ? `${baseUrl}?text=${encodeURIComponent(text)}` : baseUrl;
}

/**
 * Formats a phone number for direct dial links (tel:).
 */
export function formatTelUrl(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
}
