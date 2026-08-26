export default function Logo({ size = 20, fg = '#131311' }) {
  return (
    <svg className="logo-mark" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M24 2.5 L29.4 18.6 L45.5 24 L29.4 29.4 L24 45.5 L18.6 29.4 L2.5 24 L18.6 18.6 Z M24 21.4 A2.6 2.6 0 1 0 24 26.6 A2.6 2.6 0 1 0 24 21.4 Z"
        fill={fg}
      />
    </svg>
  )
}
