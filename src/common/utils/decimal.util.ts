import { Decimal } from '@prisma/client/runtime/library';

export function decimalToNumber(value: Decimal): number {
  return value.toNumber();
}
