import { Clause } from '../types';

/**
 * Generates a cryptographically strong, human-readable unique clause ID.
 * Examples: 'c-ly9z8k-7a1b3c9', 'adhoc-ly9z8k-4f8d2e1'
 */
export function generateUniqueClauseId(
  prefix: 'c' | 'adhoc' = 'c',
  existingIds?: string[] | Set<string>
): string {
  const timestamp = Date.now().toString(36);
  const existingSet = existingIds instanceof Set
    ? existingIds
    : (existingIds ? new Set(existingIds) : null);

  let newId = '';
  do {
    const randomPart = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 6);
    newId = `${prefix}-${timestamp}-${randomPart}`;
  } while (existingSet && existingSet.has(newId));

  return newId;
}

/**
 * Ensures all clauses in a collection have distinct, guaranteed unique IDs.
 * If a clause is missing an ID or has a duplicate, it gets assigned a fresh unique ID.
 */
export function ensureUniqueClauseIds(
  clauses: Clause[],
  existingPool?: Set<string>
): Clause[] {
  const seenIds = new Set<string>(existingPool || []);

  return clauses.map(clause => {
    let currentId = clause.id;
    if (!currentId || seenIds.has(currentId)) {
      currentId = generateUniqueClauseId(clause.isAdHoc ? 'adhoc' : 'c', seenIds);
    }
    seenIds.add(currentId);

    return {
      ...clause,
      id: currentId
    };
  });
}
