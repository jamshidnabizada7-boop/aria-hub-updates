/**
 * Test script to verify AI translation is working correctly.
 * 
 * Usage: npx tsx scripts/test-translation.ts
 */

// Load environment variables from .env.local
import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  }
  console.log('✅ Loaded environment variables from .env.local\n');
} catch (error) {
  console.warn('⚠️  Could not load .env.local file:', error);
}

import { getAIProvider } from '../src/lib/ai/provider';

async function testTranslation() {
  console.log('🧪 Testing AI Translation System\n');

  // Get the configured AI provider
  const provider = await getAIProvider();
  
  if (!provider) {
    console.error('❌ No AI provider configured!');
    console.log('\nPlease set up your .env.local file with:');
    console.log('  AI_PROVIDER=groq');
    console.log('  GROQ_API_KEY=your-api-key');
    process.exit(1);
  }

  console.log('✅ AI provider loaded successfully\n');

  // Test data - a sample job posting
  const testData = {
    title: 'Quality Assurance / Quality Control (QA/QC) Engineer',
    organization: 'Hewad Bahram Logistics and Construction Company',
    fields: {
      'Gender': 'Male',
      'Nationality': 'National',
      'Contract Duration': 'Months (Extendable) 10',
      'Vacancy Number': '1',
      'Job Type': 'Full-time'
    },
    description: `Hewad Bahram Logistics & Construction Company (HBLCC), a core entity of the Hewad Bahram Group, is a reputable Afghan-owned company specializing in logistics, construction, and infrastructure development. Established in 2015 and headquartered in Kabul, HBLCC delivers high-quality, sustainable construction solutions across Afghanistan, including in complex and remote environments.`
  };

  console.log('📝 Test Content (English):');
  console.log(`Title: ${testData.title}`);
  console.log(`Organization: ${testData.organization}`);
  console.log(`Fields:`, JSON.stringify(testData.fields, null, 2));
  console.log(`Description: ${testData.description.substring(0, 100)}...\n`);

  // Test 1: Translate title to Persian
  console.log('🔄 Test 1: Translating title to Persian (fa)...');
  try {
    const titleFa = await provider.translate(testData.title, 'en', 'fa', { 
      context: testData.organization 
    });
    console.log('✅ Persian title:', titleFa);
  } catch (error) {
    console.error('❌ Failed to translate to Persian:', error);
  }

  // Test 2: Translate title to Pashto
  console.log('\n🔄 Test 2: Translating title to Pashto (ps)...');
  try {
    const titlePs = await provider.translate(testData.title, 'en', 'ps', { 
      context: testData.organization 
    });
    console.log('✅ Pashto title:', titlePs);
  } catch (error) {
    console.error('❌ Failed to translate to Pashto:', error);
  }

  // Test 3: Translate field object to Persian
  console.log('\n🔄 Test 3: Translating field values to Persian...');
  try {
    const fieldsFa = await provider.translateObject(testData.fields, 'en', 'fa', {
      context: testData.organization
    });
    console.log('✅ Persian fields:', JSON.stringify(fieldsFa, null, 2));
  } catch (error) {
    console.error('❌ Failed to translate fields to Persian:', error);
  }

  // Test 4: Translate field object to Pashto
  console.log('\n🔄 Test 4: Translating field values to Pashto...');
  try {
    const fieldsPs = await provider.translateObject(testData.fields, 'en', 'ps', {
      context: testData.organization
    });
    console.log('✅ Pashto fields:', JSON.stringify(fieldsPs, null, 2));
  } catch (error) {
    console.error('❌ Failed to translate fields to Pashto:', error);
  }

  // Test 5: Translate description to Persian
  console.log('\n🔄 Test 5: Translating description to Persian...');
  try {
    const descFa = await provider.translate(testData.description, 'en', 'fa', {
      context: testData.organization
    });
    console.log('✅ Persian description:', descFa.substring(0, 150) + '...');
  } catch (error) {
    console.error('❌ Failed to translate description to Persian:', error);
  }

  // Test 6: Translate description to Pashto
  console.log('\n🔄 Test 6: Translating description to Pashto...');
  try {
    const descPs = await provider.translate(testData.description, 'en', 'ps', {
      context: testData.organization
    });
    console.log('✅ Pashto description:', descPs.substring(0, 150) + '...');
  } catch (error) {
    console.error('❌ Failed to translate description to Pashto:', error);
  }

  console.log('\n✅ Translation tests completed!\n');
  console.log('📌 Summary:');
  console.log('  - If all tests passed, your AI translation is working correctly');
  console.log('  - The scraper will now translate ALL content (titles, descriptions, fields)');
  console.log('  - Translations are stored in i18n fields in the database');
  console.log('  - You can view translated content by accessing opportunities with ?lang=fa or ?lang=ps');
}

// Run the test
testTranslation().catch(console.error);
