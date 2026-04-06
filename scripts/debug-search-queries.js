#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('🔍 Sample search queries used for Google Places API:\n');

// Show first 10 examples
cafes.slice(0, 10).forEach((cafe, index) => {
  const query = [cafe.name, cafe.address, cafe.city].filter(Boolean).join(', ');
  
  console.log(`${index + 1}. ${cafe.name}`);
  console.log(`   Query: "${query}"`);
  console.log(`   Address: ${cafe.address}`);
  console.log(`   City: ${cafe.city}`);
  console.log('');
});

// Show some examples with detailed addresses
console.log('\n📍 Examples with detailed addresses:\n');

const detailedExamples = cafes.filter(cafe => 
  cafe.address && cafe.address.includes(',') && cafe.address.length > 20
).slice(0, 5);

detailedExamples.forEach((cafe, index) => {
  const query = [cafe.name, cafe.address, cafe.city].filter(Boolean).join(', ');
  
  console.log(`${index + 1}. ${cafe.name}`);
  console.log(`   Query: "${query}"`);
  console.log(`   Full address: ${cafe.address}`);
  console.log('');
});

// Show confidence calculation
console.log('\n🎯 How confidence is calculated:\n');
console.log('• Name similarity: 40 points');
console.log('• City match: 30 points'); 
console.log('• Address match: 30 points');
console.log('• Cafe/coffee shop type: 20 points');
console.log('• Total possible: 100+ points');

console.log('\n📊 Statistics:');
console.log(`• Total cafes: ${cafes.length}`);
console.log(`• Cafes with addresses: ${cafes.filter(c => c.address).length}`);
console.log(`• Cafes with detailed addresses: ${cafes.filter(c => c.address && c.address.includes(',')).length}`);
