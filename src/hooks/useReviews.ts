"use client";

import { useCallback, useEffect, useState } from "react";

import type { CoffeeShop } from "@/lib/coffee-shop";
import { getNumericId } from "@/lib/numeric-id";
import { SUPABASE_NOT_CONFIGURED, getSupabase } from "@/supabaseClient";
import type { Review } from "@/types/roastery";

export interface ReviewDraft {
  name: string;
  text: string;
  rating: number;
}

type SupabaseReviewRow = {
  id: number | null;
  שם: string | null;
  דירוג: number | null;
  הערה: string | null;
  created_at: string | null;
};

/** The shape Supabase (PostgREST) errors actually arrive in. They are plain
 *  objects, *not* `Error` instances — the reason a naive `instanceof Error`
 *  check silently collapses every failure into one unhelpful message. */
type SupabaseErrorLike = { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };

const asErrorLike = (err: unknown): SupabaseErrorLike =>
  typeof err === "object" && err !== null ? (err as SupabaseErrorLike) : {};

/**
 * Turn whatever `insert()` rejected with into a message that names the real
 * cause. Without this the user only ever sees "try again", which is useless
 * advice when the cause is a missing build-time env var or an RLS policy —
 * neither of which retrying can fix.
 */
export function describeSaveError(err: unknown): string {
  const { message, code, details } = asErrorLike(err);
  const text = typeof message === "string" ? message : "";

  if (code === SUPABASE_NOT_CONFIGURED) {
    return "שירות הביקורות לא מוגדר באתר (חסרים משתני הסביבה של Supabase). הביקורת לא נשמרה.";
  }
  // 42501 = insufficient_privilege, i.e. no RLS policy allows this insert.
  if (code === "42501" || /row-level security/i.test(text)) {
    return "אין הרשאה לשמור ביקורת (מדיניות RLS בבסיס הנתונים חוסמת את הכתיבה).";
  }
  if (err instanceof TypeError || /fetch|network/i.test(text)) {
    return "לא הצלחנו להתחבר לשרת הביקורות. בדקו את החיבור לאינטרנט ונסו שוב.";
  }

  const detail = [text, typeof details === "string" ? details : ""]
    .filter(Boolean)
    .join(" — ");
  return detail
    ? `שגיאה בשמירת הביקורת: ${detail}`
    : "שגיאה בשמירת הביקורת. נסו שוב.";
}

/**
 * Manages cafe reviews: lazily loads a single cafe's reviews from Supabase
 * (merged with any reviews baked into that shop's own data) the first time
 * its detail panel opens, exposes them, and handles new-review submission.
 *
 * @param detailOpen   Whether the detail panel is open; gates the fetch.
 * @param selectedShop The shop whose reviews are shown / submitted against.
 */
export function useReviews(
  detailOpen: boolean,
  selectedShop: CoffeeShop | null,
) {
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review[]>>({});
  const [loadedShopIds, setLoadedShopIds] = useState<Set<string>>(new Set());
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>({
    name: "",
    text: "",
    rating: 5,
  });

  // Load the selected shop's reviews (only) once its panel opens; scoped by
  // cafe_id rather than fetching the whole table so it stays fast as reviews
  // grow, and cached per shop id so re-opening the same cafe doesn't refetch.
  useEffect(() => {
    if (typeof window === "undefined" || !detailOpen || !selectedShop) return;
    if (loadedShopIds.has(selectedShop.id)) return;

    let cancelled = false;
    setReviewsError(null);
    setReviewsLoading(true);

    const fetchReviews = async () => {
      const numericId = getNumericId(selectedShop.id);
      try {
        const supabase = await getSupabase();
        const { data, error } = await supabase
          .from('Cafe Reviews')
          .select('*')
          .eq('cafe_id', numericId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        const fetched: Review[] = ((data ?? []) as SupabaseReviewRow[])
          .filter((review) => review.id != null)
          .map((review) => ({
            id: review.id!.toString(),
            author: review.שם || 'אנונימי',
            rating: review.דירוג || 5,
            text: review.הערה || '',
            source: "Ca Fe community",
            date: review.created_at ? new Date(review.created_at).toISOString().slice(0, 10) : null,
          }));

        if (cancelled) return;

        setReviewsMap((prev) => {
          const merged = [...fetched];
          (selectedShop.reviews || []).forEach((seeded) => {
            if (!merged.some((r) => r.id === seeded.id)) merged.push(seeded);
          });
          return { ...prev, [selectedShop.id]: merged };
        });
        setLoadedShopIds((prev) => new Set(prev).add(selectedShop.id));
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading reviews:', err);
          setReviewsError('לא הצלחנו לטעון ביקורות. נסו שוב.');
        }
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    };

    fetchReviews();

    return () => {
      cancelled = true;
    };
  }, [detailOpen, selectedShop, loadedShopIds]);

  const retryReviews = useCallback(() => {
    if (!selectedShop) return;
    setLoadedShopIds((prev) => {
      if (!prev.has(selectedShop.id)) return prev;
      const next = new Set(prev);
      next.delete(selectedShop.id);
      return next;
    });
  }, [selectedShop]);

  const selectedShopReviews = selectedShop
    ? reviewsMap[selectedShop.id] || []
    : [];

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedShop || !reviewDraft.name.trim() || !reviewDraft.text.trim()) return;
    setSubmitError(null);

    const numericId = getNumericId(selectedShop.id);
    const insertData = {
      cafe_id: numericId,
      שם: reviewDraft.name.trim(),
      דירוג: reviewDraft.rating,
      הערה: reviewDraft.text.trim(),
    };

    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('Cafe Reviews')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

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
    } catch (err) {
      console.error('Error saving review:', err);
      setSubmitError(describeSaveError(err));
    }
  };

  return {
    selectedShopReviews,
    reviewsLoading,
    reviewsError,
    retryReviews,
    reviewDraft,
    setReviewDraft,
    handleReviewSubmit,
    submitError,
  };
}
