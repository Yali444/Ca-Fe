import json
import time
import sys
from typing import Dict, Optional, Tuple

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    from geopy.geocoders import Nominatim
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
    GEOPY_AVAILABLE = True
except ImportError:
    GEOPY_AVAILABLE = False
    print("⚠️  geopy not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "geopy"])
    from geopy.geocoders import Nominatim
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError

# Initialize geocoder
geolocator = Nominatim(
    user_agent="CafeGuide/1.0 (contact: cafe-guide@example.com)",
    timeout=15
)

def geocode_address(address: str, city: str = "", retries: int = 3) -> Optional[Tuple[float, float]]:
    """
    Geocode an address using OpenStreetMap Nominatim API via geopy.
    Returns (lat, lng) tuple or None if geocoding fails.
    """
    # Combine address and city for better results
    query = f"{address}, {city}, Israel" if city else f"{address}, Israel"
    
    for attempt in range(retries):
        try:
            location = geolocator.geocode(query, country_codes="il", exactly_one=True)
            
            if location:
                return (location.latitude, location.longitude)
            else:
                if attempt == retries - 1:
                    print(f"  ⚠️  No results found for: {query}")
                return None
                
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            if attempt < retries - 1:
                wait_time = (attempt + 1) * 2
                print(f"  ⏳ Retry {attempt + 1}/{retries} after {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"  ❌ Error geocoding {query}: {str(e)}")
                return None
        except Exception as e:
            print(f"  ❌ Unexpected error geocoding {query}: {str(e)}")
            return None
    
    return None

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate distance between two coordinates in kilometers using Haversine formula.
    """
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lng = radians(lng2 - lng1)
    
    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    
    return R * c

def verify_cafe_location(cafe: Dict) -> Dict:
    """
    Verify and update cafe coordinates using geocoding.
    Returns updated cafe dict with verification info.
    """
    cafe_id = cafe.get("id")
    name = cafe.get("name", "Unknown")
    address = cafe.get("address", "")
    city = cafe.get("city", "")
    current_coords = cafe.get("coordinates", {})
    current_lat = current_coords.get("lat")
    current_lng = current_coords.get("lng")
    
    print(f"\n[{cafe_id}] {name}")
    print(f"  Address: {address}, {city}")
    print(f"  Current coordinates: ({current_lat}, {current_lng})")
    
    # Geocode the address
    geocoded_coords = geocode_address(address, city)
    
    if geocoded_coords:
        geocoded_lat, geocoded_lng = geocoded_coords
        print(f"  Geocoded coordinates: ({geocoded_lat}, {geocoded_lng})")
        
        # Calculate distance between current and geocoded coordinates
        if current_lat and current_lng:
            distance = calculate_distance(current_lat, current_lng, geocoded_lat, geocoded_lng)
            print(f"  Distance: {distance:.3f} km")
            
            # If distance is significant (> 100m), update coordinates
            if distance > 0.1:  # 100 meters
                print(f"  ✅ Updating coordinates (difference: {distance:.3f} km)")
                cafe["coordinates"]["lat"] = geocoded_lat
                cafe["coordinates"]["lng"] = geocoded_lng
                cafe["_geocode_verified"] = True
                cafe["_geocode_distance"] = round(distance, 3)
            else:
                print(f"  ✓ Coordinates verified (within {distance*1000:.0f}m)")
                cafe["_geocode_verified"] = True
                cafe["_geocode_distance"] = round(distance, 3)
        else:
            # No current coordinates, add geocoded ones
            print(f"  ✅ Adding geocoded coordinates")
            cafe["coordinates"] = {
                "lat": geocoded_lat,
                "lng": geocoded_lng
            }
            cafe["_geocode_verified"] = True
    else:
        print(f"  ⚠️  Could not geocode address")
        cafe["_geocode_verified"] = False
    
    return cafe

def main():
    # Read cafes.json
    print("Loading cafes.json...")
    with open('cafes.json', 'r', encoding='utf-8') as f:
        cafes = json.load(f)
    
    print(f"Found {len(cafes)} cafes to verify\n")
    print("=" * 60)
    
    updated_count = 0
    verified_count = 0
    failed_count = 0
    
    # Process each cafe
    for i, cafe in enumerate(cafes, 1):
        print(f"\nProcessing {i}/{len(cafes)}")
        
        # Verify location
        cafe = verify_cafe_location(cafe)
        
        if cafe.get("_geocode_verified"):
            verified_count += 1
            if cafe.get("_geocode_distance", 0) > 0.1:
                updated_count += 1
        else:
            failed_count += 1
        
        # Rate limiting: Nominatim allows 1 request per second
        # Be respectful and wait 2 seconds between requests to avoid blocking
        if i < len(cafes):
            time.sleep(2.0)
    
    # Save updated cafes.json
    print("\n" + "=" * 60)
    print(f"\nSummary:")
    print(f"  Total cafes: {len(cafes)}")
    print(f"  Verified: {verified_count}")
    print(f"  Updated: {updated_count}")
    print(f"  Failed: {failed_count}")
    
    # Remove temporary verification fields before saving (optional)
    # Uncomment if you don't want to keep verification metadata
    # for cafe in cafes:
    #     cafe.pop("_geocode_verified", None)
    #     cafe.pop("_geocode_distance", None)
    
    print("\nSaving updated cafes.json...")
    with open('cafes.json', 'w', encoding='utf-8') as f:
        json.dump(cafes, f, ensure_ascii=False, indent=2)
    
    print("✅ Done! cafes.json has been updated with verified coordinates.")

if __name__ == "__main__":
    main()





