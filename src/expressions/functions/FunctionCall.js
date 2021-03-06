import argumentListToString from './argumentListToString';
import { transformArgument } from './argumentHelper';
import Expression from '../Expression';
import Specificity from '../Specificity';
import isSubtypeOf from '../dataTypes/isSubtypeOf';
import FunctionValue from '../dataTypes/FunctionValue';

function transformArgumentList (argumentTypes, argumentList, executionParameters, functionItem) {
	if (argumentList.length !== argumentTypes.length) {
		return null;
	}
	var transformedArguments = [];
	for (let i = 0; i < argumentList.length; ++i) {
		if (argumentList[i] === null) {
			// This is the result of partial application, it will be inserted later
			transformedArguments.push(null);
			continue;
		}
		const transformedArgument = transformArgument(argumentTypes[i], argumentList[i], executionParameters, functionItem);
		if (transformedArgument === null) {
			return null;
		}
		transformedArguments.push(transformedArgument);
	}
	return transformedArguments;
}

/**
 * @extends Expression
 */
class FunctionCall extends Expression {
	/**
	 * @param  {!Expression}    functionReference  Reference to the function to execute.
	 * @param  {!Array<!Expression>}  args              The arguments to be evaluated and passed to the function
	 */
	constructor (functionReference, args) {
		super(
			new Specificity({
				[Specificity.EXTERNAL_KIND]: 1
			}),
			[functionReference].concat(args.filter(arg => !!arg)),
			{
				resultOrder: Expression.RESULT_ORDERINGS.UNSORTED,
				peer: false,
				subtree: false,
				canBeStaticallyEvaluated: false //args.every(arg => arg.canBeStaticallyEvaluated) && functionReference.canBeStaticallyEvaluated
			});

		this._args = args;
		this._functionReference = functionReference;

		this._staticContext = null;
	}

	performStaticEvaluation (staticContext) {
		this._staticContext = staticContext.cloneContext();
		super.performStaticEvaluation(staticContext);
	}

	evaluate (dynamicContext, executionParameters) {
		var sequence = this._functionReference.evaluateMaybeStatically(dynamicContext, executionParameters);
		return sequence.switchCases({
			default: () => {
				throw new Error('XPTY0004: expected base expression to evaluate to a sequence with a single item');
			},
			singleton: () => {
				return sequence.mapAll(([item]) => {
					if (!isSubtypeOf(item.type, 'function(*)')) {
						throw new Error('XPTY0004: expected base expression to evaluate to a function item');
					}

					const functionItem = /** @type {!FunctionValue} */ (item);

					if (functionItem.getArity() !== this._args.length) {
						throw new Error(`XPTY0004: expected arity of function ${functionItem.getName()} to be ${this._args.length}, got function with arity of ${functionItem.getArity()}`);
					}

					var evaluatedArgs = this._args.map(argument => {
						if (argument === null) {
							return null;
						}
						return argument.evaluateMaybeStatically(dynamicContext, executionParameters);
					});

					// Test if we have the correct arguments, and pre-convert the ones we can pre-convert
					var transformedArguments = transformArgumentList(functionItem.getArgumentTypes(), evaluatedArgs, executionParameters, functionItem.getName());
					if (transformedArguments === null) {
						throw new Error(`XPTY0004: expected argument list of function ${functionItem.getName()} to be [${argumentListToString(evaluatedArgs)}], got function with argument list [${functionItem.getArgumentTypes().join(', ')}].`);
					}

					if (transformedArguments.indexOf(null) >= 0) {
						return functionItem.applyArguments(transformedArguments);
					}

					return functionItem.value.apply(
						undefined,
						[dynamicContext, executionParameters, this._staticContext].concat(transformedArguments));
				});
			}
		});
	}
}

export default FunctionCall;
