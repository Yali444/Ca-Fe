#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Load cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

// Google Maps API key from environment
const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.error('❌ Google Maps API key not found!');
  console.log('Set GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable');
  process.exit(1);
}

console.log(`🔍 Finding Google Place IDs for ${cafes.length} cafes...`);
console.log(`📑 Using API key: ${API_KEY.substring(0, 10)}...`);

// Function to search for a place
async function findPlaceId(name, address, city) {
  try {
    const query = [name, address, city].filter(Boolean).join(', ');
    
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
      `query=${encodeURIComponent(query)}` +
      `&fields=place_id,name,formatted_address,geometry,types` +
      `&key=${API_KEY}` +
      `&language=iw`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      return {
        place_id: data.results[0].place_id,
        name: data.results[0].name,
        address: data.results[0].formatted_address,
        confidence: calculateConfidence(name, address, city, data.results[0])
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error searching for ${name}:`, error.message);
    return null;
  }
}

// Calculate confidence score for the match
function calculateConfidence(searchName, searchAddress, searchCity, result) {
  let score = 0;
  
  // Name similarity (basic)
  if (result.name.toLowerCase().includes(searchName.toLowerCase()) || 
      searchName.toLowerCase().includes(result.name.toLowerCase())) {
    score += 40;
  }
  
  // City match
  if (result.formatted_address.toLowerCase().includes(searchCity.toLowerCase())) {
    score += 30;
  }
  
  // Address match
  if (searchAddress && result.formatted_address.toLowerCase().includes(searchAddress.toLowerCase())) {
    score += 30;
  }
  
  // Type check (cafe, coffee shop, etc.)
  if (result.types.includes('cafe') || result.types.includes('coffee_shop')) {
    score += 20;
  }
  
  return Math.min(score, 100);
}

// Main function
async function findAllPlaceIds() {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    
    console.log(`📍 [${i + 1}/${cafes.length}] Searching for: ${cafe.name} in ${cafe.city}`);
    
    const result = await findPlaceId(cafe.name, cafe.address, cafe.city);
    
    if (result) {
      results.push({
        id: cafe.id,
        name: cafe.name,
        city: cafe.city,
        address: cafe.address,
        google_place_id: result.place_id,
        google_name: result.name,
        google_address: result.address,
        confidence: result.confidence
      });
      
      console.log(`✅ Found: ${result.name} (Confidence: ${result.confidence}%)`);
    } else {
      errors.push({
        id: cafe.id,
        name: cafe.name,
        city: cafe.city,
        address: cafe.address,
        error: 'Place not found'
      });
      
      console.log(`❌ Not found: ${cafe.name}`);
    }
    
    // Rate limiting - wait between requests
    if (i < cafes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Save results
  const outputPath = path.join(__dirname, '../google-place-ids.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    found: results,
    not_found: errors,
    summary: {
      total: cafes.length,
      found: results.length,
      not_found: errors.length,
      success_rate: Math.round((results.length / cafes.length) * 100)
    }
  }, null, 2));
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Found: ${results.length}/${cafes.length} (${Math.round((results.length / cafes.length) * 100)}%)`);
  console.log(`❌ Not found: ${errors.length}`);
  console.log(`📁 Results saved to: google-place-ids.json`);
  
  // Show high confidence matches
  const highConfidence = results.filter(r => r.confidence >= 80);
  console.log(`🎯 High confidence matches (80%+): ${highConfidence.length}`);
  
  return results;
}

// Run the script
if (require.main === module) {
  findAllPlaceIds().catch(console.error);
}

module.exports = { findAllPlaceIds, findPlaceId };
