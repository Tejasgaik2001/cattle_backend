/**
 * Formats a Date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Parses a YYYY-MM-DD string to Date
 */
export function parseDate(dateString: string): Date {
    return new Date(dateString + 'T00:00:00.000Z');
}

/**
 * Checks if a date is in the future
 */
export function isFutureDate(date: Date | string): boolean {
    const checkDate = typeof date === 'string' ? parseDate(date) : date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkDate > today;
}

/**
 * Calculates age in years from a birth date
 */
export function calculateAge(birthDate: Date | string): number {
    const birth = typeof birthDate === 'string' ? parseDate(birthDate) : birthDate;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * Adds days to a date
 */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Gets the start of day for a date
 */
export function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Gets the end of day for a date
 */
export function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * Gets the start of month for a date
 */
export function startOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Gets the end of month for a date
 */
export function endOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1);
    result.setDate(0);
    result.setHours(23, 59, 59, 999);
    return result;
}
