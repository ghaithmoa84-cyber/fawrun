import type { ActiveOrderStoreItem } from '@fawrun/shared-types';

interface ItemsListProps {
  items: ActiveOrderStoreItem[];
}

export function ItemsList({ items }: ItemsListProps) {
  if (!items || items.length === 0) {
    return <p className="text-muted">لا توجد مواد مسجلة لهذا المتجر.</p>;
  }

  return (
    <ul className="items-list">
      {items.map((item) => (
        <li key={item.id} className="items-list-item">
          <div className="item-info">
            <span className="item-name">{item.itemName}</span>
            {item.customStoreName && (
              <span className="item-custom">({item.customStoreName})</span>
            )}
          </div>
          <span className="item-quantity">{item.quantity}</span>
        </li>
      ))}
    </ul>
  );
}
