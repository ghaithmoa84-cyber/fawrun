import type { Rating, RatingResponse } from '@fawrun/shared-types';

export function mapRating(rating: Rating, role: string): RatingResponse {
  const isAllowed = role === 'ADMIN';
  return {
    id: rating.id,
    orderId: rating.orderId,
    customerId: rating.customerId,
    runnerId: rating.runnerId,
    storeNameRated: rating.storeNameRated,
    stars: rating.stars,
    note: isAllowed ? rating.note : null,
    isFinal: rating.isFinal,
    createdAt: rating.createdAt,
    updatedAt: rating.updatedAt,
    expiresAt: rating.expiresAt,
  };
}