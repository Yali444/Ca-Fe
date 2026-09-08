"use client";

import { getOpinlyPixel } from "@opinly/shared/pixel";
import type { StandardEvent } from "@opinly/backend";

// The SDK queues events until the root layout's Script is ready.
export function trackOpinly(event: StandardEvent | "review_submitted", properties: Record<string, unknown>, externalEventId?: string) {
  try {
    getOpinlyPixel().track(event, properties, externalEventId ? { externalEventId } : undefined);
  } catch {
    // Analytics must never prevent the user's action from completing.
  }
}

// Call with the authenticated user's identity once accounts are introduced.
export function identifyOpinlyUser(user: { email: string; id?: string }) {
  getOpinlyPixel().identify({ email: user.email, userId: user.id });
}

// Persist alongside an order before a hosted checkout redirect.
export function getOpinlyAnonId() {
  return getOpinlyPixel().getAnonId();
}
