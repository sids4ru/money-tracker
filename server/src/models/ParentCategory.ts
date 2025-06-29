import { query, get, run } from '../database/db';

export interface ParentCategory {
  id?: number;
  name: string;
  description?: string;
  created_at?: string;
}

export class ParentCategoryModel {
  /**
   * Get all parent categories from the database
   */
  static async getAll(): Promise<ParentCategory[]> {
    return query<ParentCategory>('SELECT * FROM parent_categories ORDER BY name');
  }

  /**
   * Get a parent category by its ID
   */
  static async getById(id: number): Promise<ParentCategory | undefined> {
    return get<ParentCategory>('SELECT * FROM parent_categories WHERE id = ?', [id]);
  }

  /**
   * Create a new parent category
   */
  static async create(parentCategory: Omit<ParentCategory, 'id' | 'created_at'>): Promise<number> {
    const result = await run(
      `INSERT INTO parent_categories (
        name, description
      ) VALUES (?, ?)`,
      [
        parentCategory.name,
        parentCategory.description || null
      ]
    );

    return result.lastID;
  }

  /**
   * Update an existing parent category
   */
  static async update(id: number, parentCategory: Partial<ParentCategory>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(parentCategory).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return false;
    }

    values.push(id);

    const result = await run(
      `UPDATE parent_categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.changes > 0;
  }

  /**
   * Delete a parent category by ID
   */
  static async delete(id: number): Promise<boolean> {
    const result = await run('DELETE FROM parent_categories WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * Find a parent category by name
   */
  static async findByName(name: string): Promise<ParentCategory | undefined> {
    return get<ParentCategory>('SELECT * FROM parent_categories WHERE name = ?', [name]);
  }

  /**
   * Get all categories that belong to a parent category
   */
  static async getCategories(parentId: number): Promise<any[]> {
    return query(
      'SELECT * FROM categories WHERE parent_id = ? ORDER BY name',
      [parentId]
    );
  }
  
  /**
   * Get all parent categories with their children in a single efficient query
   */
  static async getAllWithChildren(): Promise<any[]> {
    return query(`
      SELECT pc.*, 
             c.id as child_id, c.name as child_name, 
             c.description as child_description, c.created_at as child_created_at
      FROM parent_categories pc
      LEFT JOIN categories c ON pc.id = c.parent_id
      ORDER BY pc.name, c.name
    `);
  }
}
