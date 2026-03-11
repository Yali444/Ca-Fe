import json
import requests
import time

API_KEY = "0mdvFKEK8VkcX13XNjzXyQ7jWQU="
CAFE_FILE = "data/cafes.json"

def verify_hours():
    with open(CAFE_FILE, 'r', encoding='utf-8') as f:
        cafes = json.load(f)

    print("מתחיל סריקה... מציג את שעות הפעילות להשוואה ידנית:\n")
    
    for cafe in cafes:
        name = cafe.get('name', 'לא ידוע')
        address = cafe.get('address', '')
        query = f"{name} {address}"
        
        search_url = f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input={query}&inputtype=textquery&fields=place_id&key={API_KEY}"
        
        try:
            res = requests.get(search_url).json()
            
            if not res.get('candidates'):
                print(f"[לא זוהה בגוגל] {name} ({address}) - דורש בדיקה ידנית לחלוטין.\n")
                continue
                
            place_id = res['candidates'][0]['place_id']
            
            details_url = f"https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=current_opening_hours&key={API_KEY}"
            details = requests.get(details_url).json()
            
            hours_maps = details.get('result', {}).get('current_opening_hours', {}).get('weekday_text', [])
            hours_json = cafe.get('openingHours', {})
            
            print(f"--- {name} ---")
            if hours_maps:
                print("גוגל:")
                for day in hours_maps:
                    print(f"  {day}")
            else:
                print("גוגל: לא נמצאו שעות פעילות מוגדרות.")
                
            print(f"קובץ ה-JSON שלך: {hours_json}\n")
            
        except Exception as e:
            print(f"[שגיאת מערכת] {name}: {e}\n")
            
        # השהייה קלה כדי לא לעבור את מגבלת הבקשות של גוגל לשנייה
        time.sleep(0.5)

if __name__ == "__main__":
    verify_hours()