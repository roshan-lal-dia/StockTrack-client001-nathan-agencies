/**
 * Fuzzy search utilities for multi-term matching
 * Allows partial and reordered term matching
 * Example: "LG 100" matches "LG waterpurifier - 100"
 */

/**
 * Check if a text contains all search terms (order-independent)
 * @param text - The text to search in
 * @param searchQuery - The search query with multiple terms
 * @returns boolean indicating if all terms match
 */
export const fuzzyMatch = (text: string, searchQuery: string): boolean => {
  if (!searchQuery.trim()) return true;
  
  const normalizedText = text.toLowerCase();
  const searchTerms = searchQuery
    .toLowerCase()
    .trim()
    .split(/\s+/) // Split by whitespace
    .filter(term => term.length > 0);
  
  // All search terms must be present in the text (order doesn't matter)
  return searchTerms.every(term => normalizedText.includes(term));
};

/**
 * Search inventory items with fuzzy matching across multiple fields
 * @param items - Array of inventory items to search
 * @param searchQuery - Search query string
 * @returns Filtered array of items matching the search
 */
export const fuzzySearchInventory = <T extends {
  name: string;
  shortName?: string;
  category: string;
  location: string;
  notes?: string;
}>(items: T[], searchQuery: string): T[] => {
  if (!searchQuery.trim()) return items;
  
  return items.filter(item => {
    // Combine all searchable fields
    const searchableText = [
      item.name,
      item.shortName || '',
      item.category,
      item.location,
      item.notes || ''
    ].join(' ');
    
    return fuzzyMatch(searchableText, searchQuery);
  });
};

/**
 * Search commands with fuzzy matching across label and keywords
 * @param commands - Array of commands to search
 * @param searchQuery - Search query string
 * @returns Filtered array of commands matching the search
 */
export const fuzzySearchCommands = <T extends {
  label: string;
  keywords: string[];
}>(commands: T[], searchQuery: string): T[] => {
  if (!searchQuery.trim()) return commands;
  
  return commands.filter(cmd => {
    // Combine label and all keywords
    const searchableText = [cmd.label, ...cmd.keywords].join(' ');
    return fuzzyMatch(searchableText, searchQuery);
  });
};

/**
 * Search logs with fuzzy matching across item name, user, and type
 * @param logs - Array of logs to search
 * @param searchQuery - Search query string
 * @returns Filtered array of logs matching the search
 */
export const fuzzySearchLogs = <T extends {
  itemName: string;
  user: string;
  type: string;
}>(logs: T[], searchQuery: string): T[] => {
  if (!searchQuery.trim()) return logs;
  
  return logs.filter(log => {
    // Combine all searchable fields
    const searchableText = [
      log.itemName,
      log.user,
      log.type
    ].join(' ');
    
    return fuzzyMatch(searchableText, searchQuery);
  });
};

/**
 * Search events with fuzzy matching across type, description, and user
 * @param events - Array of events to search
 * @param searchQuery - Search query string
 * @returns Filtered array of events matching the search
 */
export const fuzzySearchEvents = <T extends {
  type: string;
  description: string;
  user: string;
}>(events: T[], searchQuery: string): T[] => {
  if (!searchQuery.trim()) return events;
  
  return events.filter(event => {
    // Combine all searchable fields
    const searchableText = [
      event.type,
      event.description,
      event.user
    ].join(' ');
    
    return fuzzyMatch(searchableText, searchQuery);
  });
};
