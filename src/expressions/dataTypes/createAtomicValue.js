import builtinDataTypesByName from './builtins/builtinDataTypesByName';

import AtomicValue from './AtomicValue';

/**
* @param    {*}  value
* @param    {string}  type
* @returns  {!AtomicValue<*>}
*/
export default function createAtomicValue (value, type) {
	if (!builtinDataTypesByName[type]) {
		throw new Error('Unknown type');
	}

	// if (type === 'xs:boolean' || type === 'xs:string' || type === 'xs:untypedAtomic' || type === 'xs:integer') {
	// 	let cache = valueCacheByValueByType[type];

	// 	if (!cache) {
	// 		cache = valueCacheByValueByType[type] = Object.create(null);
	// 	}
	// 	let existingValue = cache[value];
	// 	if (!existingValue) {
	// 		existingValue = { type: type, value: value };
	// 	}
	// 	return existingValue;
	// }
	return {
		type: type,
		value: value
	};
}

export const trueBoolean = createAtomicValue(true, 'xs:boolean');
export const falseBoolean = createAtomicValue(false, 'xs:boolean');
