#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load data files
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const googleIdsPath = path.join(__dirname, '../google-place-ids.json');

const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));
const googleData = JSON.parse(fs.readFileSync(googleIdsPath, 'utf8'));

console.log('📋 בתי קפה שצריכים תיקון - רשימה לחיפוש ידני');
console.log('=' .repeat(60));

// Find problematic cafes
const notFound = googleData.not_found;
const veryLowConfidence = googleData.found.filter(item => item.confidence < 60);
const lowConfidence = googleData.found.filter(item => item.confidence >= 60 && item.confidence < 80);

console.log(`\n🔴 קטגוריה 1: לא נמצאו כלל (${notFound.length})`);
console.log('-' .repeat(40));
notFound.forEach((item, index) => {
  console.log(`${index + 1}. ${item.name}`);
  console.log(`   כתובת: ${item.address}, ${item.city}`);
  console.log(`   חיפוש מומלץ: "${item.name} ${item.address} ${item.city}"`);
  console.log(`   קישור Google Maps: https://www.google.com/maps/search/${encodeURIComponent(`${item.name} ${item.address} ${item.city}`)}`);
  console.log('');
});

console.log(`\n🟠 קטגוריה 2: Confidence נמוך מאוד (<60%) (${veryLowConfidence.length})`);
console.log('-' .repeat(40));
veryLowConfidence.forEach((item, index) => {
  console.log(`${index + 1}. ${item.name} (כרגע: ${item.confidence}%)`);
  console.log(`   כתובת: ${item.address}, ${item.city}`);
  console.log(`   תוצאה נוכחית: ${item.google_name}`);
  console.log(`   כתובת Google: ${item.google_address}`);
  console.log(`   חיפוש מומלץ: "${item.name} ${item.address} ${item.city}"`);
  console.log(`   קישור Google Maps: https://www.google.com/maps/search/${encodeURIComponent(`${item.name} ${item.address} ${item.city}`)}`);
  console.log('');
});

console.log(`\n🟡 קטגוריה 3: Confidence נמוך (60-79%) (${lowConfidence.length})`);
console.log('-' .repeat(40));
lowConfidence.forEach((item, index) => {
  console.log(`${index + 1}. ${item.name} (כרגע: ${item.confidence}%)`);
  console.log(`   כתובת: ${item.address}, ${item.city}`);
  console.log(`   תוצאה נוכחית: ${item.google_name}`);
  console.log(`   כתובת Google: ${item.google_address}`);
  console.log(`   חיפוש מומלץ: "${item.name} ${item.address} ${item.city}"`);
  console.log(`   קישור Google Maps: https://www.google.com/maps/search/${encodeURIComponent(`${item.name} ${item.address} ${item.city}`)}`);
  console.log('');
});

console.log(`\n📊 סיכום:`);
console.log(`• סה"כ בעיות: ${notFound.length + veryLowConfidence.length + lowConfidence.length}`);
console.log(`• לא נמצאו: ${notFound.length}`);
console.log(`• Confidence נמוך מאוד: ${veryLowConfidence.length}`);
console.log(`• Confidence נמוך: ${lowConfidence.length}`);

console.log(`\n📝 הוראות:`);
console.log(`1. לחץ על הקישור של Google Maps`);
console.log(`2. מצא את בית הקפה הנכון`);
console.log(`3. לחץ "שתף" → "העתק קישור"`);
console.log(`4. חלק את ה-Place ID מהקישור`);
console.log(`5. שלח לי את הרשימה בפורמט:`);
console.log(`   [cafe_id, "place_id", confidence, "google_name", "google_address"]`);

console.log(`\n✨ תודה על העזרה!`);
