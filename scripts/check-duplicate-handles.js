const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Checking for Duplicate/Suspicious Instagram Handles ===\n');

// Group cafes by instagram handle
const handleGroups = {};
const suspiciousHandles = [];

cafes.forEach(cafe => {
  const handle = cafe.instagramHandle;
  if (handle) {
    if (!handleGroups[handle]) {
      handleGroups[handle] = [];
    }
    handleGroups[handle].push(cafe);
  }
});

// Check for duplicates
Object.entries(handleGroups).forEach(([handle, cafesList]) => {
  if (cafesList.length > 1) {
    console.log(`🔍 DUPLICATE HANDLE: "${handle}" used by:`);
    cafesList.forEach(cafe => {
      console.log(`   - ${cafe.name} (${cafe.city})`);
    });
    console.log('');
  }
});

// Check for handles that look like they belong to other cafes
// (handles that contain cafe names but don't match the current cafe name)
cafes.forEach(cafe => {
  const handle = cafe.instagramHandle;
  if (handle) {
    // Check if handle contains common cafe name patterns but doesn't match this cafe
    const cafeNameWords = ['cafe', 'coffee', 'קפה', 'בית', 'שכונתי', 'איכותי'];
    
    // Look for handles that might belong to other cafes
    const otherCafesWithSimilarHandle = cafes.filter(other => 
      other.id !== cafe.id && 
      other.instagramHandle &&
      (other.instagramHandle === handle || 
       other.name.toLowerCase().includes(handle.toLowerCase()) ||
       handle.toLowerCase().includes(other.name.toLowerCase().replace(/[^\w\s]/g, '').split(' ')[0]))
    );
    
    if (otherCafesWithSimilarHandle.length > 0) {
      console.log(`⚠️  SUSPICIOUS: ${cafe.name} has handle "${handle}" which might belong to:`);
      otherCafesWithSimilarHandle.forEach(other => {
        console.log(`   - ${other.name} (${other.city}) - handle: ${other.instagramHandle}`);
      });
      console.log('');
      suspiciousHandles.push({
        cafe: cafe.name,
        handle: handle,
        mightBelongTo: otherCafesWithSimilarHandle.map(c => c.name)
      });
    }
  }
});

// Save report
if (suspiciousHandles.length > 0) {
  const reportPath = path.join(__dirname, '../suspicious-instagram-handles.txt');
  const reportContent = suspiciousHandles.map(({ cafe, handle, mightBelongTo }) => 
    `${cafe}: "${handle}" - might belong to: ${mightBelongTo.join(', ')}`
  ).join('\n');
  
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📋 Suspicious handles report saved to: ${reportPath}`);
} else {
  console.log(`✅ No suspicious handles found`);
}

console.log(`\n=== Summary ===`);
console.log(`🔍 Found ${Object.entries(handleGroups).filter(([_, cafes]) => cafes.length > 1).length} duplicate handles`);
console.log(`⚠️  Found ${suspiciousHandles.length} suspicious handles`);
