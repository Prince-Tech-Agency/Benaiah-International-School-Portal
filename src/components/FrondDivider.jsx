export default function FrondDivider({ center = false, color = '#C89B5C' }) {
  return (
    <svg
      className={`frond-divider${center ? ' center' : ''}`}
      viewBox="0 0 72 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 7c8-6 16-6 24-2 8 4 16 4 24 0 8-4 16-4 24 2"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
