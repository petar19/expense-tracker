// The expense form's price field is always "per item" — the total that gets
// saved/displayed is price × itemCount, so buying several of the same thing
// doesn't require doing that multiplication by hand.

export function computeTotalPrice(pricePerItem: number, itemCount: number | null | undefined): number {
  const count = itemCount && itemCount > 0 ? itemCount : 1;
  return Math.round(pricePerItem * count * 100) / 100;
}

// Reverses computeTotalPrice — used to prefill the per-item price field when
// editing an expense, since expense.price is already the saved total.
export function computePerItemPrice(totalPrice: number, itemCount: number | null | undefined): number {
  const count = itemCount && itemCount > 0 ? itemCount : 1;
  return totalPrice / count;
}
