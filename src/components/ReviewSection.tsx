'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface Review {
  id: number;
  visitor_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function ReviewSection({ cafeId }: { cafeId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // טעינת ביקורות בעליית הדף
  useEffect(() => {
    fetchReviews();
  }, [cafeId]);

  async function fetchReviews() {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('cafe_id', cafeId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching reviews:', error);
    else setReviews(data || []);
  }

  // שליחת ביקורת חדשה
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('reviews')
      .insert([
        { cafe_id: cafeId, visitor_name: name, rating: rating, comment: comment }
      ]);

    if (error) {
      alert('שגיאה בשליחת הביקורת: ' + error.message);
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
              <span className="font-bold text-gray-900">{review.visitor_name}</span>
              <span className="text-yellow-500 text-sm">{'⭐'.repeat(review.rating)}</span>
            </div>
            <p className="text-gray-700 text-sm">{review.comment}</p>
            <span className="text-xs text-gray-400 block mt-1">
              {new Date(review.created_at).toLocaleDateString('he-IL')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}