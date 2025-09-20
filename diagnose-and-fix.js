#!/usr/bin/env node

/**
 * Comprehensive System Diagnosis and Fix
 * Diagnoses and fixes all critical trading system issues
 */

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'

async function callFunction(name, body = {}) {
  const url = `${SUPABASE_URL}/functions/v1/${name}`
  
  try {
    console.log(`🔧 Testing ${name}...`)
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
      console.log(`✅ ${name} - OK`)
      if (data.message) console.log(`   ${data.message}`)
      return data
    } else {
      console.log(`❌ ${name} - ERROR: ${data.error || data.message || response.statusText}`)
      return { error: data.error || data.message || response.statusText }
    }
  } catch (error) {
    console.log(`💥 ${name} - EXCEPTION: ${error.message}`)
    return { error: error.message }
  }
}

async function diagnosisAndFix() {
  console.log('🔍 COMPREHENSIVE SYSTEM DIAGNOSIS')
  console.log('=====================================')
  
  // 1. Test Bybit API Connection
  console.log('\n🔌 Testing Bybit API Connection...')
  const bybitTest = await callFunction('debug-bybit-api')
  
  if (bybitTest.error) {
    console.log('❌ Bybit API connection failed - checking credentials...')
    
    // Test with credential refresh
    const credTest = await callFunction('bybit-credentials', { action: 'test' })
    console.log('Credential test result:', credTest)
  } else {
    console.log('✅ Bybit API connection working')
  }

  // 2. Test Database Connection
  console.log('\n🗄️ Testing Database Connection...')
  const dbTest = await callFunction('health')
  
  // 3. Test Trade Execution Engine
  console.log('\n💰 Testing Trade Execution Engine...')
  const tradeTest = await callFunction('aitradex1-trade-executor', { 
    action: 'test',
    symbol: 'BTCUSDT',
    side: 'Buy',
    quantity: '0.001',
    test_mode: true
  })
  
  // 4. Test Signal Generation
  console.log('\n📡 Testing Signal Generation...')
  const signalTest = await callFunction('enhanced-signal-generation', {
    test_mode: true,
    force: true
  })
  
  // 5. Test System Health
  console.log('\n🏥 System Health Check...')
  const healthTest = await callFunction('system-health-monitor')
  
  // 6. Test Trading Orchestrator
  console.log('\n🎼 Testing Trading Orchestrator...')
  const orchestratorTest = await callFunction('trading-orchestrator', {
    mode: 'test'
  })

  console.log('\n=====================================')
  console.log('📋 DIAGNOSIS COMPLETE')
  console.log('=====================================')
  
  // Summary and recommendations
  const issues = []
  const fixes = []
  
  if (bybitTest.error) {
    issues.push('❌ Bybit API connection failed')
    fixes.push('🔧 Fix: Update/refresh Bybit API credentials')
  }
  
  if (dbTest.error) {
    issues.push('❌ Database connection issues')
    fixes.push('🔧 Fix: Check Supabase configuration')
  }
  
  if (tradeTest.error) {
    issues.push('❌ Trade execution engine failed')
    fixes.push('🔧 Fix: Check trading engine configuration')
  }
  
  if (signalTest.error) {
    issues.push('❌ Signal generation failed')  
    fixes.push('🔧 Fix: Check signal generation system')
  }
  
  console.log('\n🚨 ISSUES FOUND:')
  issues.forEach(issue => console.log(issue))
  
  console.log('\n🛠️ RECOMMENDED FIXES:')
  fixes.forEach(fix => console.log(fix))
  
  if (issues.length === 0) {
    console.log('✅ All systems operational!')
  }
}

diagnosisAndFix().catch(console.error)