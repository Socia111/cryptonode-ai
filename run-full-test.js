#!/usr/bin/env node

// Full Production Test Suite Runner
// This script runs comprehensive tests on all edge functions and sends signals to Telegram

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runFullTestSuite() {
  console.log('🚀 Starting Full Production Test Suite');
  console.log('=====================================');
  
  try {
    // Run the production test suite with verbose output
    console.log('🏭 Executing production test suite...');
    
    const { stdout, stderr } = await execAsync('deno run --allow-net --allow-env --allow-write tests/production-test-runner.ts production --verbose');
    
    console.log('📊 Test Results:');
    console.log(stdout);
    
    if (stderr) {
      console.log('⚠️  Warnings/Errors:');
      console.log(stderr);
    }
    
    console.log('\n✅ Full test suite completed!');
    console.log('📱 Check your Telegram channels for signal notifications!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    
    // Fallback: run the JavaScript test if Deno fails
    console.log('\n🔄 Fallback: Running JavaScript test suite...');
    try {
      const { stdout: jsStdout } = await execAsync('node test-all-functions.js');
      console.log(jsStdout);
    } catch (jsError) {
      console.error('❌ Fallback test also failed:', jsError.message);
    }
  }
}

// Run the test suite
runFullTestSuite();