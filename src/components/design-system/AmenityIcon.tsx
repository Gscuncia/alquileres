import React from "react";

export interface AmenityIconProps {
  label: string;
  className?: string;
}

export const AmenityIcon: React.FC<AmenityIconProps> = ({
  label,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CheckCircleIcon className="h-5 w-5 shrink-0 text-muted" />
      <span className="text-body-sm text-ink">{label}</span>
    </div>
  );
};

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
