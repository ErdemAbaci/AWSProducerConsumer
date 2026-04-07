import type { ReactNode } from "react";

type KeyValueItem = {
  label: string;
  value: ReactNode;
};

export function KeyValueList({ items }: { items: KeyValueItem[] }) {
  return (
    <dl className="key-value-list">
      {items.map((item) => (
        <div key={item.label} className="key-value-row">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
