/**
 * Category utility functions for standardization and normalization
 */

/**
 * Normalize category to uppercase and trim whitespace
 * Example: "electronics" → "ELECTRONICS"
 */
export const normalizeCategory = (text: string): string => {
  if (!text) return 'UNCATEGORIZED';
  // Trim edges, collapse internal whitespace, and uppercase
  return text.trim().replace(/\s+/g, ' ').toUpperCase();
};

/**
 * Get all unique categories from inventory items
 */
export const getUniqueCategories = (inventory: Array<{ category: string }>): string[] => {
  const categories = new Set(
    inventory
      .map(item => item.category)
      .filter(cat => cat && cat.trim())
  );
  return Array.from(categories).sort();
};

/**
 * Filter categories by search term (case-insensitive)
 */
export const filterCategories = (categories: string[], searchTerm: string): string[] => {
  if (!searchTerm.trim()) return categories;
  const lowerSearch = searchTerm.toLowerCase();
  return categories.filter(cat => cat.toLowerCase().includes(lowerSearch));
};
