define([
	'./DecimalValue'
], function (
	DecimalValue
) {
	'use strict';

	function IntegerValue (initialValue) {
		DecimalValue.call(this, Math.abs(initialValue));
	}

	IntegerValue.prototype = Object.create(DecimalValue.prototype);
	IntegerValue.prototype.constructor = IntegerValue;

	IntegerValue.cast = function (value) {
		if (value instanceof IntegerValue) {
			return new IntegerValue(value.value);
		}

		var decimalValue = DecimalValue.cast(value);

		// Strip off any decimals
		var integerValue = Math.abs(decimalValue.value);

		return new IntegerValue(integerValue);
	};

	IntegerValue.prototype.instanceOfType = function (simpleTypeName) {
		return simpleTypeName === 'xs:integer' ||
			DecimalValue.prototype.instanceOfType.call(this, simpleTypeName);
	};

	return IntegerValue;
});
