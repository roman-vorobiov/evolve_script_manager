/**
 * @brief Yield from all iterables
 */
export function* concatenate(...iterators: Iterable<any>[]) {
    for (let it of iterators) {
        yield* it;
    }
}
