import Sequence from '../dataTypes/Sequence';
/**
 * @param  {!Array<!Sequence>}	argumentList
 */
export default function argumentListToString (argumentList) {
	return argumentList.map(function (argument) {
		if (argument === null) {
			return 'placeholder';
		}
		if (argument.isEmpty()) {
			return 'item()?';
		}

		if (argument.isSingleton()) {
			return argument.first().type || 'item()';
		}
		return argument.first().type + '+';
	}).join(', ');
}
