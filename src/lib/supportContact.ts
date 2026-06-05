export const SUPPORT_CONTACT_LABEL = 'InLight AI support';
export const SUPPORT_CONTACT_MASKED = 'inlightai26 [at] gmail [dot] com';

const SUPPORT_CONTACT_PARTS = ['inlightai26', 'gmail', 'com'] as const;

export function getSupportContactHref() {
  const [user, domain, tld] = SUPPORT_CONTACT_PARTS;
  return `mailto:${user}@${domain}.${tld}`;
}
