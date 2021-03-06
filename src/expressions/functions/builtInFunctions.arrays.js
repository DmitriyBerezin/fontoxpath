import arrayGet from './builtInFunctions.arrays.get';
import isSubtypeOf from '../dataTypes/isSubtypeOf';
import Sequence from '../dataTypes/Sequence';
import createAtomicValue from '../dataTypes/createAtomicValue';
import ArrayValue from '../dataTypes/ArrayValue';
import zipSingleton from '../util/zipSingleton';
import concatSequences from '../util/concatSequences';
import { DONE_TOKEN, ready } from '../util/iterators';

import { ARRAY_NAMESPACE_URI } from '../staticallyKnownNamespaces';
import FunctionDefinitionType from './FunctionDefinitionType';

/**
 * @type {!FunctionDefinitionType}
 */
function arraySize (_dynamicContext, _executionParameters, _staticContext, arraySequence) {
	return zipSingleton(
		[arraySequence],
		([array]) => Sequence.singleton(createAtomicValue(/** @type {!ArrayValue} */ (array).members.length, 'xs:integer')));
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayPut (_dynamicContext, _executionParameters, _staticContext, arraySequence, positionSequence, itemSequence) {
	return zipSingleton(
		[positionSequence, arraySequence],
		([position, array]) => {
			const positionValue = position.value;
			if (positionValue <= 0 || positionValue > /** @type {!ArrayValue} */ (array).members.length) {
				throw new Error('FOAY0001: array position out of bounds.');
			}
				const newMembers = /** @type {!ArrayValue} */ (array).members.concat();
			newMembers.splice(positionValue - 1, 1, itemSequence);
			return Sequence.singleton(new ArrayValue(newMembers));
		});
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayAppend (_dynamicContext, _executionParameters, _staticContext, arraySequence, itemSequence) {
	return zipSingleton(
		[arraySequence],
		([array]) => {
			const newMembers = /** @type {!ArrayValue} */ (array).members.concat([itemSequence]);
			return Sequence.singleton(new ArrayValue(newMembers));
		});
}

/**
 * @type {!FunctionDefinitionType}
 */
function arraySubarray (_dynamicContext, _executionParameters, _staticContext, arraySequence, startSequence, lengthSequence) {
	return zipSingleton(
		[arraySequence, startSequence, lengthSequence],
		([array, start, length]) => {
			const startValue = start.value;
			const lengthValue = length.value;

			if (startValue > /** @type {!ArrayValue} */ (array).members.length || startValue <= 0) {
				throw new Error('FOAY0001: subarray start out of bounds.');
			}

			if (lengthValue < 0) {
				throw new Error('FOAY0002: subarray length out of bounds.');
			}

			if (startValue + lengthValue > /** @type {!ArrayValue} */ (array).members.length + 1) {
				throw new Error('FOAY0001: subarray start + length out of bounds.');
			}

					const newMembers = /** @type {!ArrayValue} */ (array).members.slice(startValue - 1, lengthValue + startValue - 1);
			return Sequence.singleton(new ArrayValue(newMembers));
		});
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayRemove (_dynamicContext, _executionParameters, _staticContext, arraySequence, positionSequence) {
	return zipSingleton(
		[arraySequence],
		([array]) => positionSequence.mapAll(allIndices => {
			const indicesToRemove = allIndices.map(value => value.value)
			// Sort them in reverse order, to keep them stable
				.sort((a, b) => b - a)
				.filter((item, i, all) => all[i - 1] !== item);

			const newMembers = /** @type {!ArrayValue} */ (array).members.concat();
			for (let i = 0, l = indicesToRemove.length; i < l; ++i) {
				const position = indicesToRemove[i];
				if (position > /** @type {!ArrayValue} */ (array).members.length || position <= 0) {
					throw new Error('FOAY0001: subarray position out of bounds.');
				}
				newMembers.splice(position - 1, 1);
			}

			return Sequence.singleton(new ArrayValue(newMembers));
		})
	);
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayInsertBefore (_dynamicContext, _executionParameters, _staticContext, arraySequence, positionSequence, itemSequence) {
	return zipSingleton(
		[arraySequence, positionSequence],
		([array, position]) => {
			const positionValue = position.value;

			if (positionValue > /** @type {!ArrayValue} */ (array).members.length + 1 || positionValue <= 0) {
				throw new Error('FOAY0001: subarray position out of bounds.');
			}

			const newMembers = /** @type {!ArrayValue} */ (array).members.concat();
			newMembers.splice(positionValue - 1, 0, itemSequence);
			return Sequence.singleton(new ArrayValue(newMembers));
		});
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayReverse (_dynamicContext, _executionParameters, _staticContext, arraySequence) {
	return zipSingleton(
		[arraySequence],
		([array]) => Sequence.singleton(new ArrayValue(/** @type {!ArrayValue} */ (array).members.concat().reverse())));
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayJoin (_dynamicContext, _executionParameters, _staticContext, arraySequence) {
	return arraySequence.mapAll(allArrays => {
		const newMembers = allArrays.reduce(
			(joinedMembers, array) => joinedMembers.concat(/** @type {!ArrayValue} */ (array).members),
			[]);
		return Sequence.singleton(new ArrayValue(newMembers));
	});
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayForEach (dynamicContext, executionParameters, staticContext, arraySequence, functionItemSequence) {
	return zipSingleton(
		[arraySequence, functionItemSequence],
		([array, functionItem]) => {
			const newMembers = /** @type {!ArrayValue} */ (array).members.map(function (member) {
				return functionItem.value.call(undefined, dynamicContext, executionParameters, staticContext, member);
			});
			return Sequence.singleton(new ArrayValue(newMembers));
		});
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayFilter (dynamicContext, executionParameters, staticContext, arraySequence, functionItemSequence) {
	return zipSingleton(
		[arraySequence, functionItemSequence],
		([array, functionItem]) => {
			/**
			 * @type {!Array<!Sequence>}
			 */
			const filterResultSequences = /** @type {!ArrayValue} */ (array).members.map(member => functionItem.value.call(
				undefined,
				dynamicContext,
				executionParameters,
				staticContext,
				member));
			const effectiveBooleanValues = [];
			let done = false;
			return new Sequence({
				next: () => {
					if (done) {
						return DONE_TOKEN;
					}
					let allReady = true;
					for (let i = 0, l = /** @type {!ArrayValue} */ (array).members.length; i < l; ++i) {
						if (effectiveBooleanValues[i] && effectiveBooleanValues[i].ready) {
							continue;
						}
						const filterResult = filterResultSequences[i];
						const ebv = filterResult.tryGetEffectiveBooleanValue();
						if (!ebv.ready) {
							allReady = false;
						}
						effectiveBooleanValues[i] = ebv;
					}
					if (!allReady) {
						return {
							done: false,
							ready: false,
							promise: Promise.all(effectiveBooleanValues.map(
								filterResult => filterResult.ready ? Promise.resolve() : filterResult.promise))
						};
					}
					const newMembers = /** @type {!ArrayValue} */ (array).members.filter((_, i) => effectiveBooleanValues[i].value);
					done = true;
					return ready(new ArrayValue(newMembers));
				}
			});
		});
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayFoldLeft (dynamicContext, executionParameters, staticContext, arraySequence, startSequence, functionItemSequence) {
	return zipSingleton(
		[arraySequence, functionItemSequence],
		([array, functionItem]) => /** @type {!ArrayValue} */ (array).members.reduce(
			(accum, member) => functionItem.value.call(undefined, dynamicContext, executionParameters, staticContext, accum, member),
			startSequence));
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayFoldRight (dynamicContext, executionParameters, staticContext, arraySequence, startSequence, functionItemSequence) {
	return zipSingleton(
		[arraySequence, functionItemSequence],
		([array, functionItem]) => /** @type {!ArrayValue} */ (array).members.reduceRight(
			(accum, member) => functionItem.value.call(undefined, dynamicContext, executionParameters, staticContext, accum, member),
			startSequence));
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayForEachPair (dynamicContext, executionParameters, staticContext, arraySequenceA, arraySequenceB, functionItemSequence) {
	return zipSingleton(
		[arraySequenceA, arraySequenceB, functionItemSequence],
		([arrayA, arrayB, functionItem]) => {
			const newMembers = [];
			for (let i = 0, l = Math.min(
				/** @type {!ArrayValue} */ (arrayA).members.length,
				/** @type {!ArrayValue} */ (arrayB).members.length); i < l; ++i) {
				newMembers[i] = functionItem.value.call(
					undefined,
					dynamicContext,
					executionParameters,
					staticContext,
					/** @type {!ArrayValue} */ (arrayA).members[i],
					/** @type {!ArrayValue} */ (arrayB).members[i]);
			}

			return Sequence.singleton(new ArrayValue(newMembers));
		});
}

/**
 * @type {!FunctionDefinitionType}
 */
function arraySort (_dynamicContext, executionParameters, _staticContext, arraySequence) {
	return zipSingleton(
		[arraySequence],
		([array]) => {
			const atomizedMembers = /** @type {!ArrayValue} */ (array).members
				.map(member => member.atomize(executionParameters));

			return zipSingleton(
				atomizedMembers,
				atomizedItems => {
					const permutations = /** @type {!ArrayValue} */ (array).members
						.map((_, i) => i)
						.sort((indexA, indexB) => atomizedItems[indexA].value > atomizedItems[indexB].value ? 1 : -1);
					return Sequence.singleton(
						new ArrayValue(permutations.map(i => /** @type {!ArrayValue} */ (array).members[i]))
					);
				});
		});
}

/**
 * @type {!FunctionDefinitionType}
 */
function arrayFlatten (__dynamicContext, _executionParameters, _staticContext, itemSequence) {
	return itemSequence.mapAll(items => items.reduce(function flattenItem (flattenedItems, item) {
		if (isSubtypeOf(item.type, 'array(*)')) {
			return /** @type {ArrayValue} */ (item).members.reduce(
				(flattenedItemsOfMember, member) => member.mapAll(
					allValues => allValues.reduce(flattenItem, flattenedItemsOfMember)),
				flattenedItems);
		}
		return concatSequences([flattenedItems, Sequence.singleton(item)]);
	}, Sequence.empty()));
}

export default {
	declarations: [
		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'size',
			argumentTypes: ['array(*)'],
			returnType: 'xs:integer',
			callFunction: arraySize
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'get',
			argumentTypes: ['array(*)', 'xs:integer'],
			returnType: 'item()*',
			callFunction: arrayGet
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'put',
			argumentTypes: ['array(*)', 'xs:integer', 'item()*'],
			returnType: 'array(*)',
			callFunction: arrayPut
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'append',
			argumentTypes: ['array(*)', 'item()*'],
			returnType: 'array(*)',
			callFunction: arrayAppend
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'subarray',
			argumentTypes: ['array(*)', 'xs:integer', 'xs:integer'],
			returnType: 'array(*)',
			callFunction: arraySubarray
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'subarray',
			argumentTypes: ['array(*)', 'xs:integer'],
			returnType: 'array(*)',
			callFunction: function (dynamicContext, executionParameters, staticContext, arraySequence, startSequence) {
				const lengthSequence = Sequence.singleton(createAtomicValue(
					arraySequence.first().members.length - startSequence.first().value + 1,
					'xs:integer'));
				return arraySubarray(
					dynamicContext,
					executionParameters,
					staticContext,
					arraySequence,
					startSequence,
					lengthSequence);
			}
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'remove',
			argumentTypes: ['array(*)', 'xs:integer*'],
			returnType: 'array(*)',
			callFunction: arrayRemove
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'insert-before',
			argumentTypes: ['array(*)', 'xs:integer', 'item()*'],
			returnType: 'array(*)',
			callFunction: arrayInsertBefore
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'head',
			argumentTypes: ['array(*)'],
			returnType: 'item()*',
			callFunction: function (dynamicContext, executionParameters, _staticContext, arraySequence) {
				return arrayGet(dynamicContext, executionParameters, _staticContext, arraySequence, Sequence.singleton(createAtomicValue(1, 'xs:integer')));
			}
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'tail',
			argumentTypes: ['array(*)'],
			returnType: 'item()*',
			callFunction: function (dynamicContext, executionParameters, _staticContext, arraySequence) {
				return arrayRemove(dynamicContext, executionParameters, _staticContext, arraySequence, Sequence.singleton(createAtomicValue(1, 'xs:integer')));
			}
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'reverse',
			argumentTypes: ['array(*)'],
			returnType: 'array(*)',
			callFunction: arrayReverse
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'join',
			argumentTypes: ['array(*)*'],
			returnType: 'array(*)',
			callFunction: arrayJoin
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'for-each',
			// TODO: reimplement type checking by parsing the types
			// argumentTypes: ['array(*)', 'function(item()*) as item()*)]
			argumentTypes: ['array(*)', 'function(*)'],
			returnType: 'array(*)',
			callFunction: arrayForEach
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'filter',
			// TODO: reimplement type checking by parsing the types
			// argumentTypes: ['array(*)', 'function(item()*) as xs:boolean)]
			argumentTypes: ['array(*)', 'function(*)'],
			returnType: 'array(*)',
			callFunction: arrayFilter
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'fold-left',
			// TODO: reimplement type checking by parsing the types
			// argumentTypes: ['array(*)', 'item()*', 'function(item()*, item()*) as item())]
			argumentTypes: ['array(*)', 'item()*', 'function(*)'],
			returnType: 'item()*',
			callFunction: arrayFoldLeft
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'fold-right',
			// TODO: reimplement type checking by parsing the types
			// argumentTypes: ['array(*)', 'item()*', 'function(item()*, item()*) as item())]
			argumentTypes: ['array(*)', 'item()*', 'function(*)'],
			returnType: 'item()*',
			callFunction: arrayFoldRight
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'for-each-pair',
			// TODO: reimplement type checking by parsing the types
			// argumentTypes: ['array(*)', 'item()*', 'function(item()*, item()*) as item())]
			argumentTypes: ['array(*)', 'array(*)', 'function(*)'],
			returnType: 'array(*)',
			callFunction: arrayForEachPair
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'sort',
			argumentTypes: ['array(*)'],
			returnType: 'array(*)',
			callFunction: arraySort
		},

		{
			namespaceURI: ARRAY_NAMESPACE_URI,
			localName: 'flatten',
			argumentTypes: ['item()*'],
			returnType: 'item()*',
			callFunction: arrayFlatten
		}
	],
	functions: {
		append: arrayAppend,
		flatten: arrayFlatten,
		foldLeft: arrayFoldLeft,
		foldRight: arrayFoldRight,
		forEach: arrayForEach,
		forEachPair: arrayForEachPair,
		filter: arrayFilter,
		get: arrayGet,
		insertBefore: arrayInsertBefore,
		join: arrayJoin,
		put: arrayPut,
		remove: arrayRemove,
		reverse: arrayReverse,
		size: arraySize,
		sort: arraySort,
		subArray: arraySubarray
	}
};
