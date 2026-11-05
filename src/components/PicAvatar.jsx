const GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #0ea5e9, #2563eb)',
  'linear-gradient(135deg, #10b981, #0d9488)',
  'linear-gradient(135deg, #f59e0b, #ea580c)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #14b8a6, #0891b2)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #f43f5e, #e11d48)',
];

function initialsOf(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function gradientOf(name) {
  const key = String(name ?? '');
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 997;
  }

  return GRADIENTS[hash % GRADIENTS.length];
}

export default function PicAvatar({ name, size = 'md', muted = false, className = '' }) {
  const label = initialsOf(name) || '?';
  const style = muted
    ? undefined
    : { backgroundImage: gradientOf(name) };

  return (
    <span
      className={`pic-avatar pic-avatar-${size} ${
        muted ? 'pic-avatar-muted' : ''
      } ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      {muted ? '?' : label}
    </span>
  );
}
