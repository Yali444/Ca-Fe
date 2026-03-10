import json
import requests
import time
import re
from datetime import datetime

API_KEY = "AIzaSyD7aGSaBkEvBX4J79zIIi2tOVoq-fbL5Ww"
CAFE_FILE = "public/data/cafes.json"

def parse_google_hours(google_hours):
    """Convert Google Places hours format to our JSON format"""
    day_mapping = {
        'Monday': 'monday',
        'Tuesday': 'tuesday', 
        'Wednesday': 'wednesday',
        'Thursday': 'thursday',
        'Friday': 'friday',
        'Saturday': 'saturday',
        'Sunday': 'sunday'
    }
    
    parsed_hours = {}
    
    for hour_line in google_hours:
        # Parse format like "Monday: 8:00 AM – 8:00 PM"
        match = re.match(r'(\w+):\s*(.+)', hour_line)
        if not match:
            continue
            
        day_name = match.group(1)
        hours_str = match.group(2).strip()
        
        # Skip if day not in mapping or if it's "Closed"
        if day_name not in day_mapping or 'Closed' in hours_str:
            continue
            
        # Convert times like "8:00 AM – 8:00 PM" to "08:00-20:00"
        time_match = re.match(r'(\d{1,2}:\d{2})\s*(AM|PM)\s*–\s*(\d{1,2}:\d{2})\s*(AM|PM)', hours_str)
        if not time_match:
            continue
            
        start_time = time_match.group(1)
        start_period = time_match.group(2)
        end_time = time_match.group(3)
        end_period = time_match.group(4)
        
        # Convert to 24-hour format
        start_24 = convert_to_24h(start_time, start_period)
        end_24 = convert_to_24h(end_time, end_period)
        
        if start_24 and end_24:
            parsed_hours[day_mapping[day_name]] = f"{start_24}-{end_24}"
    
    return parsed_hours

def convert_to_24h(time_str, period):
    """Convert 12-hour time to 24-hour format"""
    try:
        hour, minute = map(int, time_str.split(':'))
        
        if period == 'PM' and hour != 12:
            hour += 12
        elif period == 'AM' and hour == 12:
            hour = 0
            
        return f"{hour:02d}:{minute:02d}"
    except:
        return None

def hours_match(current, fetched):
    """Compare current hours with fetched hours"""
    if not current or not fetched:
        return False
        
    # Check if all days match
    for day in ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']:
        if current.get(day) != fetched.get(day):
            return False
    
    return True

def update_cafe_hours():
    """Main function to update cafe hours"""
    # Load current data
    with open(CAFE_FILE, 'r', encoding='utf-8') as f:
        cafes = json.load(f)
    
    updated_count = 0
    not_found = []
    ambiguous_hours = []
    errors = []
    
    print("Starting automatic opening hours update...\n")
    
    for i, cafe in enumerate(cafes):
        name = cafe.get('name', 'Unknown')
        address = cafe.get('address', '')
        current_hours = cafe.get('openingHours', {})
        
        print(f"[{i+1}/{len(cafes)}] Processing: {name}")
        
        try:
            # Search for place
            query = f"{name} {address}"
            search_url = f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input={query}&inputtype=textquery&fields=place_id&key={API_KEY}"
            
            search_response = requests.get(search_url).json()
            
            if not search_response.get('candidates'):
                print(f"  ❌ Not found on Google Maps")
                not_found.append({"name": name, "address": address})
                continue
                
            place_id = search_response['candidates'][0]['place_id']
            
            # Get place details
            details_url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=current_opening_hours&key={API_KEY}"
            details_response = requests.get(details_url).json()
            
            google_hours = details_response.get('result', {}).get('current_opening_hours', {}).get('weekday_text', [])
            
            if not google_hours:
                print(f"  ⚠️  No opening hours found")
                ambiguous_hours.append({"name": name, "address": address, "reason": "No hours found"})
                continue
            
            # Parse Google hours
            parsed_hours = parse_google_hours(google_hours)
            
            if not parsed_hours:
                print(f"  ⚠️  Could not parse hours format")
                ambiguous_hours.append({"name": name, "address": address, "reason": "Unparseable format"})
                continue
            
            # Check if hours match
            if hours_match(current_hours, parsed_hours):
                print(f"  ✅ Hours already match")
            else:
                print(f"  🔄 Updating hours:")
                print(f"    Current: {current_hours}")
                print(f"    New:     {parsed_hours}")
                
                # Update the cafe data
                cafe['openingHours'] = parsed_hours
                updated_count += 1
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
            errors.append({"name": name, "address": address, "error": str(e)})
        
        # Rate limiting
        time.sleep(0.5)
        print()
    
    # Save updated data
    if updated_count > 0:
        backup_file = CAFE_FILE.replace('.json', f'.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(cafes, f, ensure_ascii=False, indent=2)
        print(f"✅ Backup created: {backup_file}")
        
        with open(CAFE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cafes, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Updated {updated_count} cafes")
    else:
        print("ℹ️  No updates needed")
    
    # Print edge cases
    print("\n" + "="*50)
    print("EDGE CASES REQUIRING MANUAL REVIEW:")
    print("="*50)
    
    if not_found:
        print(f"\n🔍 NOT FOUND ON GOOGLE MAPS ({len(not_found)}):")
        for item in not_found:
            print(f"  • {item['name']} - {item['address']}")
    
    if ambiguous_hours:
        print(f"\n⚠️  AMBIGUOUS HOURS ({len(ambiguous_hours)}):")
        for item in ambiguous_hours:
            print(f"  • {item['name']} - {item['address']} ({item['reason']})")
    
    if errors:
        print(f"\n❌ ERRORS ({len(errors)}):")
        for item in errors:
            print(f"  • {item['name']} - {item['address']} ({item['error']})")
    
    print(f"\n✨ Process completed: {updated_count} updated, {len(not_found)} not found, {len(ambiguous_hours)} ambiguous, {len(errors)} errors")

if __name__ == "__main__":
    update_cafe_hours()
