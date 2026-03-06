import json
from pathlib import Path

roasters = {2, 3, 4, 6, 7, 8, 9, 10, 12, 14, 16, 19, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 34, 35, 36, 38, 39, 40, 42, 46, 48, 49, 51, 52, 54, 55, 58, 59, 61, 62, 64, 65, 66, 72, 73, 74, 75, 78, 79, 80, 81, 83, 105, 112}
sellers = {13, 18, 20, 32, 33, 37, 43, 47, 60, 67, 82, 93, 103, 106, 107, 108, 111}

base_dir = Path(__file__).resolve().parent
cafes_path = base_dir / "cafes.json"
backup_path = base_dir / "cafes.json.script-backup"

with cafes_path.open("r", encoding="utf-8") as f:
    data = json.load(f)

# Keep a real backup of the current file before mutating it.
backup_path.write_text(
    json.dumps(data, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

for cafe in data:
    cafe_id = cafe.get("id")
    cafe["isRoaster"] = cafe_id in roasters
    cafe["sellsBeans"] = cafe_id in roasters or cafe_id in sellers
    if cafe_id == 112:
        cafe["name"] = "אדא לוינסקי"

with cafes_path.open("w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(
    f"Success! Updated {cafes_path.name} in place for {len(data)} cafes. "
    f"Pre-change backup: {backup_path.name}"
)
