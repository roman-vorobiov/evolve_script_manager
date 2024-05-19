/**
 * @brief Tell TS that @p value has the type @template T
 */
export function assert<T>(value: any): asserts value is T {}

/**
 * @brief Tell TS that @p condition holds true
 */
export function assume(condition: boolean): asserts condition {}
