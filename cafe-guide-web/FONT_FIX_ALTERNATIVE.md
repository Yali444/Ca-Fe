# פתרון חלופי אם הנתיבים לא עובדים

אם עדיין יש שגיאה, נסה את זה:

## אפשרות 1: העבר פונטים ל-`src/fonts/`

1. צור תיקייה: `src/fonts/`
2. העתק את כל קבצי הפונטים לשם
3. עדכן את `src/lib/fonts.ts`:

```typescript
path: "../fonts/timeburnernormal.woff2",
```

## אפשרות 2: השתמש ב-CSS @font-face

אם `localFont` לא עובד, פתח את `src/app/globals.css` ובטל הערה של ה-@font-face declarations (שורות 126-157).

ואז עדכן את הנתיבים שם ל:
```css
src: url("/fonts/timeburnernormal.woff2") format("woff2");
```

## אפשרות 3: בדוק case sensitivity

ודא שהשמות בדיוק כמו בקבצים (אותיות קטנות/גדולות).

