import "server-only";
import { getOpinlyClient } from "./client";

type PaidOrder = {
  orderId: string;
  value: number;
  currency: string;
} & ({ email: string; anonId?: string } | { anonId: string; email?: string });

/** Call only after a verified payment succeeds, using totals from your order record.
 * There is currently no checkout in Ca Fe. This is intentionally not a public API.
 * Await this in the payment webhook; let failures trigger the provider's retry.
 * Opinly deduplicates retries on orderId.
 */
export async function recordOpinlyPurchase(order: PaidOrder) {
  if (!order.orderId.trim() || !Number.isFinite(order.value) || order.value < 0 ||
      !/^[A-Z]{3}$/.test(order.currency) || !(order.email?.trim() || order.anonId?.trim())) {
    throw new Error("A purchase requires an order ID, valid total/currency, and attribution identity");
  }
  return getOpinlyClient().trackPurchase(order);
}
