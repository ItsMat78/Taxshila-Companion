export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=co.median.android.yeeemel&pcampaignid=web_share';

// The official four-colour Google Play triangle mark.
export function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <path d="M47 24.5C40 28.4 36 35.9 36 45.7v420.6c0 9.8 4 17.3 11 21.2l244-231.3L47 24.5z" fill="#00D2FF" />
      <path d="M376.6 180.5L291 256l85.6 75.5 73.6-41.9c11.8-6.7 11.8-23.5 0-30.2l-73.6-78.9z" fill="#FFCE00" />
      <path d="M47 24.5L291 256l85.6-75.5L86.4 16.1C73.6 9 58.3 13.4 47 24.5z" fill="#00F076" />
      <path d="M47 487.5c11.3 11.1 26.6 15.5 39.4 8.4l290.2-164.4L291 256 47 487.5z" fill="#FF3A44" />
    </svg>
  );
}
