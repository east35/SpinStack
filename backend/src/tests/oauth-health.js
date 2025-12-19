#!/usr/bin/env node
/**
 * OAuth Health Check Test
 * Run this after backend changes to verify OAuth flow is working
 * 
 * Usage: node src/tests/oauth-health.js
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

const tests = {
  passed: 0,
  failed: 0,
  results: []
};

function log(status, message) {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : 'ℹ️';
  console.log(`${icon} ${message}`);
  if (status === 'pass') tests.passed++;
  if (status === 'fail') tests.failed++;
  tests.results.push({ status, message });
}

async function testHealthEndpoint() {
  try {
    const res = await axios.get(`${API_URL}/health`, {
      timeout: 5000,
      // Force IPv4 to avoid connection issues
      httpAgent: new (require('http').Agent)({ family: 4 })
    });
    if (res.status === 200 && res.data.status === 'ok') {
      log('pass', 'Health endpoint responding');
      return true;
    }
    log('fail', `Health endpoint returned unexpected response: ${JSON.stringify(res.data)}`);
    return false;
  } catch (error) {
    log('fail', `Health endpoint failed: ${error.message}`);
    return false;
  }
}

async function testOAuthLoginEndpoint() {
  try {
    const res = await axios.get(`${API_URL}/api/auth/login`, {
      validateStatus: () => true,
      timeout: 5000,
      httpAgent: new (require('http').Agent)({ family: 4 })
    });
    
    // Should return 200 with authorizeUrl OR 500 with error
    if (res.status === 200 && res.data.authorizeUrl) {
      log('pass', 'OAuth login endpoint returns authorize URL');
      log('info', `Authorize URL: ${res.data.authorizeUrl.substring(0, 60)}...`);
      return true;
    } else if (res.status === 500) {
      log('fail', `OAuth login failed: ${res.data.error || 'Unknown error'}`);
      return false;
    } else {
      log('fail', `OAuth login unexpected response: ${res.status} - ${JSON.stringify(res.data)}`);
      return false;
    }
  } catch (error) {
    log('fail', `OAuth login endpoint error: ${error.message}`);
    return false;
  }
}

async function testAuthMeEndpoint() {
  try {
    const res = await axios.get(`${API_URL}/api/auth/me`, {
      validateStatus: () => true,
      timeout: 5000,
      httpAgent: new (require('http').Agent)({ family: 4 })
    });
    
    // Should return 401 when not authenticated (expected behavior)
    if (res.status === 401) {
      log('pass', 'Auth /me endpoint correctly returns 401 when not authenticated');
      return true;
    } else if (res.status === 200) {
      log('pass', `Auth /me endpoint returns user: ${res.data.user?.discogs_username}`);
      return true;
    } else {
      log('fail', `Auth /me unexpected response: ${res.status}`);
      return false;
    }
  } catch (error) {
    log('fail', `Auth /me endpoint error: ${error.message}`);
    return false;
  }
}

async function testDiscogsCredentials() {
  const key = process.env.DISCOGS_CONSUMER_KEY;
  const secret = process.env.DISCOGS_CONSUMER_SECRET;
  
  if (!key || !secret) {
    log('fail', 'Missing DISCOGS_CONSUMER_KEY or DISCOGS_CONSUMER_SECRET in environment');
    return false;
  }
  
  if (key.length < 10 || secret.length < 10) {
    log('fail', 'Discogs credentials appear invalid (too short)');
    return false;
  }
  
  log('pass', 'Discogs credentials present in environment');
  return true;
}

async function testRedisConnection() {
  try {
    const { createClient } = require('redis');
    const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    
    client.on('error', () => {}); // Suppress error logging
    
    await client.connect();
    await client.ping();
    await client.disconnect();
    
    log('pass', 'Redis connection successful');
    return true;
  } catch (error) {
    log('fail', `Redis connection failed: ${error.message}`);
    return false;
  }
}

async function testDatabaseConnection() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const result = await pool.query('SELECT 1 as test');
    await pool.end();
    
    if (result.rows[0].test === 1) {
      log('pass', 'Database connection successful');
      return true;
    }
    log('fail', 'Database query returned unexpected result');
    return false;
  } catch (error) {
    log('fail', `Database connection failed: ${error.message}`);
    return false;
  }
}

async function testSessionTable() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Check if users table exists and has expected columns
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    await pool.end();
    
    const columns = result.rows.map(r => r.column_name);
    const required = ['id', 'discogs_username', 'discogs_access_token', 'discogs_access_secret'];
    const missing = required.filter(c => !columns.includes(c));
    
    if (missing.length === 0) {
      log('pass', 'Users table has required OAuth columns');
      return true;
    }
    log('fail', `Users table missing columns: ${missing.join(', ')}`);
    return false;
  } catch (error) {
    log('fail', `Session table check failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🔐 OAuth Health Check\n' + '='.repeat(50) + '\n');
  
  // Environment checks
  console.log('📋 Environment Checks:');
  await testDiscogsCredentials();
  
  // Infrastructure checks
  console.log('\n🔧 Infrastructure Checks:');
  await testRedisConnection();
  await testDatabaseConnection();
  await testSessionTable();
  
  // API checks
  console.log('\n🌐 API Endpoint Checks:');
  const healthOk = await testHealthEndpoint();
  
  if (healthOk) {
    await testOAuthLoginEndpoint();
    await testAuthMeEndpoint();
  } else {
    log('info', 'Skipping API tests - server not responding');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Results: ${tests.passed} passed, ${tests.failed} failed\n`);
  
  if (tests.failed > 0) {
    console.log('⚠️  Some tests failed. OAuth may not work correctly.\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed. OAuth should be functional.\n');
    process.exit(0);
  }
}

runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
