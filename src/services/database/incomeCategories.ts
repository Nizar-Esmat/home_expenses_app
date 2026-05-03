import { IncomeCategory } from '@/types';
import { categoryInternals } from './categories';

export async function getIncomeCategories(): Promise<IncomeCategory[]> {
  return categoryInternals.getCategoriesByType('INCOME');
}

export async function addIncomeCategory(
  name: string,
  emoji: string,
  color: string,
): Promise<number> {
  return categoryInternals.addCategoryByType('INCOME', name, emoji, color);
}

export async function updateIncomeCategory(
  id: number,
  name: string,
  emoji: string,
  color: string,
): Promise<void> {
  return categoryInternals.updateCategoryByType('INCOME', id, name, emoji, color);
}

export async function deleteIncomeCategory(id: number): Promise<{ ok: boolean; reason?: string }> {
  return categoryInternals.deleteCategoryByType('INCOME', id);
}
