import { useState } from 'react';
import api from '../api/client';
import type { ActiveOrderResponse } from '@fawrun/shared-types';
import { ItemsList } from './ItemsList';
import { ReceiptUploader } from './ReceiptUploader';

type ActiveOrderStore = NonNullable<
  NonNullable<ActiveOrderResponse>['orderStores']
>[number];
type ActiveOrderStoreReceipt = ActiveOrderStore['receipts'][number];

interface StoreCardProps {
  store: ActiveOrderStore;
  orderId: string;
  onStoreUpdated: () => void;
}

export function StoreCard({ store, orderId, onStoreUpdated }: StoreCardProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handlePurchase = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      await api.put(`/runner/orders/${orderId}/stores/${store.id}/purchase`);
      onStoreUpdated();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to purchase store');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      await api.put(`/runner/orders/${orderId}/stores/${store.id}/skip`, {
        reason: 'تخطي من قبل المندوب',
      });
      onStoreUpdated();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to skip store');
    } finally {
      setIsActionLoading(false);
    }
  };

  const isPurchased = store.status === 'PURCHASED';
  const isSkipped = store.status === 'SKIPPED';
  const isPending = store.status === 'PENDING';

  const statusClass =
    isSkipped ? 'store-card--skipped'
    : isPurchased ? 'store-card--purchased'
    : 'store-card--pending';

  return (
    <div className={`store-card ${statusClass}`}>
      <div className="store-card__header">
        <h3>{store.storeName}</h3>
        {store.isExtra && <span className="badge badge--extra">+إضافي</span>}
        <span
          className={`status-badge ${
            isPurchased ? 'status-purchased'
            : isSkipped ? 'status-skipped'
            : 'status-pending'
          }`}
        >
          {isPurchased ? 'مشترى' : isSkipped ? 'تم التخطي' : 'معلّق'}
        </span>
      </div>

      <ItemsList items={store.items} />

      {store.purchasedAt && (
        <div className="store-card__purchased-at">
          تم الشراء: {new Date(store.purchasedAt).toLocaleString()}
        </div>
      )}

      {store.receipts && store.receipts.length > 0 && (
        <div className="store-card__receipts">
          {store.receipts.map((receipt: ActiveOrderStoreReceipt) => (
            <img
              key={receipt.id}
              src={receipt.imageUrl}
              alt="Receipt"
              className="receipt-thumb"
            />
          ))}
        </div>
      )}

      {isPending && (
        <div className="store-card__actions">
          <button
            type="button"
            className="btn btn-success btn-small"
            onClick={handlePurchase}
            disabled={isActionLoading}
          >
            {isActionLoading ? '...' : 'تم الشراء'}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={handleSkip}
            disabled={isActionLoading}
          >
            تخطي
          </button>
        </div>
      )}

      {(isPurchased || isPending) && (
        <div className="store-card__receipt-upload">
          <ReceiptUploader
            orderId={orderId}
            storeId={store.id}
            onUploadComplete={onStoreUpdated}
          />
        </div>
      )}

      {actionError && <div className="error-msg">{actionError}</div>}
    </div>
  );
}
