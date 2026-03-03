// Current coordinates for "בונה"
const currentCoords = {
  lat: 32.049417,
  lng: 34.793313
};

console.log('📍 Current "בונה" coordinates:', currentCoords);
console.log('🗺️  Google Maps link:', `https://www.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}`);
console.log('🌍 OpenStreetMap link:', `https://www.openstreetmap.org/?mlat=${currentCoords.lat}&mlon=${currentCoords.lng}#map=18/${currentCoords.lat}/${currentCoords.lng}`);

// Known coordinates for Kalman Magan area (approximate)
const kalmanMaganCoords = {
  lat: 32.0749,
  lng: 34.7952
};

console.log('\n📍 Expected "קלמן מגן" area coordinates:', kalmanMaganCoords);
console.log('🗺️  Google Maps link:', `https://www.google.com/maps?q=${kalmanMaganCoords.lat},${kalmanMaganCoords.lng}`);
console.log('🌍 OpenStreetMap link:', `https://www.openstreetmap.org/?mlat=${kalmanMaganCoords.lat}&mlon=${kalmanMaganCoords.lng}#map=18/${kalmanMaganCoords.lat}/${kalmanMaganCoords.lng}`);

// Calculate difference
const latDiff = Math.abs(currentCoords.lat - kalmanMaganCoords.lat);
const lngDiff = Math.abs(currentCoords.lng - kalmanMaganCoords.lng);

console.log('\n📏 Distance from expected location:');
console.log(`Latitude difference: ${latDiff.toFixed(6)} degrees (~${(latDiff * 111).toFixed(2)} km)`);
console.log(`Longitude difference: ${lngDiff.toFixed(6)} degrees (~${(lngDiff * 111).toFixed(2)} km)`);
console.log(`Total distance: ~${Math.sqrt(Math.pow(latDiff * 111, 2) + Math.pow(lngDiff * 111, 2)).toFixed(2)} km`);

if (latDiff > 0.01 || lngDiff > 0.01) {
  console.log('\n🚨 SIGNIFICANT LOCATION ERROR DETECTED!');
  console.log('📝 Recommendation: Update coordinates to:', kalmanMaganCoords);
} else {
  console.log('\n✅ Coordinates appear to be in the correct area');
}
