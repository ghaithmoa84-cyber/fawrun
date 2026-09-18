import type { CustomerOrderItem } from '@fawrun/shared-types';

export function mapOrderItem(item: {
  id: string;
  itemName: string;
  quantity: string;
  customStoreName: string | null;
  anyStore: boolean;
  orderStoreId: string | null;
  isCancelled: boolean;
  cancelNote: string | null;
  createdAt: Date;
}): CustomerOrderItem {
  return {
    id: item.id,
    itemName: item.itemName,
    quantity: item.quantity,
    customStoreName: item.customStoreName,
    anyStore: item.anyStore,
    orderStoreId: item.orderStoreId,
    isCancelled: item.isCancelled,
    cancelNote: item.cancelNote,
    createdAt: item.createdAt,
  };
}