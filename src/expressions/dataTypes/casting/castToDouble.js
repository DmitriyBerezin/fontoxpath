import castToFloatLikeType from './castToFloatLikeType';
import createAtomicValue from '../createAtomicValue';

import AtomicValueDataType from './AtomicValueDataType';
import AtomicValue from '../AtomicValue';

/**
 * @param  {function(string):boolean}  instanceOf
 * @return {function (!AtomicValueDataType) : ({successful: boolean, value: !AtomicValue}|{successful: boolean, error: !Error})}
 */
export default function castToDouble (instanceOf) {
	/**
	 * @type {function (!AtomicValueDataType) : ({successful: boolean, value: !AtomicValue}|{successful: boolean, error: !Error})}
	 */
	const caster = castToFloatLikeType(instanceOf, 'xs:double');
	return value => {
		const castResult = caster(value);
		if (!castResult.successful) {
			return castResult;
		}
		return {
			successful: true,
			value: createAtomicValue(castResult.value, 'xs:double')
		};
	};
}
