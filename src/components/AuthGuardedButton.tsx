import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthGuardedButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const AuthGuardedButton: React.FC<AuthGuardedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = "default",
  size = "default",
  className
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleClick = () => {
    if (!user) {
      return; // Button will be disabled, so this shouldn't trigger
    }
    onClick();
  };

  const isDisabled = disabled || loading || !user;

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={className}
      >
        {children}
      </Button>
      {!loading && !user && (
        <p className="text-xs text-muted-foreground">
          Sign in to execute trades
        </p>
      )}
    </div>
  );
};