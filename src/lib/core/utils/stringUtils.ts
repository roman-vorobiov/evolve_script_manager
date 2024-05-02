/**
 * @brief Check if the first character of @p value is a capital letter
 */
export function isCapitalized(value: string): boolean {
    const lowerBound = "A".charCodeAt(0);
    const upperBound = "Z".charCodeAt(0);

    const charCode = value.charCodeAt(0);

    return charCode >= lowerBound && charCode <= upperBound;
}
