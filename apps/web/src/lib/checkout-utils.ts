export type CheckoutLine = {
  unitPrice?: string | number;
  totalPrice: string;
  quantity?: number;
  paymentRequirement: 'FULL' | 'DEPOSIT';
  product?: { depositPercent?: number | null; compareAtPrice?: string | number | null } | null;
};

export function depositPercentOf(item: { product?: { depositPercent?: number | null } | null }) {
  const percent = Number(item.product?.depositPercent);

  return Number.isFinite(percent) && percent > 0 ? percent : 100;
}

export function calculateDepositRequired(lines: CheckoutLine[]) {
  return lines.reduce((total, line) => {
    const unitPrice = Number(line.unitPrice);
    const totalPrice = Number(line.totalPrice);
    const hasUnit = Number.isFinite(unitPrice) && unitPrice > 0;
    const hasTotal = Number.isFinite(totalPrice) && totalPrice > 0;
    const base = hasTotal ? totalPrice : hasUnit ? unitPrice : 0;

    if (line.paymentRequirement !== 'DEPOSIT') {
      return total + base;
    }

    const compare = Number(line.product?.compareAtPrice);

    if (hasUnit && Number.isFinite(compare) && compare > 0 && compare < unitPrice) {
      const quantity = Number(line.quantity) || (hasTotal ? totalPrice / unitPrice : 1);

      return total + compare * quantity;
    }

    return total + base * depositPercentOf(line) / 100;
  }, 0);
}

export type DepositPricingLine = {
  unitPrice: string;
  paymentRequirement: 'FULL' | 'DEPOSIT';
  product?: { depositPercent?: number | null; compareAtPrice?: string | number | null } | null;
};

export function depositUnitPrice(line: DepositPricingLine) {
  return String(numberDepositUnit(line));
}

function numberDepositUnit(line: { unitPrice?: string | number; paymentRequirement: 'FULL' | 'DEPOSIT'; product?: { depositPercent?: number | null; compareAtPrice?: string | number | null } | null }) {
  const full = Number(line.unitPrice);
  const fullOk = Number.isFinite(full) && full > 0;

  if (line.paymentRequirement !== 'DEPOSIT') {
    return fullOk ? full : 0;
  }

  const compare = Number(line.product?.compareAtPrice);

  if (fullOk && Number.isFinite(compare) && compare > 0 && compare < full) {
    return compare;
  }

  return fullOk ? Math.round(full * depositPercentOf(line) / 100) : 0;
}

export function formatVnd(value: string | number) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${new Intl.NumberFormat('vi-VN').format(amount)}đ` : String(value);
}