import { query, get, run } from '../database/db';

export interface TransactionSimilarityPattern {
  id?: number;
  pattern_type: string; // 'exact', 'regex', 'fuzzy', etc.
  pattern_value: string;
  parent_category_id?: number | null;
  category_id?: number | null;
  confidence_score?: number;
  created_at?: string;
  updated_at?: string;
  usage_count?: number;
}

export class TransactionSimilarityPatternModel {
  /**
   * Get all transaction similarity patterns
   */
  static async getAll(): Promise<TransactionSimilarityPattern[]> {
    return query<TransactionSimilarityPattern>(`
      SELECT * FROM transaction_similarity_patterns 
      ORDER BY confidence_score DESC, usage_count DESC
    `);
  }

  /**
   * Get a transaction similarity pattern by ID
   */
  static async getById(id: number): Promise<TransactionSimilarityPattern | undefined> {
    return get<TransactionSimilarityPattern>(
      'SELECT * FROM transaction_similarity_patterns WHERE id = ?',
      [id]
    );
  }

  /**
   * Create a new transaction similarity pattern
   */
  static async create(pattern: Omit<TransactionSimilarityPattern, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<number> {
    const result = await run(
      `INSERT INTO transaction_similarity_patterns (
        pattern_type, pattern_value, parent_category_id, category_id, confidence_score
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        pattern.pattern_type,
        pattern.pattern_value,
        pattern.parent_category_id || null,
        pattern.category_id || null,
        pattern.confidence_score || 1.0
      ]
    );

    return result.lastID;
  }

  /**
   * Update an existing transaction similarity pattern
   */
  static async update(id: number, pattern: Partial<TransactionSimilarityPattern>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(pattern).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    // Always update the updated_at timestamp
    fields.push('updated_at = CURRENT_TIMESTAMP');

    if (fields.length === 0) {
      return false;
    }

    values.push(id);

    const result = await run(
      `UPDATE transaction_similarity_patterns SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.changes > 0;
  }

  /**
   * Delete a transaction similarity pattern by ID
   */
  static async delete(id: number): Promise<boolean> {
    const result = await run(
      'DELETE FROM transaction_similarity_patterns WHERE id = ?', 
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Get patterns by category ID
   */
  static async getByCategoryId(categoryId: number): Promise<TransactionSimilarityPattern[]> {
    return query<TransactionSimilarityPattern>(
      'SELECT * FROM transaction_similarity_patterns WHERE category_id = ? ORDER BY confidence_score DESC',
      [categoryId]
    );
  }

  /**
   * Get patterns by parent category ID
   */
  static async getByParentCategoryId(parentCategoryId: number): Promise<TransactionSimilarityPattern[]> {
    return query<TransactionSimilarityPattern>(
      'SELECT * FROM transaction_similarity_patterns WHERE parent_category_id = ? ORDER BY confidence_score DESC',
      [parentCategoryId]
    );
  }

  /**
   * Increment the usage count for a pattern
   */
  static async incrementUsageCount(id: number): Promise<boolean> {
    const result = await run(
      'UPDATE transaction_similarity_patterns SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Find patterns that match a transaction description
   */
  static async findMatchingPatterns(description: string): Promise<TransactionSimilarityPattern[]> {
    // Get all patterns
    const patterns = await TransactionSimilarityPatternModel.getAll();
    
    // Filter patterns based on matching logic
    return patterns.filter(pattern => {
      // This is a simplified matching logic - we can enhance it later
      switch (pattern.pattern_type) {
        case 'exact':
          return description.toLowerCase() === pattern.pattern_value.toLowerCase();
        case 'contains':
          return description.toLowerCase().includes(pattern.pattern_value.toLowerCase());
        case 'starts_with':
          return description.toLowerCase().startsWith(pattern.pattern_value.toLowerCase());
        case 'regex':
          try {
            const regex = new RegExp(pattern.pattern_value, 'i');
            return regex.test(description);
          } catch (e) {
            console.error('Invalid regex pattern:', pattern.pattern_value);
            return false;
          }
        default:
          return false;
      }
    });
  }
}
