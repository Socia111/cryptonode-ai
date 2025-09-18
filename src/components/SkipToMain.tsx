import React from 'react';

interface SkipToMainProps {
  targetId?: string;
  className?: string;
}

export function SkipToMain({ targetId = 'main-content', className = '' }: SkipToMainProps) {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.getElementById(targetId);
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleSkip}
      className={`
        fixed top-4 left-4 z-50 
        px-4 py-2 
        bg-primary text-primary-foreground 
        rounded-md 
        font-medium 
        transition-transform duration-200 
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        -translate-y-full opacity-0 
        focus:translate-y-0 focus:opacity-100
        ${className}
      `}
    >
      Skip to main content
    </a>
  );
}