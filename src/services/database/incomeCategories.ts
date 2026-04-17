import { IncomeCategory } from '@/types';
import { getDb } from './client';
import { nowIso } from './helpers';

export async function getIncomeCategories(): Promise<IncomeCategory[]> {
  const db = await getDb();
  return db.getAllAsync<IncomeCategory>(
    'SELECT * FROM income_categories ORDER BY sortOrder ASC, id ASC',
  );
}

export async function addIncomeCategory(
  name: string,
  emoji: string,
  color: string,
): Promise<number> {
  const db = await getDb();
  const trimmed = name.trim();

  const existing = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM income_categories WHERE LOWER(name)=LOWER(?)',
    [trimmed],
  );
  if (existing && existing.n > 0) throw new Error('A category with this name already exists.');

  const maxSort = await db.getFirstAsync<{ m: number }>(
    'SELECT MAX(sortOrder) AS m FROM income_categories',
  );
  const sortOrder = (maxSort?.m ?? -1) + 1;

  const result = await db.runAsync(
    'INSERT INTO income_categories (name, emoji, color, isDefault, sortOrder, createdAt) VALUES (?,?,?,0,?,?)',
    [trimmed, emoji, color, sortOrder, nowIso()],
  );
  return result.lastInsertRowId;
}

export async function updateIncomeCategory(
  id: number,
  name: string,
  emoji: string,
  color: string,
): Promise<void> {
  const db = await getDb();
  const trimmed = name.trim();

  const cat = await db.getFirstAsync<IncomeCategory>(
    'SELECT * FROM income_categories WHERE id=?',
    [id],
  );
  if (!cat) throw new Error('Category not found.');

  if (!cat.isDefault) {
    const dup = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM income_categories WHERE LOWER(name)=LOWER(?) AND id!=?',
      [trimmed, id],
    );
    if (dup && dup.n > 0) throw new Error('A category with this name already exists.');
  }

  await db.runAsync(
    'UPDATE income_categories SET emoji=?, color=?, name=? WHERE id=?',
    [emoji, color, cat.isDefault ? cat.name : trimmed, id],
  );

  // Rename all incomes that use the old name (only for custom categories)
  if (!cat.isDefault && cat.name !== trimmed) {
    await db.runAsync(
      'UPDATE incomes SET category=? WHERE category=?',
      [trimmed, cat.name],
    );
  }
}

export async function deleteIncomeCategory(id: number): Promise<{ ok: boolean; reason?: string }> {
  const db = await getDb();

  const cat = await db.getFirstAsync<IncomeCategory>(
    'SELECT * FROM income_categories WHERE id=?',
    [id],
  );
  if (!cat) return { ok: false, reason: 'Category not found.' };
  if (cat.isDefault) return { ok: false, reason: 'Built-in categories cannot be deleted.' };

  const used = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM incomes WHERE category=?',
    [cat.name],
  );
  if (used && used.n > 0) {
    return {
      ok: false,
      reason: `"${cat.name}" is used by ${used.n} income${used.n > 1 ? 's' : ''}. Delete those incomes first.`,
    };
  }

  await db.runAsync('DELETE FROM income_categories WHERE id=?', [id]);
  return { ok: true };
}
