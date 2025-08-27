import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatusChipProps {
  type: 'long' | 'short' | 'strong' | 'medium' | 'weak' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

const StatusChip: React.FC<StatusChipProps> = ({ 
  type, 
  children, 
  showIcon = false, 
  className 
}) => {
  const getChipClasses = () => {
    switch (type) {
      case 'long':
        return 'status-chip-long';
      case 'short':
        return 'status-chip-short';
      case 'strong':
        return 'status-chip-strong';
      case 'medium':
        return 'status-chip-medium';
      case 'weak':
        return 'status-chip-weak';
      case 'success':
        return 'bg-success/15 text-success border-success/30';
      case 'warning':
        return 'bg-warning/15 text-warning border-warning/30';
      case 'danger':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getIcon = () => {
    if (!showIcon) return null;
    
    switch (type) {
      case 'long':
        return <TrendingUp className="w-3 h-3" />;
      case 'short':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'px-2 py-1 text-xs font-medium rounded-lg border',
        getChipClasses(),
        className
      )}
    >
      <div className="flex items-center gap-1">
        {getIcon()}
        {children}
      </div>
    </Badge>
  );
};

export default StatusChip;