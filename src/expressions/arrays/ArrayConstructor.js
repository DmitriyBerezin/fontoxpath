import Expression from '../Expression';
import Specificity from '../Specificity';
import ArrayValue from '../dataTypes/ArrayValue';
import Sequence from '../dataTypes/Sequence';

/**
 * @extends {Expression}
 */
class ArrayConstructor extends Expression {
	/**
	 * @param   {string}           curlyness  Whether this constructor should use curly behaviour
	 *                                         Curly behaviour unfolds the single entry sequence, square constructor does not unfold
	 * @param   {!Array<!Expression>}  members    The expressions for the values
	 */
	constructor (curlyness, members) {
		super(
			new Specificity({
			[Specificity.EXTERNAL_KIND]: 1
			}),
			members,
			{
				canBeStaticallyEvaluated: members.every(member => member.canBeStaticallyEvaluated)
			});

		this._curlyness = curlyness;
		this._members = members;
	}

	evaluate (dynamicContext, executionParameters) {
		if (this._curlyness === 'curly') {
			return this._members[0].evaluateMaybeStatically(dynamicContext, executionParameters)
				.mapAll(allValues => Sequence.singleton(new ArrayValue(allValues.map(Sequence.singleton))));
		}

		return Sequence.singleton(
			new ArrayValue(this._members.map(entry => entry.evaluateMaybeStatically(dynamicContext, executionParameters))));
	}
}
export default ArrayConstructor;
