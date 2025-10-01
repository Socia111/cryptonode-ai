import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

export const LiveBadge = () => {
  return (
    <Badge 
      variant="outline" 
      className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50 text-green-700 dark:text-green-400 animate-pulse"
    >
      <Activity className="h-3 w-3 mr-1 animate-pulse" />
      LIVE TRADING
    </Badge>
  );
};
