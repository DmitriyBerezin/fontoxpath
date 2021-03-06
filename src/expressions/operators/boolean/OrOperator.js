import Expression from '../../Expression';
import Specificity from '../../Specificity';
import Sequence from '../../dataTypes/Sequence';
import { trueBoolean, falseBoolean } from '../../dataTypes/createAtomicValue';
import { DONE_TOKEN, notReady, ready } from '../../util/iterators';

/**
 * @extends {Expression}
 */
class OrOperator extends Expression {
	/**
	 * @param  {!Array<!Expression>}  expressions
	 */
	constructor (expressions) {
		const maxSpecificity = expressions.reduce((maxSpecificity, selector) => {
			if (maxSpecificity.compareTo(selector.specificity) > 0) {
				return maxSpecificity;
			}
			return selector.specificity;
		}, new Specificity({}));

		super(
			maxSpecificity,
			expressions,
			{
				canBeStaticallyEvaluated: expressions.every(selector => selector.canBeStaticallyEvaluated)
			});

		// If all subExpressions define the same bucket: use that one, else, use no bucket.
		this._bucket = expressions.reduce(function (bucket, selector) {
			if (bucket === undefined) {
				return selector.getBucket();
			}
			if (bucket === null) {
				return null;
			}

			if (bucket !== selector.getBucket()) {
				return null;
			}

			return bucket;
		}, undefined);

		this._subExpressions = expressions;
	}

	evaluate (dynamicContext, executionParameters) {
		let i = 0;
		let resultSequence = null;
		let done = false;
		return new Sequence({
			next: () => {
				if (!done) {
					while (i < this._subExpressions.length) {
						if (!resultSequence) {
							resultSequence = this._subExpressions[i].evaluateMaybeStatically(dynamicContext, executionParameters);
						}
						const ebv = resultSequence.tryGetEffectiveBooleanValue();
						if (!ebv.ready) {
							return notReady(ebv.promise);
						}
						if (ebv.value === true) {
							done = true;
							return ready(trueBoolean);
						}
						resultSequence = null;
						i++;
					}
					done = true;
					return ready(falseBoolean);
				}
				return DONE_TOKEN;
			}
		});
	}

	getBucket () {
		return this._bucket;
	}
}

export default OrOperator;
