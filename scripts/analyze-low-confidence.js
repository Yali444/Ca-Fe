#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load data files
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const googleIdsPath = path.join(__dirname, '../google-place-ids.json');

const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));
const googleData = JSON.parse(fs.readFileSync(googleIdsPath, 'utf8'));

console.log('🔍 Analyzing low confidence and failed matches:\n');

// Find low confidence matches (< 80%)
const lowConfidence = googleData.found.filter(item => item.confidence < 80);
const veryLowConfidence = googleData.found.filter(item => item.confidence < 60);
const notFound = googleData.not_found;

console.log(`📊 Summary:`);
console.log(`• Low confidence (<80%): ${lowConfidence.length}`);
console.log(`• Very low confidence (<60%): ${veryLowConfidence.length}`);
console.log(`• Not found: ${notFound.length}`);

if (lowConfidence.length > 0) {
  console.log(`\n⚠️  Low Confidence Matches (<80%):`);
  console.log('=' .repeat(50));
  
  lowConfidence.forEach(item => {
    const cafe = cafes.find(c => c.id === item.id);
    console.log(`\n${item.id}. ${item.name}`);
    console.log(`   Confidence: ${item.confidence}%`);
    console.log(`   Our address: ${item.address}`);
    console.log(`   Google name: ${item.google_name}`);
    console.log(`   Google address: ${item.google_address}`);
    console.log(`   Query: "${item.name}, ${item.address}, ${item.city}"`);
    
    if (item.confidence < 60) {
      console.log(`   ⚠️  VERY LOW CONFIDENCE - Manual review needed`);
    }
  });
}

if (notFound.length > 0) {
  console.log(`\n❌ Not Found:`);
  console.log('=' .repeat(50));
  
  notFound.forEach(item => {
    const cafe = cafes.find(c => c.id === item.id);
    console.log(`\n${item.id}. ${item.name}`);
    console.log(`   Address: ${item.address}`);
    console.log(`   City: ${item.city}`);
    console.log(`   Query: "${item.name}, ${item.address}, ${item.city}"`);
    console.log(`   💡 Suggestion: Try manual search on Google Maps`);
  });
}

// Show some examples of why matches might be low confidence
console.log(`\n🔍 Common Issues with Low Confidence:`);
console.log(`• Name differences (e.g., "טלק" vs "Talek")`);
console.log(`• Address format differences`);
console.log(`• Multiple locations with same name`);
console.log(`• Recently opened/closed businesses`);
console.log(`• Google Maps data not updated`);

// Suggest manual verification for problematic cases
console.log(`\n🛠️  Manual Verification Recommended For:`);
const problematic = [...veryLowConfidence, ...notFound].slice(0, 5);
problematic.forEach((item, index) => {
  console.log(`${index + 1}. ${item.name} (${item.address})`);
});

if (problematic.length > 5) {
  console.log(`   ... and ${problematic.length - 5} more`);
}

console.log(`\n✅ Recommendation:`);
console.log(`• Keep confidence ≥80% matches (${googleData.found.length - lowConfidence.length})`);
console.log(`• Manually verify confidence 60-79% matches (${lowConfidence.length - veryLowConfidence.length})`);
console.log(`• Remove confidence <60% matches (${veryLowConfidence.length})`);
console.log(`• Try manual search for not found cafes (${notFound.length})`);
