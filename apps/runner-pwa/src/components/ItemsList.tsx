import type { ActiveOrderResponse } from '@fawrun/shared-types';

type OrderItem = NonNullable<
  NonNullable<ActiveOrderResponse>['orderStores']
>[number]['items'][number];

interface ItemsListProps {
  items: OrderItem[];
}

export function ItemsList({ items }: ItemsListProps) {
  if (!items || items.length === 0) {
    return <p className="text-muted">No items</p>;
  }

  return (
    <ul className="items-list">
      {items.map((item) => (
        <li key={item.id} className="items-list-item">
          <span className="item-name">
            {item.itemName}
            {item.customStoreName && <span className="item-custom">({item.customStoreName})</span>}
          </span>
          <span className="item-quantity">{item.quantity}</span>
        </li>
      ))}
    </ul>
  );
}
