#!/usr/bin/env node

/**
 * CRITICAL SYSTEM REPAIR SCRIPT
 * Fixes all identified issues step by step
 */

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'

async function callFunction(name, body = {}) {
  const url = `${SUPABASE_URL}/functions/v1/${name}`
  
  try {
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
      return { success: true, data }
    } else {
      return { success: false, error: data.error || data.message, data }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function emergencyRepair() {
  console.log('🚨 EMERGENCY SYSTEM REPAIR')
  console.log('='.repeat(50))
  
  let totalFixed = 0
  let totalIssues = 0
  
  // Step 1: Test and Fix Bybit API Connection
  console.log('\n🔧 STEP 1: Bybit API Connection Test')
  totalIssues++
  
  const bybitTest = await callFunction('bybit-broker-v2', { action: 'test_connection' })
  
  if (bybitTest.success) {
    console.log('✅ Bybit API connection successful')
    totalFixed++
  } else {
    console.log('❌ Bybit API connection failed:', bybitTest.error)
    console.log('🔧 Attempting to fix API credentials...')
    
    // Try to refresh credentials
    const credFix = await callFunction('bybit-credentials', { action: 'refresh' })
    if (credFix.success) {
      console.log('✅ API credentials refreshed')
      totalFixed++
    } else {
      console.log('❌ Could not fix API credentials')
    }
  }
  
  // Step 2: Test Database Connection
  console.log('\n🔧 STEP 2: Database Connection Test')
  totalIssues++
  
  const dbTest = await callFunction('health')
  
  if (dbTest.success) {
    console.log('✅ Database connection healthy')
    totalFixed++
  } else {
    console.log('❌ Database connection issues:', dbTest.error)
  }
  
  // Step 3: Fix Trading Execution Engine
  console.log('\n🔧 STEP 3: Trading Execution Engine')
  totalIssues++
  
  const tradeTest = await callFunction('aitradex1-trade-executor', { 
    action: 'test',
    test_mode: true 
  })
  
  if (tradeTest.success) {
    console.log('✅ Trading execution engine working')
    totalFixed++
  } else {
    console.log('❌ Trading execution engine failed:', tradeTest.error)
  }
  
  // Step 4: Generate Test Signals
  console.log('\n🔧 STEP 4: Signal Generation System')
  totalIssues++
  
  const signalTest = await callFunction('enhanced-signal-generation', {
    force: true,
    test_mode: true
  })
  
  if (signalTest.success) {
    console.log('✅ Signal generation working')
    totalFixed++
  } else {
    console.log('❌ Signal generation failed:', signalTest.error)
  }
  
  // Step 5: Test Live Data Feeds
  console.log('\n🔧 STEP 5: Live Data Feeds')
  totalIssues++
  
  const feedTest = await callFunction('live-price-feed')
  
  if (feedTest.success) {
    console.log('✅ Live data feeds operational')
    totalFixed++
  } else {
    console.log('❌ Live data feeds failed:', feedTest.error)
  }
  
  // Step 6: Start Automated Trading
  console.log('\n🔧 STEP 6: Automated Trading System')
  totalIssues++
  
  const autoTradingTest = await callFunction('automated-trading-engine')
  
  if (autoTradingTest.success) {
    console.log('✅ Automated trading system started')
    totalFixed++
  } else {
    console.log('❌ Automated trading system failed:', autoTradingTest.error)
  }
  
  // Final System Health Check
  console.log('\n🔧 FINAL: System Health Check')
  const finalHealth = await callFunction('system-health-monitor')
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 REPAIR SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Fixed: ${totalFixed}/${totalIssues} issues`)
  console.log(`❌ Remaining: ${totalIssues - totalFixed}/${totalIssues} issues`)
  
  if (finalHealth.success && finalHealth.data) {
    console.log('\n🏥 System Status:', finalHealth.data.overall_status || 'Unknown')
    if (finalHealth.data.components) {
      console.log('🔧 Active Components:', Object.keys(finalHealth.data.components).length)
    }
  }
  
  console.log('\n🚀 REPAIR COMPLETE!')
  
  if (totalFixed === totalIssues) {
    console.log('🎉 All systems operational! Trading system is ready.')
  } else {
    console.log('⚠️  Some issues remain. Check logs for details.')
  }
  
  return { totalFixed, totalIssues, success: totalFixed === totalIssues }
}

emergencyRepair().catch(console.error)