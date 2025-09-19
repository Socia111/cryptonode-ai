import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Signal {
  id: string;
  symbol: string;
  direction: string;
  timeframe: string;
  score: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  source: string;
  algo: string;
  signal_grade: string;
  created_at: string;
  metadata: any;
}

export function AllSignalsPanel() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [timeframeFilter, setTimeframeFilter] = useState('all');
  const [strategyFilter, setStrategyFilter] = useState('all');
  const { toast } = useToast();

  const loadAllSignals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;
      
      setSignals(data || []);
      console.log(`Loaded ${data?.length || 0} total signals`);
    } catch (error) {
      console.error('Error loading signals:', error);
      toast({
        title: "Error",
        description: "Failed to load signals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMoreSignals = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('enhanced-signal-generation', {});
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Generated new signals across all quality levels",
      });
      
      // Wait a moment then reload
      setTimeout(loadAllSignals, 2000);
    } catch (error) {
      console.error('Error generating signals:', error);
      toast({
        title: "Error", 
        description: "Failed to generate signals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSignals();
  }, []);

  useEffect(() => {
    let filtered = signals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(signal => 
        signal.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.algo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Score filter
    if (scoreFilter !== 'all') {
      const [min, max] = scoreFilter.split('-').map(Number);
      filtered = filtered.filter(signal => 
        signal.score >= min && (max ? signal.score <= max : true)
      );
    }

    // Grade filter
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(signal => signal.signal_grade === gradeFilter);
    }

    // Timeframe filter
    if (timeframeFilter !== 'all') {
      filtered = filtered.filter(signal => signal.timeframe === timeframeFilter);
    }

    // Strategy filter
    if (strategyFilter !== 'all') {
      filtered = filtered.filter(signal => 
        signal.source.includes(strategyFilter) || signal.algo.includes(strategyFilter)
      );
    }

    setFilteredSignals(filtered);
  }, [signals, searchTerm, scoreFilter, gradeFilter, timeframeFilter, strategyFilter]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-green-600';
      case 'A': return 'bg-green-500';
      case 'B+': return 'bg-blue-500';
      case 'B': return 'bg-blue-400';
      case 'B-': return 'bg-blue-300';
      case 'C+': return 'bg-yellow-500';
      case 'C': return 'bg-yellow-400';
      case 'C-': return 'bg-yellow-300';
      case 'D+': return 'bg-orange-500';
      case 'D': return 'bg-orange-400';
      case 'D-': return 'bg-orange-300';
      case 'F': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 font-bold';
    if (score >= 70) return 'text-blue-600 font-semibold';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const highQualitySignals = filteredSignals.filter(s => s.score >= 75);
  const mediumQualitySignals = filteredSignals.filter(s => s.score >= 50 && s.score < 75);
  const lowQualitySignals = filteredSignals.filter(s => s.score < 50);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            All Trading Signals ({signals.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={generateMoreSignals} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Generate More
            </Button>
            <Button onClick={loadAllSignals} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Input
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Score Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="85-100">High (85-100)</SelectItem>
              <SelectItem value="70-84">Good (70-84)</SelectItem>
              <SelectItem value="50-69">Medium (50-69)</SelectItem>
              <SelectItem value="25-49">Low (25-49)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
              <SelectItem value="D">D</SelectItem>
              <SelectItem value="F">F</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Timeframes</SelectItem>
              <SelectItem value="1m">1m</SelectItem>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="30m">30m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="4h">4h</SelectItem>
              <SelectItem value="1d">1d</SelectItem>
            </SelectContent>
          </Select>
          <Select value={strategyFilter} onValueChange={setStrategyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Strategies</SelectItem>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
              <SelectItem value="experimental">Experimental</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            Showing: {filteredSignals.length} signals
          </div>
        </div>

        {/* Tabs for different quality levels */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({filteredSignals.length})</TabsTrigger>
            <TabsTrigger value="high">High Quality ({highQualitySignals.length})</TabsTrigger>
            <TabsTrigger value="medium">Medium ({mediumQualitySignals.length})</TabsTrigger>
            <TabsTrigger value="low">Low/Experimental ({lowQualitySignals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <SignalsTable signals={filteredSignals} getGradeColor={getGradeColor} getScoreColor={getScoreColor} />
          </TabsContent>
          <TabsContent value="high">
            <SignalsTable signals={highQualitySignals} getGradeColor={getGradeColor} getScoreColor={getScoreColor} />
          </TabsContent>
          <TabsContent value="medium">
            <SignalsTable signals={mediumQualitySignals} getGradeColor={getGradeColor} getScoreColor={getScoreColor} />
          </TabsContent>
          <TabsContent value="low">
            <SignalsTable signals={lowQualitySignals} getGradeColor={getGradeColor} getScoreColor={getScoreColor} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SignalsTable({ signals, getGradeColor, getScoreColor }: { 
  signals: Signal[], 
  getGradeColor: (grade: string) => string,
  getScoreColor: (score: number) => string 
}) {
  if (signals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No signals found with current filters
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {signals.map((signal) => (
        <div key={signal.id} className="border rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{signal.symbol}</span>
              <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'}>
                {signal.direction === 'LONG' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {signal.direction}
              </Badge>
              <Badge variant="outline">{signal.timeframe}</Badge>
              <Badge className={getGradeColor(signal.signal_grade || 'C')}>
                {signal.signal_grade || 'C'}
              </Badge>
            </div>
            <span className={getScoreColor(signal.score)}>
              {signal.score}%
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Entry:</span> ${signal.entry_price?.toFixed(4)}
            </div>
            <div>
              <span className="text-muted-foreground">SL:</span> ${signal.stop_loss?.toFixed(4)}
            </div>
            <div>
              <span className="text-muted-foreground">TP:</span> ${signal.take_profit?.toFixed(4)}
            </div>
            <div>
              <span className="text-muted-foreground">Confidence:</span> {(signal.confidence * 100)?.toFixed(1)}%
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div>
              <span>Source:</span> {signal.source}
            </div>
            <div>
              <span>Algorithm:</span> {signal.algo}
            </div>
            <div>
              <span>Time:</span> {new Date(signal.created_at).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}