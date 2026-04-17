import { Category } from '@/types';
import { getDb } from './client';
import { nowIso } from './helpers';

export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.getAllAsync<Category>(
    'SELECT * FROM categories ORDER BY sortOrder ASC, id ASC',
  );
}

export async function addCategory(
  name: string,
  emoji: string,
  color: string,
): Promise<number> {
  const db = await getDb();
  const trimmed = name.trim();

  const existing = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM categories WHERE LOWER(name)=LOWER(?)',
    [trimmed],
  );
  if (existing && existing.n > 0) throw new Error('A category with this name already exists.');

  const maxSort = await db.getFirstAsync<{ m: number }>(
    'SELECT MAX(sortOrder) AS m FROM categories',
  );
  const sortOrder = (maxSort?.m ?? -1) + 1;

  const result = await db.runAsync(
    'INSERT INTO categories (name, emoji, color, isDefault, sortOrder, createdAt) VALUES (?,?,?,0,?,?)',
    [trimmed, emoji, color, sortOrder, nowIso()],
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  id: number,
  name: string,
  emoji: string,
  color: string,
): Promise<void> {
  const db = await getDb();
  const trimmed = name.trim();

  const cat = await db.getFirstAsync<Category>(
    'SELECT * FROM categories WHERE id=?',
    [id],
  );
  if (!cat) throw new Error('Category not found.');

  if (!cat.isDefault) {
    const dup = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM categories WHERE LOWER(name)=LOWER(?) AND id!=?',
      [trimmed, id],
    );
    if (dup && dup.n > 0) throw new Error('A category with this name already exists.');
  }

  await db.runAsync(
    'UPDATE categories SET emoji=?, color=?, name=? WHERE id=?',
    [emoji, color, cat.isDefault ? cat.name : trimmed, id],
  );

  // Rename all expenses that use the old name (only for custom categories)
  if (!cat.isDefault && cat.name !== trimmed) {
    await db.runAsync(
      'UPDATE expenses SET category=? WHERE category=?',
      [trimmed, cat.name],
    );
  }
}

export async function deleteCategory(
  id: number,
): Promise<{ ok: boolean; reason?: string }> {
  const db = await getDb();

  const cat = await db.getFirstAsync<Category>(
    'SELECT * FROM categories WHERE id=?',
    [id],
  );
  if (!cat) return { ok: false, reason: 'Category not found.' };
  if (cat.isDefault) return { ok: false, reason: 'Built-in categories cannot be deleted.' };

  const used = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM expenses WHERE category=?',
    [cat.name],
  );
  if (used && used.n > 0) {
    return {
      ok: false,
      reason: `"${cat.name}" is used by ${used.n} expense${used.n > 1 ? 's' : ''}. Delete those expenses first.`,
    };
  }

  await db.runAsync('DELETE FROM categories WHERE id=?', [id]);
  return { ok: true };
}

/** Returns a map of { [categoryName]: expenseCount } for all categories */
export async function getCategoryUsageCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string; cnt: number }>(
    'SELECT category, COUNT(*) AS cnt FROM expenses GROUP BY category',
  );
  const map: Record<string, number> = {};
  rows.forEach((r) => (map[r.category] = r.cnt));
  return map;
}
