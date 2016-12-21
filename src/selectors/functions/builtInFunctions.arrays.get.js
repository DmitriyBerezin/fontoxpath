define([
], function (
) {
	'use strict';

	return function arrayGet (_dynamicContext, arraySequence, positionSequence) {
		var position = positionSequence.value[0].value,
			array = arraySequence.value[0];
		if (position <= 0 || position > array.members.length) {
			throw new Error('FOAY0001: array position out of bounds.');
		}
		return array.members[position - 1];
	};
});
