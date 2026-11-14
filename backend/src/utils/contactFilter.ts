// Lightweight contact-detail filter for pre-booking messages, per the documented
// in-app messaging model: soft-block contact details (don't silently deliver them,
// don't auto-ban the sender), not a heavyweight NLP classifier.

const PHONE_RE = /(?:\+?84|0)?[\s.\-]?(?:\(?\d{2,4}\)?[\s.\-]?){2,4}\d{3,4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_RE = /\b(zalo|whatsapp|wechat|telegram|instagram|facebook|fb\.com|ig:|@[a-zA-Z0-9_]{3,})\b/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

export interface FilterResult {
  filteredBody: string;
  wasFiltered: boolean;
  matches: string[];
}

export function filterContactDetails(raw: string): FilterResult {
  const matches: string[] = [];
  let filtered = raw;

  for (const re of [PHONE_RE, EMAIL_RE, SOCIAL_RE, URL_RE]) {
    filtered = filtered.replace(re, (m) => {
      matches.push(m);
      return "[redacted — contact details are hidden until after booking]";
    });
  }

  return { filteredBody: filtered, wasFiltered: matches.length > 0, matches };
}
