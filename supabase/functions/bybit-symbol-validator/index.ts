import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SymbolValidationResult {
  valid: boolean;
  symbol: string;
  instrument_info?: any;
  trading_rules?: any;
  error?: string;
}

interface MarketValidationRequest {
  symbols: string[];
  category?: 'spot' | 'linear' | 'inverse' | 'option';
  exchange?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...requestData } = await req.json();

    console.log(`🔍 Bybit Symbol Validator - Action: ${action}`);

    switch (action) {
      case 'validate_symbol':
        return await validateSingleSymbol(requestData.symbol, requestData.category);
      
      case 'validate_symbols':
        return await validateMultipleSymbols(requestData as MarketValidationRequest);
      
      case 'get_trading_rules':
        return await getTradingRules(requestData.symbol, requestData.category);
      
      case 'check_symbol_status':
        return await checkSymbolStatus(requestData.symbol, requestData.category);
      
      case 'get_all_symbols':
        return await getAllSymbols(requestData.category);
      
      case 'validate_order_params':
        return await validateOrderParameters(requestData);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Symbol Validator error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function validateSingleSymbol(symbol: string, category: string = 'linear'): Promise<Response> {
  try {
    console.log(`🔍 Validating symbol: ${symbol} (${category})`);

    const instrumentsUrl = `https://api.bybit.com/v5/market/instruments-info?category=${category}&symbol=${symbol}`;
    const response = await fetch(instrumentsUrl);
    const data = await response.json();

    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }

    if (!data.result?.list?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          valid: false,
          symbol,
          error: 'Symbol not found',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const instrumentInfo = data.result.list[0];
    const tradingRules = extractTradingRules(instrumentInfo);

    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        symbol,
        instrument_info: instrumentInfo,
        trading_rules: tradingRules,
        status: instrumentInfo.status,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        symbol,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function validateMultipleSymbols(request: MarketValidationRequest): Promise<Response> {
  try {
    console.log(`🔍 Validating ${request.symbols.length} symbols`);

    const category = request.category || 'linear';
    const results: SymbolValidationResult[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < request.symbols.length; i += batchSize) {
      const batch = request.symbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          const validation = await validateSymbolInternal(symbol, category);
          return validation;
        } catch (error) {
          return {
            valid: false,
            symbol,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Rate limiting between batches
      if (i + batchSize < request.symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const validSymbols = results.filter(r => r.valid);
    const invalidSymbols = results.filter(r => !r.valid);

    return new Response(
      JSON.stringify({
        success: true,
        total_symbols: request.symbols.length,
        valid_count: validSymbols.length,
        invalid_count: invalidSymbols.length,
        valid_symbols: validSymbols.map(r => r.symbol),
        invalid_symbols: invalidSymbols.map(r => ({ symbol: r.symbol, error: r.error })),
        detailed_results: results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function validateSymbolInternal(symbol: string, category: string): Promise<SymbolValidationResult> {
  const instrumentsUrl = `https://api.bybit.com/v5/market/instruments-info?category=${category}&symbol=${symbol}`;
  const response = await fetch(instrumentsUrl);
  const data = await response.json();

  if (data.retCode !== 0) {
    throw new Error(`API error: ${data.retMsg}`);
  }

  if (!data.result?.list?.length) {
    return {
      valid: false,
      symbol,
      error: 'Symbol not found'
    };
  }

  const instrumentInfo = data.result.list[0];
  const tradingRules = extractTradingRules(instrumentInfo);

  return {
    valid: true,
    symbol,
    instrument_info: instrumentInfo,
    trading_rules: tradingRules
  };
}

async function getTradingRules(symbol: string, category: string = 'linear'): Promise<Response> {
  try {
    const validation = await validateSymbolInternal(symbol, category);
    
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid symbol');
    }

    return new Response(
      JSON.stringify({
        success: true,
        symbol,
        trading_rules: validation.trading_rules,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        symbol,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function checkSymbolStatus(symbol: string, category: string = 'linear'): Promise<Response> {
  try {
    const validation = await validateSymbolInternal(symbol, category);
    
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid symbol');
    }

    const status = validation.instrument_info?.status;
    const isActive = status === 'Trading';

    return new Response(
      JSON.stringify({
        success: true,
        symbol,
        status,
        is_active: isActive,
        can_trade: isActive,
        instrument_info: validation.instrument_info,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        symbol,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function getAllSymbols(category: string = 'linear'): Promise<Response> {
  try {
    console.log(`📋 Fetching all symbols for category: ${category}`);

    const instrumentsUrl = `https://api.bybit.com/v5/market/instruments-info?category=${category}`;
    const response = await fetch(instrumentsUrl);
    const data = await response.json();

    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }

    const instruments = data.result?.list || [];
    const activeSymbols = instruments.filter((inst: any) => inst.status === 'Trading');
    const symbolList = instruments.map((inst: any) => inst.symbol);
    const activeSymbolList = activeSymbols.map((inst: any) => inst.symbol);

    return new Response(
      JSON.stringify({
        success: true,
        category,
        total_symbols: instruments.length,
        active_symbols: activeSymbols.length,
        all_symbols: symbolList,
        active_symbols_list: activeSymbolList,
        last_updated: new Date().toISOString(),
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function validateOrderParameters(orderParams: any): Promise<Response> {
  try {
    console.log(`⚖️ Validating order parameters for ${orderParams.symbol}`);

    const validation = await validateSymbolInternal(orderParams.symbol, orderParams.category || 'linear');
    
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid symbol');
    }

    const rules = validation.trading_rules;
    const errors: string[] = [];

    // Validate quantity
    if (orderParams.qty) {
      const qty = parseFloat(orderParams.qty);
      
      if (qty < rules.min_order_qty) {
        errors.push(`Quantity ${qty} below minimum ${rules.min_order_qty}`);
      }
      
      if (rules.max_order_qty && qty > rules.max_order_qty) {
        errors.push(`Quantity ${qty} above maximum ${rules.max_order_qty}`);
      }
      
      // Check quantity step
      const remainder = (qty - rules.min_order_qty) % rules.qty_step;
      if (remainder > 0.0001) { // Small tolerance for floating point
        errors.push(`Quantity ${qty} doesn't match step size ${rules.qty_step}`);
      }
    }

    // Validate price (if provided)
    if (orderParams.price) {
      const price = parseFloat(orderParams.price);
      
      if (rules.min_price && price < rules.min_price) {
        errors.push(`Price ${price} below minimum ${rules.min_price}`);
      }
      
      if (rules.max_price && price > rules.max_price) {
        errors.push(`Price ${price} above maximum ${rules.max_price}`);
      }
      
      // Check price tick size
      const remainder = price % rules.tick_size;
      if (remainder > 0.0001) {
        errors.push(`Price ${price} doesn't match tick size ${rules.tick_size}`);
      }
    }

    // Validate order type
    const validOrderTypes = ['Market', 'Limit'];
    if (orderParams.orderType && !validOrderTypes.includes(orderParams.orderType)) {
      errors.push(`Invalid order type: ${orderParams.orderType}`);
    }

    // Validate side
    const validSides = ['Buy', 'Sell'];
    if (orderParams.side && !validSides.includes(orderParams.side)) {
      errors.push(`Invalid side: ${orderParams.side}`);
    }

    const isValid = errors.length === 0;

    return new Response(
      JSON.stringify({
        success: true,
        valid: isValid,
        symbol: orderParams.symbol,
        errors: errors,
        trading_rules: rules,
        validated_params: {
          qty: orderParams.qty,
          price: orderParams.price,
          orderType: orderParams.orderType,
          side: orderParams.side
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

function extractTradingRules(instrumentInfo: any): any {
  const lotSizeFilter = instrumentInfo.lotSizeFilter || {};
  const priceFilter = instrumentInfo.priceFilter || {};
  
  return {
    // Quantity rules
    min_order_qty: parseFloat(lotSizeFilter.minOrderQty || '0'),
    max_order_qty: parseFloat(lotSizeFilter.maxOrderQty || '0'),
    qty_step: parseFloat(lotSizeFilter.qtyStep || '0.001'),
    
    // Price rules
    min_price: parseFloat(priceFilter.minPrice || '0'),
    max_price: parseFloat(priceFilter.maxPrice || '0'),
    tick_size: parseFloat(priceFilter.tickSize || '0.01'),
    
    // Trading status
    status: instrumentInfo.status,
    trading_enabled: instrumentInfo.status === 'Trading',
    
    // Additional info
    base_coin: instrumentInfo.baseCoin,
    quote_coin: instrumentInfo.quoteCoin,
    settle_coin: instrumentInfo.settleCoin,
    contract_type: instrumentInfo.contractType,
    leverage_filter: instrumentInfo.leverageFilter,
    
    // Risk management
    unified_margin_trade: instrumentInfo.unifiedMarginTrade,
    funding_interval: instrumentInfo.fundingInterval,
    launch_time: instrumentInfo.launchTime,
    
    // Trading specifications
    innovation: instrumentInfo.innovation === '1',
    margin_trading: instrumentInfo.marginTrading,
    spot_hedging: instrumentInfo.spotHedging
  };
}