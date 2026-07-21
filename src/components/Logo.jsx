export default function Logo({ size = 40, light = false }) {
  const leaf = light ? '#EAF3EA' : '#2E7048';
  const trunk = '#C89B5C';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 58V30" stroke={trunk} strokeWidth="4" strokeLinecap="round" />
      <path d="M32 58c-3 0-9-2-9-2s3-6 9-6 9 6 9 6-6 2-9 2z" fill={trunk} opacity="0.5" />
      <g>
        <path d="M32 30C24 16 8 18 3 24c8 4 18 3 24-1-9 5-16 14-15 23 7-4 13-13 16-22-2 9-1 18 3 24 2-9 1-18 1-18z" fill={leaf} />
        <path d="M32 30c8-14 24-12 29-6-8 4-18 3-24-1 9 5 16 14 15 23-7-4-13-13-16-22 2 9 1 18-1 18z" fill={leaf} />
      </g>
    </svg>
  );
}
