import { AccountType } from '@/types';

export function nowIso(): string {
  return new Date().toISOString();
}

export function toMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(amountMinor: number): number {
  return amountMinor / 100;
}

export function toDbAccountType(type: AccountType): string {
  if (type === 'bank_account') return 'BANK';
  if (type === 'e_wallet') return 'EWALLET';
  return 'CASH';
}

export function fromDbAccountType(type: string): AccountType {
  if (type === 'BANK') return 'bank_account';
  if (type === 'EWALLET') return 'e_wallet';
  return 'cash';
}
