"use client";

import { useEffect, useState } from "react";

import type { CoffeeShop } from "@/lib/coffee-shop";
import { getNumericId } from "@/lib/numeric-id";
import { supabase } from "@/supabaseClient";
import type { Review } from "@/types/roastery";

interface ReviewDraft {
  name: string;
  text: string;
  rating: number;
}

/**
 * Manages cafe reviews: lazily loads them from Supabase (merged with any
 * reviews baked into the shop data) the first time the detail panel opens,
 * exposes the reviews for the selected shop, and handles new-review submission.
 *
 * @param coffeeShops  All shops — used to seed initial reviews and to map
 *                     Supabase numeric `cafe_id`s back to string shop ids.
 * @param detailOpen   Whether the detail panel is open; gates the initial fetch.
 * @param selectedShop The shop whose reviews are shown / submitted against.
 */
export function useReviews(
  coffeeShops: CoffeeShop[],
  detailOpen: boolean,
  selectedShop: CoffeeShop | null,
) {
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review[]>>({});
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>({
    name: "",
    text: "",
    rating: 5,
  });

  // Initialize reviews from Supabase and place data once the detail panel opens.
  useEffect(() => {
    if (typeof window === "undefined" || !detailOpen || reviewsLoaded) return;

    let cancelled = false;
    const fetchReviews = async () => {
      // Initialize from shop reviews first
      const initial: Record<string, Review[]> = {};
      coffeeShops.forEach((shop: CoffeeShop) => {
        initial[shop.id] = shop.reviews || [];
      });

      // Create a mapping from numeric ID to string ID for matching reviews
      const numericToStringId: Record<number, string> = {};
      coffeeShops.forEach((shop: CoffeeShop) => {
        const numericId = getNumericId(shop.id);
        numericToStringId[numericId] = shop.id;
      });

      // Fetch reviews from Supabase
      const { data, error } = await supabase
        .from('Cafe Reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data)) {
        // Merge Supabase reviews with initial reviews
        (data as Array<{ id: number | null; cafe_id: number | null; שם: string | null; דירוג: number | null; הערה: string | null; created_at: string | null }>).forEach((review) => {
          // Skip reviews with missing required fields
          if (review.cafe_id == null || review.id == null) return;

          // Find the matching shop ID using our mapping
          const shopId = numericToStringId[review.cafe_id];
          if (!shopId) return;

          const formattedReview: Review = {
            id: review.id.toString(),
            author: review.שם || 'אנונימי',
            rating: review.דירוג || 5,
            text: review.הערה || '',
            source: "Ca Fe community",
            date: review.created_at ? new Date(review.created_at).toISOString().slice(0, 10) : null,
          };

          if (!initial[shopId]) {
            initial[shopId] = [];
          }
          // Add if not already exists (check by id)
          if (!initial[shopId].some(r => r.id === formattedReview.id)) {
            initial[shopId].unshift(formattedReview);
          }
        });
      }

      if (!cancelled) {
        setReviewsMap(initial);
        setReviewsLoaded(true);
      }
    };

    fetchReviews();

    return () => {
      cancelled = true;
    };
    // Reviews are loaded once when the panel first opens; intentionally not
    // re-run when `coffeeShops` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpen, reviewsLoaded]);

  const selectedShopReviews = selectedShop
    ? reviewsMap[selectedShop.id] || []
    : [];

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedShop || !reviewDraft.name.trim() || !reviewDraft.text.trim()) return;

    const numericId = getNumericId(selectedShop.id);
    const insertData = {
      cafe_id: numericId,
      שם: reviewDraft.name.trim(),
      דירוג: reviewDraft.rating,
      הערה: reviewDraft.text.trim(),
    };
    // Save to Supabase
    const { data, error } = await supabase
      .from('Cafe Reviews')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error saving review:', error);
      alert('שגיאה בשמירת הביקורת: ' + error.message);
      return;
    }

    const newReview: Review = {
      id: data?.id?.toString() || `${selectedShop.id}-${Date.now()}`,
      author: reviewDraft.name.trim(),
      rating: reviewDraft.rating,
      text: reviewDraft.text.trim(),
      source: "Ca Fe community",
      date: new Date().toISOString().slice(0, 10),
    };
    setReviewsMap((prev) => {
      const existing = prev[selectedShop.id] || [];
      return { ...prev, [selectedShop.id]: [newReview, ...existing] };
    });
    setReviewDraft({ name: "", text: "", rating: 5 });
  };

  return { selectedShopReviews, reviewDraft, setReviewDraft, handleReviewSubmit };
}
