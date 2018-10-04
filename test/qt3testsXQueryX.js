import  {
	evaluateXPathToBoolean,
	evaluateXPathToString
} from 'fontoxpath';

import parser from 'fontoxpath/parsing/xPathParser.new';

import fs from 'fs';
import path from 'path';
import chai from 'chai';

import { sync, slimdom } from 'slimdom-sax-parser';

/**
 * Transform the given JsonML fragment into the corresponding DOM structure, using the given document to
 * create nodes.
 *
 * JsonML is always expected to be a JavaScript structure. If you have a string of JSON, use JSON.parse first.
 *
 * @param   {Document}  document  The document to use to create nodes
 * @param   {JsonML}    jsonml    The JsonML fragment to parse
 *
 * @return  {Node}      The root node of the constructed DOM fragment
 */
export function parseNode (document, jsonml) {
	if (typeof jsonml === 'string') {
		return document.createTextNode(jsonml);
	}

	if (!Array.isArray(jsonml)) {
		throw new TypeError('JsonML element should be an array or string');
	}

	var name = jsonml[0];

	// Node must be a normal element
	var element = document.createElementNS('http://www.w3.org/2005/XQueryX', 'xqx:' + name),
	firstChild = jsonml[1],
	firstChildIndex = 1;
	if ((typeof firstChild === 'object') && !Array.isArray(firstChild)) {
		for (var attributeName in firstChild) {
			if (firstChild[attributeName] !== null) {
				element.setAttributeNS('http://www.w3.org/2005/XQueryX', 'xqx:' + attributeName, firstChild[attributeName]);
			}
		}
		firstChildIndex = 2;
	}
	// Parse children
	for (var i = firstChildIndex, l = jsonml.length; i < l; ++i) {
		var node = parseNode(document, jsonml[i]);
		element.appendChild(node);
	}

	return element;
}



const baseDir = path.join('test', 'assets', 'QT3TS-master');

function tryGetXQuery (test) {
	let xQueryPath = path.join(baseDir, test.directory, test.testName);

	if (fs.existsSync(xQueryPath)) {
		// Should be a folder containing a '.xq' file
		if (!fs.lstatSync(xQueryPath).isDirectory()) {
			throw new Error('This is not expected.');
		}
		xQueryPath = path.join(xQueryPath, test.testCase) + '.xq';
		if (!fs.existsSync(xQueryPath)) {
			return null;
		}

		return fs.readFileSync(xQueryPath, 'utf-8');
	}

	xQueryPath = xQueryPath + '.xml';
	if (!fs.existsSync(xQueryPath)) {
		throw new Error('No xQuery test file found.');
	}

	const xml = sync(fs.readFileSync(xQueryPath, 'utf-8'));
	return evaluateXPathToString('//test-case[@name=$testCase]/test', xml, null, { testCase: test.testCase });
}

fs.readdirSync(path.join(baseDir, 'xqueryx')).forEach(directory => {
	const directoryPath = path.join(baseDir, 'xqueryx', directory);

	if (!fs.lstatSync(directoryPath).isDirectory()) {
		return;
	}

	fs.readdirSync(directoryPath).forEach(subDirectory => {
		const subDirectoryPath = path.join(directoryPath, subDirectory);
		if (!fs.lstatSync(subDirectoryPath).isDirectory()) {
			throw new Error('Only sub directories are expected.');
		}

		// Sub directories are the test name prefixed with "{parent directory}-"
		const testName = subDirectory.substring(directory.length + 1);
		describe(testName, () => {

			fs.readdirSync(subDirectoryPath).forEach(testCase => {
				const testCasePath = path.join(subDirectoryPath, testCase);
				if (fs.lstatSync(testCasePath).isDirectory()) {
					throw new Error('Test cases should be files.');
				}

				// Test case is the file name without extension
				testCase = testCase.substring(0, testCase.length - 4);

				it(testCase, function () {
					const xQuery = tryGetXQuery({ directory, testName, testCase });

					if (!xQuery) {
						this.skip();
					}

					let jsonMl;
					try {
						jsonMl = parser.parse(xQuery);
					}
					catch (err) {
						if (err.location) {
							const start = err.location.start.offset;
							chai.assert.fail('Parse error', 'No parse error', xQuery.substring(0, start) + '[HERE]' + xQuery.substring(start));
						}
						else {
							throw err;
						}
						this.skip();
					}

					const expected = sync(fs.readFileSync(testCasePath, 'utf-8'));
					const actual = new slimdom.Document();
					actual.appendChild(parseNode(actual, jsonMl));

					chai.assert(evaluateXPathToBoolean('deep-equal($expected, $actual)', null, null, { expected, actual }), `expected: "${expected.documentElement.outerHTML}" actual: "${actual.documentElement.outerHTML}"`);
				});
			});
		});
	});
});