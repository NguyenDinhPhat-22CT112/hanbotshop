export type CheckoutLine = {
  totalPrice: string;
  paymentRequirement: 'FULL' | 'DEPOSIT';
  product: { depositPercent: number };
};

export function calculateDepositRequired(items: CheckoutLine[]) {
  return items.reduce((total, item) => {
    const lineTotal = Number(item.totalPrice);
    const percent = item.paymentRequirement === 'DEPOSIT' ? item.product.depositPercent : 100;
    return total + lineTotal * percent / 100;
  }, 0);
}

export type DepositPricingLine = {
  unitPrice: string;
  paymentRequirement: 'FULL' | 'DEPOSIT';
  product: { depositPercent: number };
};

export function depositUnitPrice(line: DepositPricingLine) {
  if (line.paymentRequirement !== 'DEPOSIT') {
    return line.unitPrice;
  }

  const fullPrice = Number(line.unitPrice);

  return String(Math.round(fullPrice * line.product.depositPercent / 100));
}

export function formatVnd(value: string | number) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${new Intl.NumberFormat('vi-VN').format(amount)}đ` : String(value);
}
