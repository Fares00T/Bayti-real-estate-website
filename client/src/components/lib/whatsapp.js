// WhatsApp click-to-chat links (https://wa.me/<number>?text=...).
// wa.me wants the number in international form without "+" or spaces, and
// only Algerian mobile numbers (05, 06, 07) have WhatsApp: landlines get no link.
export const whatsappNumber = (phone) => {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `213${digits.slice(1)}`;
  return /^213[567]\d{8}$/.test(digits) ? digits : null;
};

export const whatsappLink = (phone, message) => {
  const number = whatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
};
