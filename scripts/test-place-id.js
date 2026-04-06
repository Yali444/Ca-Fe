#!/usr/bin/env node

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.log('❌ Google Maps API key not found');
  process.exit(1);
}

// Get place ID from command line
const placeId = process.argv[2];
if (!placeId) {
  console.log('Usage: node test-place-id.js <place_id>');
  console.log('Example: node test-place-id.js ChIJ34lbM8yjAhURTvcsGr5FLyI');
  process.exit(1);
}

console.log(`🔍 Testing Place ID: ${placeId}`);

async function testPlaceId() {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${placeId}` +
      `&fields=place_id,name,formatted_address,geometry,types,popular_times,rating,reviews` +
      `&key=${API_KEY}` +
      `&language=iw`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const place = data.result;
      
      console.log(`\n✅ Place found:`);
      console.log(`   Name: ${place.name}`);
      console.log(`   Address: ${place.formatted_address}`);
      console.log(`   Types: ${place.types.join(', ')}`);
      console.log(`   Rating: ${place.rating || 'N/A'}`);
      console.log(`   Reviews: ${place.user_ratings_total || 'N/A'}`);
      
      if (place.popular_times) {
        console.log(`\n🎯 Popular times available: ✅`);
        console.log(`   Days with data: ${place.popular_times.length}`);
        place.popular_times.forEach(day => {
          console.log(`   ${day.day}: ${day.hours.length} hours`);
        });
      } else {
        console.log(`\n⚠️  Popular times not available`);
      }
      
      console.log(`\n📍 Coordinates:`);
      console.log(`   Lat: ${place.geometry.location.lat}`);
      console.log(`   Lng: ${place.geometry.location.lng}`);
      
    } else {
      console.log(`\n❌ Error: ${data.status}`);
      if (data.error_message) {
        console.log(`   Message: ${data.error_message}`);
      }
    }
  } catch (error) {
    console.error(`❌ Network error:`, error.message);
  }
}

testPlaceId();
