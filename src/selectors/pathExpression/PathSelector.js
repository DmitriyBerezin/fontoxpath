define([
	'fontoxml-dom-identification/getNodeId',
	'../Selector',
	'../Specificity',
	'../dataTypes/Sequence',
	'../dataTypes/sortNodeValues',
	'../dataTypes/NodeValue'
], function (
	getNodeId,
	Selector,
	Specificity,
	Sequence,
	sortNodeValues,
	NodeValue
) {
	'use strict';

	/**
	 * @param  {Selector[]}  stepSelectors
	 */
	function PathSelector (stepSelectors) {
		Selector.call(
			this,
			stepSelectors.reduce(function (specificity, selector) {
				// Implicit AND, so sum
				return specificity.add(selector.specificity);
			}, new Specificity({})),
			Selector.RESULT_ORDER_SORTED);

		this._stepSelectors = stepSelectors;
	}

	PathSelector.prototype = Object.create(Selector.prototype);
	PathSelector.prototype.constructor = PathSelector;

	/**
	 * @param  {Node}       node
	 * @param  {Blueprint}  blueprint
	 */
	PathSelector.prototype.matches = function (node, blueprint) {
		// TODO: optimize by doing a depth first search instead of a full one
		// On the other hand, rewrite it using predicates, you lazy son of a hamster
		var intermediateResults = [node],
			newResults = [];
		for (var i = 0, l = this._stepSelectors.length; i < l; ++i) {
			var selector = this._stepSelectors[i];

			for (var j = 0, k = intermediateResults.length; j < k; ++j) {
				Array.prototype.push.apply(newResults, selector.evaluate({
					contextItem: intermediateResults[j],
					domFacade: blueprint
				}));
			}

			if (!newResults.length) {
				return false;
			}
			intermediateResults = newResults;
			newResults = [];
		}

		return !!intermediateResults.length;
	};

	PathSelector.prototype.equals = function (otherSelector) {
		return otherSelector instanceof PathSelector &&
			this._stepSelectors.length === otherSelector._stepSelectors.length &&
			this._stepSelectors.every(function (selector, i) {
				return otherSelector._stepSelectors[i].equals(selector);
			});
	};

	function sortResults (domFacade, result) {
		var resultContainsNodes = false,
			resultContainsNonNodes = false;
		result.forEach(function (resultValue) {
			if (resultValue instanceof NodeValue) {
				resultContainsNodes = true;
			} else {
				resultContainsNonNodes = true;
			}
		});
		if (resultContainsNonNodes && resultContainsNodes) {
			throw new Error('XPTY0018: The path operator should either return nodes or non-nodes. Mixed sequences are not allowed.');
		}

		if (resultContainsNodes) {
			return sortNodeValues(domFacade, result);
		}
		return result;
	}

	PathSelector.prototype.evaluate = function (dynamicContext) {
		var nodeSequence = dynamicContext.contextItem;

		var result = this._stepSelectors.reduce(function (intermediateResultNodes, selector) {
				// All but the last step should return nodes. The last step may return whatever, as long as it is not mixed
				intermediateResultNodes.forEach(function (intermediateResultNode) {
					if (!(intermediateResultNode instanceof NodeValue)) {
						throw new Error('XPTY0019: The / operator can only be applied to xml/json nodes.');
					}
				});

				var resultValues = [];
				var hasResultValuesByNodeId = Object.create(null);
				intermediateResultNodes.forEach(function (nodeValue) {
					var newResults = selector.evaluate(dynamicContext.createScopedContext({
							contextItem: Sequence.singleton(nodeValue),
							contextSequence: null
						}));

					if (newResults.isEmpty()) {
						return;
					}

					var sortedResultNodes;
					if (selector.expectedResultOrder === Selector.RESULT_ORDER_REVERSE_SORTED) {
						sortedResultNodes = newResults.value.reverse();
					} else {
						sortedResultNodes = newResults.value;
					}

					sortedResultNodes.forEach(function (newResult) {
						if (newResult instanceof NodeValue) {
							if (hasResultValuesByNodeId[newResult.nodeId]) {
								return;
							}
							// Because the intermediateResults are ordered, and these results are ordered too, we should be able to dedupe and concat these results
							hasResultValuesByNodeId[newResult.nodeId] = true;
						}
						resultValues.push(newResult);
					});
				}, []);

				if (selector.expectedResultOrder === selector.RESULT_ORDER_UNSORTED) {
					// The result should be sorted before we can continue
					resultValues = sortResults(dynamicContext.domFacade, resultValues);
				}

				return resultValues;
			}, nodeSequence.value);

		return new Sequence(result);
	};


	return PathSelector;
});