import React from 'react';

export function InventoryAntLogoMark({ className = "h-10 w-auto" }) {
  return (
    <img 
      src="/icon.png" 
      alt="Inventory Ant Logo" 
      className={`${className} shrink-0 object-contain`}
      style={{ display: 'block' }}
    />
  );
}

export function InventoryAntLogoText() {
  // Returns null because icon.png already contains the complete brand typography.
  return null;
}

export default function InventoryAntLogo({ classNameMark = "h-10 w-auto" }) {
  return <InventoryAntLogoMark className={classNameMark} />;
}
