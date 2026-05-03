import { Category, TransactionType } from '@/types';
import { getDb } from './client';
import { nowIso } from './helpers';

interface CategoryRow {
  id: number;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  isDefault: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
}

const CATEGORY_SELECT = `
  SELECT id, name, type, icon, color, isDefault, sortOrder, createdAt, updatedAt
  FROM categories
`;

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    emoji: row.icon ?? (row.type === 'INCOME' ? '💰' : '📦'),
    color: row.color ?? (row.type === 'INCOME' ? '#10B981' : '#408A71'),
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getCategoriesByType(type: TransactionType): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryRow>(
    `${CATEGORY_SELECT} WHERE type = ? ORDER BY sortOrder ASC, id ASC`,
    [type],
  );
  return rows.map(toCategory);
}

async function addCategoryByType(
  type: TransactionType,
  name: string,
  emoji: string,
  color: string,
): Promise<number> {
  const db = await getDb();
  const trimmed = name.trim();

  const existing = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM categories WHERE type = ? AND LOWER(name)=LOWER(?)',
    [type, trimmed],
  );
  if (existing && existing.n > 0) throw new Error('A category with this name already exists.');

  const maxSort = await db.getFirstAsync<{ m: number }>(
    'SELECT MAX(sortOrder) AS m FROM categories WHERE type = ?',
    [type],
  );
  const sortOrder = (maxSort?.m ?? -1) + 1;
  const now = nowIso();

  const result = await db.runAsync(
    'INSERT INTO categories (name, type, icon, color, isDefault, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, ?, ?, ?)',
    [trimmed, type, emoji, color, sortOrder, now, now],
  );
  return result.lastInsertRowId;
}

async function updateCategoryByType(
  type: TransactionType,
  id: number,
  name: string,
  emoji: string,
  color: string,
): Promise<void> {
  const db = await getDb();
  const trimmed = name.trim();

  const cat = await db.getFirstAsync<CategoryRow>(
    `${CATEGORY_SELECT} WHERE id=? AND type=?`,
    [id, type],
  );
  if (!cat) throw new Error('Category not found.');

  if (!cat.isDefault) {
    const dup = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM categories WHERE type = ? AND LOWER(name)=LOWER(?) AND id!=?',
      [type, trimmed, id],
    );
    if (dup && dup.n > 0) throw new Error('A category with this name already exists.');
  }

  await db.runAsync(
    'UPDATE categories SET icon=?, color=?, name=?, updatedAt=? WHERE id=? AND type=?',
    [emoji, color, cat.isDefault ? cat.name : trimmed, nowIso(), id, type],
  );
}

async function deleteCategoryByType(
  type: TransactionType,
  id: number,
): Promise<{ ok: boolean; reason?: string }> {
  const db = await getDb();

  const cat = await db.getFirstAsync<CategoryRow>(
    `${CATEGORY_SELECT} WHERE id=? AND type=?`,
    [id, type],
  );
  if (!cat) return { ok: false, reason: 'Category not found.' };
  if (cat.isDefault) return { ok: false, reason: 'Built-in categories cannot be deleted.' };

  const used = await db.getFirstAsync<{ n: number }>(
    `SELECT
       (SELECT COUNT(*) FROM transactions WHERE categoryId=? AND deletedAt IS NULL) +
       (SELECT COUNT(*) FROM transaction_items WHERE categoryId=?)
     AS n`,
    [id, id],
  );
  if (used && used.n > 0) {
    const noun = type === 'INCOME' ? 'income' : 'expense';
    return {
      ok: false,
      reason: `"${cat.name}" is used by ${used.n} ${noun}${used.n > 1 ? 's' : ''}. Delete those ${noun}s first.`,
    };
  }

  await db.runAsync('DELETE FROM categories WHERE id=? AND type=?', [id, type]);
  return { ok: true };
}

export async function getCategories(): Promise<Category[]> {
  return getCategoriesByType('EXPENSE');
}

export async function addCategory(
  name: string,
  emoji: string,
  color: string,
): Promise<number> {
  return addCategoryByType('EXPENSE', name, emoji, color);
}

export async function updateCategory(
  id: number,
  name: string,
  emoji: string,
  color: string,
): Promise<void> {
  return updateCategoryByType('EXPENSE', id, name, emoji, color);
}

export async function deleteCategory(
  id: number,
): Promise<{ ok: boolean; reason?: string }> {
  return deleteCategoryByType('EXPENSE', id);
}

/** Returns a map of { [categoryName]: expenseCount } for all expense categories */
export async function getCategoryUsageCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string; cnt: number }>(
    `SELECT c.name AS category, COUNT(*) AS cnt
     FROM transactions t
     JOIN categories c ON c.id = t.categoryId
     WHERE t.type = 'EXPENSE' AND t.deletedAt IS NULL
     GROUP BY c.name`,
  );
  const map: Record<string, number> = {};
  rows.forEach((r) => (map[r.category] = r.cnt));
  return map;
}

export const categoryInternals = {
  getCategoriesByType,
  addCategoryByType,
  updateCategoryByType,
  deleteCategoryByType,
  toCategory,
};
