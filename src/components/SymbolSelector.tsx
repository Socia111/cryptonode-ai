import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Settings } from 'lucide-react';
import { useWhitelistSettings } from '@/hooks/useWhitelistSettings';
import { useToast } from '@/hooks/use-toast';

export function SymbolSelector() {
  const { settings, addSymbol, removeSymbol, updateWhitelistMode } = useWhitelistSettings();
  const [newSymbol, setNewSymbol] = useState('');
  const { toast } = useToast();

  const handleAddSymbol = async () => {
    if (!newSymbol.trim()) return;
    
    const success = await addSymbol(newSymbol);
    if (success) {
      setNewSymbol('');
      toast({
        title: "Symbol Added",
        description: `${newSymbol.toUpperCase()} added to selected symbols`,
      });
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    await removeSymbol(symbol);
    toast({
      title: "Symbol Removed",
      description: `${symbol} removed from selected symbols`,
    });
  };

  const toggleWhitelist = async () => {
    await updateWhitelistMode(!settings.whitelist_enabled);
    toast({
      title: settings.whitelist_enabled ? "All Symbols Mode" : "Selected Symbols Mode",
      description: settings.whitelist_enabled 
        ? "Now showing signals from all 2000+ symbols" 
        : "Now showing signals from selected symbols only",
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary" />
            <span>Symbol Selection</span>
            <Badge variant={settings.whitelist_enabled ? "default" : "secondary"}>
              {settings.whitelist_enabled ? `${settings.whitelist_pairs.length} Selected` : 'All Symbols'}
            </Badge>
          </div>
          <Button
            onClick={toggleWhitelist}
            variant={settings.whitelist_enabled ? "default" : "outline"}
            size="sm"
          >
            {settings.whitelist_enabled ? 'Switch to All' : 'Use Selected Only'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.whitelist_enabled && (
          <>
            {/* Add Symbol */}
            <div className="flex space-x-2">
              <Input
                placeholder="Add symbol (e.g., BTCUSDT)"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
                className="flex-1"
              />
              <Button onClick={handleAddSymbol} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Selected Symbols */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Selected Symbols ({settings.whitelist_pairs.length}/8 recommended)</div>
              <div className="flex flex-wrap gap-2">
                {settings.whitelist_pairs.map((symbol) => (
                  <Badge
                    key={symbol}
                    variant="outline"
                    className="flex items-center space-x-1 px-2 py-1"
                  >
                    <span>{symbol}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveSymbol(symbol)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            {settings.whitelist_pairs.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No symbols selected. Add symbols to filter signals.
              </div>
            )}
          </>
        )}

        {!settings.whitelist_enabled && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Showing signals from all available symbols (~2000+).
            Switch to "Selected Only" mode to filter to specific symbols.
          </div>
        )}
      </CardContent>
    </Card>
  );
}