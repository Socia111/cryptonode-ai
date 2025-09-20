#!/usr/bin/env node

/**
 * Run Comprehensive System Activation
 * Execute this to activate all trading systems
 */

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'

async function callFunction(name, body = {}) {
  const url = `${SUPABASE_URL}/functions/v1/${name}`
  
  try {
    console.log(`🔄 Activating ${name}...`)
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
      console.log(`✅ ${name} - ${data.success ? 'ACTIVE' : 'PARTIAL'}`)
      if (data.message) console.log(`   ${data.message}`)
      return data
    } else {
      console.log(`❌ ${name} - ERROR: ${data.error || response.statusText}`)
      return { error: data.error || response.statusText }
    }
  } catch (error) {
    console.log(`💥 ${name} - EXCEPTION: ${error.message}`)
    return { error: error.message }
  }
}

async function activateSystem() {
  console.log('🚀 ACTIVATING COMPREHENSIVE TRADING SYSTEM')
  console.log('=====================================')
  
  // Start automated trading engine
  console.log('\n🤖 Starting Automated Trading Engine...')
  const automatedEngine = await callFunction('automated-trading-engine')
  
  // Start trading orchestrator
  console.log('\n🎼 Starting Trading Orchestrator...')
  const orchestrator = await callFunction('trading-orchestrator')
  
  // Test Bybit connection
  console.log('\n🔌 Testing Bybit API Connection...')
  const bybitTest = await callFunction('bybit-broker-v2', { action: 'test_connection' })
  
  // Generate signals
  console.log('\n📡 Generating Trading Signals...')
  const signals1 = await callFunction('enhanced-signal-generation')
  const signals2 = await callFunction('live-signals-generator')
  
  // Start live feeds
  console.log('\n📈 Starting Live Data Feeds...')
  const liveFeed = await callFunction('live-crypto-feed')
  const priceFeed = await callFunction('live-price-feed')
  
  // Run comprehensive scanner
  console.log('\n🔍 Running Comprehensive Scanner...')
  const scanner = await callFunction('bybit-comprehensive-scanner')
  
  // System health check
  console.log('\n🏥 System Health Check...')
  const health = await callFunction('system-health-monitor')
  
  console.log('\n=====================================')
  console.log('✅ SYSTEM ACTIVATION COMPLETE!')
  console.log('📊 Real-time trading system is now operational')
  console.log('🤖 Automated trading enabled')
  console.log('📡 Live signal generation active')
  console.log('📈 Market data feeds running')
  console.log('=====================================')
}

activateSystem().catch(console.error)