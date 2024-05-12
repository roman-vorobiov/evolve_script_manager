/**
 * @brief Tell TS that @p value has the type @template T
 */
export function assert<T>(value: any): asserts value is T {}
