export function CakeLogo({ className = "", size = 60 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Cake slice body */}
      <path
        d="M 30 50 L 70 50 L 60 90 L 40 90 Z"
        fill="#f4d4a8"
        stroke="#3d2914"
        strokeWidth="2"
      />
      
      {/* Frosting layers */}
      <path
        d="M 30 50 L 70 50 L 68 58 L 32 58 Z"
        fill="#ffc0e0"
        stroke="#3d2914"
        strokeWidth="2"
      />
      
      <path
        d="M 32 58 L 68 58 L 66 66 L 34 66 Z"
        fill="#ffe8b3"
        stroke="#3d2914"
        strokeWidth="2"
      />
      
      <path
        d="M 34 66 L 66 66 L 64 74 L 36 74 Z"
        fill="#ffc0e0"
        stroke="#3d2914"
        strokeWidth="2"
      />
      
      {/* Cherry on top */}
      <circle cx="50" cy="45" r="5" fill="#d4183d" stroke="#3d2914" strokeWidth="1.5" />
      <path
        d="M 50 45 Q 52 38 54 35"
        stroke="#228b22"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Left arm */}
      <path
        d="M 25 65 L 20 60 M 25 65 L 20 70"
        stroke="#3d2914"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M 30 65 L 25 65"
        stroke="#3d2914"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* Right arm */}
      <path
        d="M 75 65 L 80 60 M 75 65 L 80 70"
        stroke="#3d2914"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M 70 65 L 75 65"
        stroke="#3d2914"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* Left leg */}
      <path
        d="M 42 90 L 38 105 M 38 105 L 35 105 M 38 105 L 41 105"
        stroke="#3d2914"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* Right leg */}
      <path
        d="M 58 90 L 62 105 M 62 105 L 59 105 M 62 105 L 65 105"
        stroke="#3d2914"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* Happy face */}
      <circle cx="42" cy="70" r="2.5" fill="#3d2914" />
      <circle cx="58" cy="70" r="2.5" fill="#3d2914" />
      <path
        d="M 42 78 Q 50 83 58 78"
        stroke="#3d2914"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
