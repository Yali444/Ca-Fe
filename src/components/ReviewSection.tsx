'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface Review {
  id: number;
  שם: string;
  דירוג: number;
  הערה: string;
  created_at: string;
}

// Helper function to extract numeric ID for database storage
// cafe-1 → 1, matcha-xxx-yyy-abc123 → hash as number
const getNumericId = (id: string): number => {
  // Try to extract number from cafe-N format
  const cafeMatch = id.match(/^cafe-(\d+)$/);
  if (cafeMatch) {
    return parseInt(cafeMatch[1], 10);
  }
  
  // For matcha or other string IDs, create a consistent numeric hash
  // Use a large offset (1000000) to avoid collision with cafe IDs
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 1000000 + Math.abs(hash % 1000000);
};

export default function ReviewSection({ placeId }: { placeId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Convert string place ID to numeric ID for database
  const numericId = getNumericId(placeId);

  const fetchReviews = useCallback(async () => {
    const { data, error } = await supabase
      .from('Cafe Reviews')
      .select('*')
      .eq('cafe_id', numericId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching reviews:', error);
    else setReviews((data as Review[]) || []);
  }, [numericId]);

  // טעינת ביקורות בעליית הדף — initial-load effect that legitimately
  // populates state from a remote source. Migrating to use()/Suspense
  // would be the modern fix but is out of scope.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews();
  }, [fetchReviews]);

  // שליחת ביקורת חדשה
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const insertData = { cafe_id: numericId, שם: name, דירוג: rating, הערה: comment };

    const { data, error } = await supabase
      .from('Cafe Reviews')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Review insert error:', error);
      alert('שגיאה בשליחת הביקורת: ' + error.message);
    } else if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No data returned from insert - RLS might be blocking');
      alert('הביקורת נשלחה אך לא התקבל אישור. ייתכן שיש בעיית הרשאות.');
    } else {
      // איפוס הטופס ורענון הרשימה
      setName('');
      setComment('');
      setRating(5);
      fetchReviews();
    }
    setLoading(false);
  }

  return (
    <div className="mt-12 p-6 bg-gray-50 rounded-xl">
      <h3 className="text-2xl font-bold mb-6 text-gray-800">מה חשבתם על המקום?</h3>

      {/* טופס הוספת ביקורת */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-4 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">שם:</label>
          <input 
            type="text" 
            required 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full p-2 border rounded-md"
            placeholder="השם שלך"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">דירוג:</label>
          <select 
            value={rating} 
            onChange={(e) => setRating(Number(e.target.value))}
            className="mt-1 block w-full p-2 border rounded-md"
          >
            <option value="5">⭐⭐⭐⭐⭐ - מושלם</option>
            <option value="4">⭐⭐⭐⭐ - מעולה</option>
            <option value="3">⭐⭐⭐ - נחמד</option>
            <option value="2">⭐⭐ - לא משהו</option>
            <option value="1">⭐ - גרוע</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">ביקורת:</label>
          <textarea 
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-1 block w-full p-2 border rounded-md"
            placeholder="איך היה הקפה? האווירה?"
            rows={3}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-coffee-dark text-white p-2 rounded-md hover:bg-coffee-medium transition disabled:opacity-50"
        >
          {loading ? 'שולח...' : 'פרסם ביקורת'}
        </button>
      </form>

      {/* רשימת הביקורות */}
      <div className="space-y-4">
        {reviews.length === 0 && <p className="text-gray-500 text-center">אין עדיין ביקורות. תהיו הראשונים!</p>}
        
        {reviews.map((review) => (
          <div key={review.id} className="border-b pb-4 last:border-0">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-gray-900">{review.שם}</span>
              <span className="text-yellow-500 text-sm">{'⭐'.repeat(review.דירוג)}</span>
            </div>
            <p className="text-gray-700 text-sm">{review.הערה}</p>
            <span className="text-xs text-gray-400 block mt-1">
              {new Date(review.created_at).toLocaleDateString('he-IL')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
























