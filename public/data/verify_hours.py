#!/usr/bin/env python3
"""
Manual verification script for opening hours updates
"""

import json

def verify_hours():
    with open('public/data/cafes.json', 'r', encoding='utf-8') as f:
        cafes = json.load(f)
    
    issues = []
    
    for cafe in cafes:
        name = cafe.get('name', '')
        hours = cafe.get('openingHours', {})
        
        # Check for unusual hours
        for day, time_range in hours.items():
            if not time_range or time_range == '':
                continue
                
            try:
                start, end = time_range.split('-')
                start_h, start_m = map(int, start.split(':'))
                end_h, end_m = map(int, end.split(':'))
                
                # Check for very early opening (before 6:00)
                if start_h < 6:
                    issues.append(f"{name}: פותח יותר מדי מוקדע ב{day} ({time_range})")
                
                # Check for very late closing (after midnight)
                if end_h >= 24:
                    issues.append(f"{name}: סוגר יותר מדי מאוחר ב{day} ({time_range})")
                
                # Check for very short operating hours (less than 4 hours)
                total_minutes = (end_h * 60 + end_m) - (start_h * 60 + start_m)
                if total_minutes < 240 and total_minutes > 0:
                    issues.append(f"{name}: שעות פעילות קצרות מאוד ב{day} ({time_range})")
                
                # Check for strange time patterns
                if start_h > end_h and end_h != 0:  # Not crossing midnight
                    issues.append(f"{name}: טווח שעות לא תקין ב{day} ({time_range})")
                    
            except:
                issues.append(f"{name}: פורמט שעות לא תקין ב{day} ({time_range})")
    
    print("בדיקת איכות נתוני שעות פעילות:")
    print("=" * 50)
    
    if issues:
        print(f"נמצאו {len(issues)} בעיות אפשריות:")
        for issue in issues[:20]:  # Show first 20 issues
            print(f"⚠️  {issue}")
        
        if len(issues) > 20:
            print(f"... ועוד {len(issues) - 20} בעיות")
    else:
        print("✅ לא נמצאו בעיות מיוחדות")
    
    # Check specific problematic cafes
    print("\nבדיקת בתי קפה ספציפיים:")
    print("-" * 30)
    
    problematic_names = ['קפה 4T', 'אורבן שמאן', 'סיג קפה', 'בוסר']
    
    for cafe in cafes:
        if cafe['name'] in problematic_names:
            print(f"\n📍 {cafe['name']}:")
            print(f"   כתובת: {cafe.get('address', '')}")
            print(f"   שעות: {cafe.get('openingHours', {})}")

if __name__ == "__main__":
    verify_hours()
