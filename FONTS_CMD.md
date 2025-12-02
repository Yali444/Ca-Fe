# הוראות לפונטים - CMD

## בדיקת קבצי הפונטים

בשורת הפקודה (CMD), הרץ:

```cmd
cd "C:\Users\Yali\OneDrive\Documents\Cursor Projects\Ca fe\cafe-guide-web\public\fonts"
dir
```

זה יציג את כל הקבצים בתיקייה. ודא שיש לך:
- `TimeBurner-Regular.woff`
- `TimeBurner-Bold.woff`
- `Yehuda-Regular.woff`
- `Yehuda-Bold.woff`

## ניקוי cache והפעלה מחדש

```cmd
cd "C:\Users\Yali\OneDrive\Documents\Cursor Projects\Ca fe\cafe-guide-web"
rmdir /s /q .next
npm run dev
```

או אם `rmdir` לא עובד:
```cmd
cd "C:\Users\Yali\OneDrive\Documents\Cursor Projects\Ca fe\cafe-guide-web"
if exist .next rmdir /s /q .next
npm run dev
```

## אם הקבצים בשם אחר

אם הקבצים שלך בשם שונה, עדכן את `src/lib/fonts.ts` עם השמות הנכונים.

לדוגמה, אם הקבצים נקראים:
- `timeburner-regular.woff` (אותיות קטנות)
- `Yehuda-Regular.ttf` (פורמט ttf)

תצטרך לעדכן את הנתיבים בקובץ `fonts.ts`.

