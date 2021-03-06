import Expression from '../Expression';
import isSubtypeOf from '../dataTypes/isSubtypeOf';
import Sequence from '../dataTypes/Sequence';
import { DONE_TOKEN, ready, notReady } from '../util/iterators';

/**
 * @extends {Expression}
 */
class Filter extends Expression {
	/**
	 * @param  {Expression}    selector
	 * @param  {Expression}    filterExpression
	 */
	constructor (selector, filterExpression) {
		super(
			selector.specificity.add(filterExpression.specificity),
			[selector, filterExpression],
			{
				resultOrder: selector.expectedResultOrder,
				peer: selector.peer,
				subtree: selector.subtree,
				canBeStaticallyEvaluated: selector.canBeStaticallyEvaluated && filterExpression.canBeStaticallyEvaluated
			});

		this._selector = selector;
		this._filterExpression = filterExpression;
	}

	getBucket () {
		return this._selector.getBucket();
	}

	evaluate (dynamicContext, executionParameters) {
		/**
		 * @type {!Sequence}
		 */
		const valuesToFilter = this._selector.evaluateMaybeStatically(dynamicContext, executionParameters);

		if (this._filterExpression.canBeStaticallyEvaluated) {
			// Shortcut, if this is numeric, all the values are the same numeric value, same for booleans
			const result = this._filterExpression.evaluateMaybeStatically(dynamicContext, executionParameters);
			if (result.isEmpty()) {
				return result;
			}

			const resultValue = result.first();
			if (isSubtypeOf(resultValue.type, 'xs:numeric')) {
				let requestedIndex = resultValue.value;
				if (!Number.isInteger(requestedIndex)) {
					// There are only values for integer positions
					return Sequence.empty();
				}
				const iterator = valuesToFilter.value();
				let done = false;
				// Note that using filter here is a bad choice, because we only want one item.
				// TODO: implement Sequence.itemAt(i), which is a no-op for empty sequences, a O(1) op for array backed sequence / singleton sequences and a O(n) for normal sequences.
				// If we move sorting to sequences, this will be even faster, since a select is faster than a sort.
				return new Sequence({
					next: () => {
						if (!done) {
							for (let value = iterator.next(); !value.done; value = iterator.next()) {
								if (!value.ready) {
									return value;
								}
								if (requestedIndex-- === 1) {
									done = true;
									return value;
								}
							}
							done = true;
						}
						return DONE_TOKEN;
					}
				});
			}
			// If all the items resolve to true, we can return all items, or none if vice versa
			// This can be gotten synchronously, because of the check for static evaluation
			if (result.getEffectiveBooleanValue()) {
				return valuesToFilter;
			}
			return Sequence.empty();
		}

		const iteratorToFilter = valuesToFilter.value();
		let iteratorItem = null;
		let i = 0;
		let filterResultSequence = null;
		return new Sequence({
			next: () => {
				while (!iteratorItem || !iteratorItem.done) {
					if (!iteratorItem) {
						iteratorItem = iteratorToFilter.next();
					}
					if (iteratorItem.done) {
						return iteratorItem;
					}
					if (!iteratorItem.ready) {
						const itemToReturn = iteratorItem;
						iteratorItem = null;
						return itemToReturn;
					}
					if (!filterResultSequence) {
						filterResultSequence = this._filterExpression.evaluateMaybeStatically(
							dynamicContext.scopeWithFocus(i, iteratorItem.value, valuesToFilter),
							executionParameters);
					}

					const first = filterResultSequence.tryGetFirst();
					if (!first.ready) {
						return notReady(first.promise);
					}
					let shouldReturnCurrentValue;
					if (first.value === null) {
						// Actually empty, very falsy indeed
						// Continue to next
						shouldReturnCurrentValue = false;
					}
					else if (isSubtypeOf(first.value.type, 'xs:numeric')) {
						// Remember: XPath is one-based
						shouldReturnCurrentValue = first.value.value === i + 1;
					}
					else {
						const ebv = filterResultSequence.tryGetEffectiveBooleanValue();
						if (!ebv.ready) {
							return notReady(ebv.promise);
						}
						shouldReturnCurrentValue = ebv.value;
					}
					// Prepare awaiting the next one
					filterResultSequence = null;
					const returnableValue = iteratorItem.value;
					iteratorItem = null;
					i++;
					if (shouldReturnCurrentValue) {
						return ready(returnableValue);
					}
					// Continue to the next one
				}

				return iteratorItem;
			}
		});
	}
}

export default Filter;
