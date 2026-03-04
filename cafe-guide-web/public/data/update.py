import json

# רשימות ה-IDs לעדכון
roasters = {2, 3, 4, 6, 7, 8, 9, 10, 12, 14, 16, 19, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 34, 35, 36, 38, 39, 40, 42, 46, 48, 49, 51, 52, 54, 55, 58, 59, 61, 62, 64, 65, 66, 72, 73, 74, 75, 78, 79, 80, 81, 83, 105, 112}
sellers = {13, 18, 20, 32, 33, 37, 43, 47, 60, 67, 82, 93, 103, 106, 107, 108, 111}

# טעינה ישירות מהגיבוי כדי להבטיח עברית ו-112 מקומות
with open('cafes.json.backup', 'r', encoding='utf-8') as f:
    data = json.load(f)

for c in data:
    cid = c.get('id')
    c['isRoaster'] = cid in roasters
    c['sellsBeans'] = cid in roasters or cid in sellers
    # תיקון השם ל-ID 112
    if cid == 112:
        c['name'] = "אדא לוינסקי"

# שמירה של הקובץ המלא
with open('cafes.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Success! cafes.json now has {len(data)} cafes with correct names and booleans.")