import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemService {
  service_name: string;
  status: string;
  last_update: string;
  error_count: number;
  success_count: number;
}

const SystemStatus = () => {
  const [services, setServices] = useState<SystemService[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSystemStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_status')
        .select('*')
        .order('service_name');

      if (error) {
        console.error('Error fetching system status:', error);
        throw error;
      }

      setServices(data || []);
    } catch (error: any) {
      console.error('Failed to fetch system status:', error);
      toast({
        title: "Error",
        description: "Failed to load system status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'healthy':
        return <Badge className="bg-green-500 hover:bg-green-600">🟢 Active</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600">🟡 Warning</Badge>;
      case 'error':
      case 'failed':
        return <Badge variant="destructive">🔴 Error</Badge>;
      default:
        return <Badge variant="outline">⚪ Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2">Loading system status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Status
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSystemStatus}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {services.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No system services found
          </div>
        ) : (
          services.map((service) => (
            <div 
              key={service.service_name}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <div>
                  <h4 className="font-medium capitalize">
                    {service.service_name.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(service.last_update).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {service.error_count > 0 && (
                  <span className="text-sm text-red-500">
                    {service.error_count} errors
                  </span>
                )}
                {service.success_count > 0 && (
                  <span className="text-sm text-green-500">
                    {service.success_count} success
                  </span>
                )}
                {getStatusBadge(service.status)}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default SystemStatus;