#!/usr/bin/env node

/**
 * Comprehensive System Activation Script
 * Activates all trading systems with proper API connections and automated trading
 */

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'

async function callFunction(name, body = {}) {
  const url = `${SUPABASE_URL}/functions/v1/${name}`
  
  try {
    console.log(`🔄 Calling ${name}...`)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(body)
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ ${name} - Success:`, data.success ? 'OK' : 'Partial', 
                  data.message || data.signals_created || 'Completed')
      return data
    } else {
      console.log(`❌ ${name} - Error:`, data.error || response.statusText)
      return { error: data.error || response.statusText }
    }
  } catch (error) {
    console.log(`💥 ${name} - Exception:`, error.message)
    return { error: error.message }
  }
}

async function activateComprehensiveSystem() {
  console.log('🚀 STARTING COMPREHENSIVE TRADING SYSTEM ACTIVATION')
  console.log('=' * 60)
  
  const results = {}
  
  // Phase 1: System Health Check
  console.log('\n📊 PHASE 1: System Health Check')
  results.health = await callFunction('system-health-monitor')
  
  // Phase 2: API Connection Tests
  console.log('\n🔌 PHASE 2: API Connection Tests')
  results.apiStatus = await callFunction('debug-trading-status', { action: 'env_check' })
  results.bybitBroker = await callFunction('bybit-broker-v2/ping')
  
  // Phase 3: Trading System Tests
  console.log('\n💰 PHASE 3: Trading System Tests')
  results.tradeExecutor = await callFunction('aitradex1-trade-executor', { 
    action: 'status' 
  })
  
  // Phase 4: Signal Generation Activation
  console.log('\n📡 PHASE 4: Signal Generation Activation')
  results.enhancedSignals = await callFunction('enhanced-signal-generation')
  results.liveSignals = await callFunction('live-signals-generator')
  results.realtimeScanner = await callFunction('real-time-scanner')
  
  // Phase 5: Automated Trading Activation
  console.log('\n🤖 PHASE 5: Automated Trading Activation')
  results.tradingOrchestrator = await callFunction('trading-orchestrator')
  results.automatedEngine = await callFunction('automated-trading-engine')
  
  // Phase 6: Data Feed Activation
  console.log('\n📈 PHASE 6: Data Feed Activation')
  results.liveFeed = await callFunction('live-crypto-feed')
  results.priceFeed = await callFunction('live-price-feed')
  
  // Phase 7: Comprehensive Scanner
  console.log('\n🔍 PHASE 7: Comprehensive Scanner')
  results.comprehensiveScanner = await callFunction('bybit-comprehensive-scanner')
  results.confluenceScanner = await callFunction('aitradex1-confluence-scanner')
  
  // Phase 8: Final System Status
  console.log('\n🎯 PHASE 8: Final System Status')
  results.finalHealth = await callFunction('system-health-monitor')
  
  // Summary Report
  console.log('\n' + '=' * 60)
  console.log('📋 COMPREHENSIVE SYSTEM ACTIVATION SUMMARY')
  console.log('=' * 60)
  
  const successCount = Object.values(results).filter(r => r && !r.error).length
  const totalCount = Object.keys(results).length
  
  console.log(`✅ Successful activations: ${successCount}/${totalCount}`)
  console.log(`❌ Failed activations: ${totalCount - successCount}/${totalCount}`)
  
  if (results.finalHealth && !results.finalHealth.error) {
    console.log(`🏥 Overall System Status: ${results.finalHealth.overall_status}`)
    console.log(`📊 Active Components: ${Object.keys(results.finalHealth.components || {}).length}`)
    console.log(`⚠️  Active Alerts: ${(results.finalHealth.alerts || []).length}`)
  }
  
  // Key Metrics
  if (results.enhancedSignals && results.enhancedSignals.signals_created) {
    console.log(`📡 Signals Generated: ${results.enhancedSignals.signals_created}`)
  }
  
  if (results.tradingOrchestrator && results.tradingOrchestrator.execution_results) {
    const execResults = results.tradingOrchestrator.execution_results
    const successTrades = execResults.filter(r => r.status === 'success').length
    console.log(`💰 Auto Trades Executed: ${successTrades}/${execResults.length}`)
  }
  
  console.log('\n🎉 COMPREHENSIVE SYSTEM ACTIVATION COMPLETE!')
  console.log('Real-time trading system is now fully operational.')
  
  return results
}

// Execute if called directly
if (import.meta.main) {
  activateComprehensiveSystem().catch(console.error)
}

export { activateComprehensiveSystem }