import isInstanceOfType from '../../dataTypes/isInstanceOfType';
import castToType from '../../dataTypes/castToType';
import Sequence from '../../dataTypes/Sequence';
import Selector from '../../Selector';
import createAtomicValue from '../../dataTypes/createAtomicValue';

function executeOperator (kind, a, b) {
    switch (kind) {
        case '+':
            return a + b;
        case '-':
            return a - b;
        case '*':
            return a * b;
        case 'div':
            return a / b;
        case 'idiv':
            return Math.trunc(a / b);
        case 'mod':
            return a % b;
    }
}

/**
 * @extends {Selector}
 */
class BinaryNumericOperator extends Selector {
	/**
	 * @param  {string}    kind             One of +, -, *, div, idiv, mod
	 * @param  {Selector}  firstValueExpr   The selector evaluating to the first value to process
	 * @param  {Selector}  secondValueExpr  The selector evaluating to the second value to process
	 */
	constructor (kind, firstValueExpr, secondValueExpr) {
		super(firstValueExpr.specificity.add(secondValueExpr.specificity), {
			canBeStaticallyEvaluated: false
		});
		this._firstValueExpr = firstValueExpr;
		this._secondValueExpr = secondValueExpr;

		this._kind = kind;
	}

	evaluate (dynamicContext) {
		const firstValueSequence = this._firstValueExpr.evaluateMaybeStatically(dynamicContext).atomize(dynamicContext);
		if (firstValueSequence.isEmpty()) {
			// Shortcut, if the first part is empty, we can return empty.
			// As per spec, we do not have to evaluate the second part, though we could.
			return firstValueSequence;
		}
		const secondValueSequence = this._secondValueExpr.evaluateMaybeStatically(dynamicContext).atomize(dynamicContext);
		if (secondValueSequence.isEmpty()) {
			return secondValueSequence;
		}

		if (!firstValueSequence.isSingleton() || !secondValueSequence.isSingleton()) {
			throw new Error('XPTY0004: the operands of the "' + this._kind + '" operator should be of type xs:numeric?.');
		}

		// Cast both to doubles, if they are xs:untypedAtomic
		let firstValue = firstValueSequence.first(),
			secondValue = secondValueSequence.first();

		if (isInstanceOfType(firstValue, 'xs:untypedAtomic')) {
			firstValue = castToType(firstValue, 'xs:double');
		}

		if (isInstanceOfType(secondValue, 'xs:untypedAtomic')) {
			secondValue = castToType(secondValue, 'xs:double');
		}

		if (!isInstanceOfType(firstValue, 'xs:numeric') || !isInstanceOfType(secondValue, 'xs:numeric')) {
			// TODO: date / time like values
			throw new Error('XPTY0004: the operands of the "' + this._kind + '" operator should be of type xs:numeric?.');
		}

		const result = executeOperator(this._kind, firstValue.value, secondValue.value);
		let typedResult;
		// Override for types
		if (this._kind === 'div') {
			typedResult = createAtomicValue(result, 'xs:decimal');
		}
		else if (this._kind === 'idiv') {
			typedResult = createAtomicValue(result, 'xs:integer');
		}
		else {
			// For now, always return a decimal, it's all the same in JavaScript
			typedResult = createAtomicValue(result, 'xs:decimal');
		}
		return Sequence.singleton(typedResult);
	}
}

export default BinaryNumericOperator;
