/**
 * Preposiciones que se mantienen en minúscula dentro de nombres
 * cuando NO son la primera palabra.
 */
const LOWERCASE_WORDS = new Set([
  'de', 'del', 'la', 'las', 'los', 'lo',
  'y', 'e', 'da', 'das', 'do', 'dos',
]);

/**
 * Normaliza un nombre completo:
 * - Todo a minúsculas
 * - Primera letra de cada palabra en mayúscula
 * - Preposiciones en minúscula (excepto si son la primera palabra)
 * - Elimina espacios múltiples
 *
 * @param {string} name - Nombre tal como lo escribió el usuario
 * @returns {string} Nombre normalizado
 *
 * @example
 *   normalizeName('JUAN CARLOS PÉREZ')       // 'Juan Carlos Pérez'
 *   normalizeName('maría de la luz garcía')  // 'María de la Luz García'
 *   normalizeName('  pedro   del  valle  ')  // 'Pedro del Valle'
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .replace(/\s+/g, ' ')         // colapsar espacios múltiples
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Preposición en minúscula (excepto si es la primera palabra)
      if (index > 0 && LOWERCASE_WORDS.has(word)) {
        return word;
      }
      // Capitalizar primera letra, preservar resto
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}