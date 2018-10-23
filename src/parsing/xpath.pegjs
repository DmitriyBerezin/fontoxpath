{
function parseCodePoint (codePoint) {
    // TODO: Assert not in XPath mode
	if ((codePoint >= 0x1 && codePoint <= 0xD7FF) ||
		(codePoint >= 0xE000 && codePoint <= 0xFFFD) ||
		(codePoint >= 0x10000 && codePoint <= 0x10FFFF)) {
        return String.fromCodePoint(codePoint);
	}
	throw new Error(`XQST0090: The character reference ${codePoint} (${codePoint.toString(16)}) does not reference a valid codePoint.`);
}
}

// 1
Module
 = _ versionDecl:VersionDeclaration? _ module:(LibraryModule / MainModule) {return ["module", versionDecl, module]}

// TODO Implement
MainModule
 = "main" {return 'main'}

// 2
VersionDeclaration
 = "xquery" _ versionAndEncoding:( 
    ("encoding" S e:StringLiteral {return ["encoding", e]})
    / ("version" S version:StringLiteral encoding:(S "encoding" S e:StringLiteral {return e})? {return [["version", version], ["encoding", encoding]]})
) _ Separator {return ["versionDecl"].concat(versionAndEncoding)}

// 4
LibraryModule
 = moduleDecl:ModuleDecl _ prolog:Prolog {return ["libraryModule", moduleDecl, prolog]}

// 5
ModuleDecl
 = "module" S "namespace" S prefix:$NCName _ "=" _ uri:URILiteral _ Separator {return ["moduleDecl", ["prefix", prefix], ["uri", uri]]}

// 6
Prolog
 = moduleSettings:(prologPart:(DefaultNamespaceDecl / Setter / NamespaceDecl / Import) _ Separator _)*
   declarations:(prologPart:(ContextItemDecl / AnnotatedDecl / OptionDecl) _ Separator _ {return prologPart})* {return ["prolog"].concat(moduleSettings).concat(declarations)}

// 7
Separator = ";"

// 8
Setter
 = BoundarySpaceDecl / DefaultCollationDecl / BaseURIDecl / ConstructionDecl / OrderingModeDecl / EmptyOrderDecl / CopyNamespacesDecl / DecimalFormatDecl

// 9
BoundarySpaceDecl = "declare" S "boundary-space" S value:("preserve" / "strip") {return ['boundarySpaceDecl', value]}

// 10
DefaultCollationDecl = "declare" S "default" "collation" value:URILiteral {return ['defaultCollationDecl', value]}

// 11
BaseURIDecl = "declare" S "base-uri" S value:URILiteral {return {type: 'baseURIDecl'}}

// 12
ConstructionDecl = "declare" S "construction" S ("strip" / "preserve") {return {type: 'constructionDecl'}}

// 13
OrderingModeDecl
 = "declare" S "ordering" S ("ordered" / "unordered") {return {type: 'orderingModeDecl'}}

// 14
EmptyOrderDecl
 = "declare" S "default" S "order" S "empty" S ("greatest" / "least") {return {type: 'emptyOrderDecl'}}

// 15
CopyNamespacesDecl
 = "declare" S "copy-namespaces" S PreserveMode _ "," _ InheritMode {return {type: 'copyNamespacesDecl'}}

// 16
PreserveMode
 = "preserve" / "no-preserve"

// 17
InheritMode
 = "inherit" / "no-inherit"

// 18
DecimalFormatDecl
 = "declare" S (("decimal-format" S EQName) / ("default" S "decimal-format")) (DFPropertyName S "=" S StringLiteral)* {return {type: 'decimalFormatDecl'}}

// 19
DFPropertyName
 = "decimal-separator" / "grouping-separator" / "infinity" / "minus-sign" / "NaN" / "percent" / "per-mille" / "zero-digit" / "digit" / "pattern-separator" / "exponent-separator"

// 20
Import = SchemaImport / ModuleImport

// 21
SchemaImport
 = "import" S "schema" (S SchemaPrefix)? S URILiteral ( S "at" S URILiteral ( S ","  S URILiteral)*)? {return {type: 'schemaImportl'}}

// 22
SchemaPrefix
 = ("namespace" S NCName S "=") / ("default" S "element" S "namespace")

// 23
ModuleImport
 = "import" S "module"
   prefix:(S "namespace" S prefix:$NCName _ "=" {return ["moduleImport", ["targetNamespace"]]})?
   _ uri:URILiteral (S "at" URILiteral (_ "," _ URILiteral)*)? {return ["moduleImport", ["namespacePrefix", prefix], ["targetNamespace", uri]]}

// 24
NamespaceDecl
 = "declare" S "namespace" S prefix:NCName _ "=" _ uri:URILiteral {return {type: 'namespaceDecl', prefix: prefix, namespaceURI: uri[1]}}

// 25
DefaultNamespaceDecl
 = "declare" S "default" S elementOrFunction:("element" / "function") S "namespace" S uri:URILiteral {return {type: 'defaultNamespaceDecl', elementOrFunction: elementOrFunction, namespaceURI: uri[1]}}

// 26
AnnotatedDecl
 = "declare" S annotations:(a:Annotation S {return a})* decl:(VarDecl / FunctionDecl) { return Object.assign(decl, {annotations: annotations})}

// 27
Annotation
 = "%" _ annotation:EQName params:(_ "(" _ lhs:$Literal rhs:(_ "," _ part:$Literal {return part})* _")")? { return [annotation, params]}

// 28
VarDecl
 = "variable" S "$" _ name:VarName varType:(_ t:TypeDeclaration {return type})? value:((_ ":=" _ v:VarValue {return {type: 'internal', value: v}}) / (S "external" defaultValue:(_ ":=" _ v:VarDefaultValue {return v})? {return {type: 'external', defaultValue: defaultValue || null}})) {return {type: 'varDecl', name: name, varType: varType, value: value}}

// 29
VarValue
 = ExprSingle

// 30
VarDefaultValue
 = ExprSingle

// 31
ContextItemDecl
 = "declare" S "context" S "item" (S "as" ItemType)? ((_ ":=" _ VarValue) / (S "external" (_ ":=" _ VarDefaultValue)?)) {return {type: 'contextItemDecl'}}

// 32 TODO: Implement
FunctionDecl
 = "function"

// 37
OptionDecl
 = "declare" S  "option" S EQName S StringLiteral {return {type: 'optionDecl'}}

// 40 TODO, fix proper
ExprSingle = "abc"
// 112
EQName = uri:URIQualifiedName {return [{prefix: null, uri: uriQName[0]}, uriQName[1]]}
 / name:QName {return [{prefix: name[0], uri: null}, name[1]]}

// 129
Literal
 = NumericLiteral / StringLiteral

// 130
// Note: changes because double accepts less than decimal, accepts less than integer
NumericLiteral = literal:(DoubleLiteral / DecimalLiteral / IntegerLiteral) ![a-zA-Z] {return literal}

// 132
VarName
 = EQName

// 183
TypeDeclaration
 = S "as" S st:$SequenceType {return st}

// 184
SequenceType
 = "empty-sequence()" {return ["empty-sequence()", "0"]}
 / type:ItemType occurence:(_ o:OccurenceIndicator {return o})? {return [type, occurence]}

// 185
OccurenceIndicator = "?" / "*" / "+"

// 186
ItemType
 = KindTest
 / "item()" {return ["typeTest", [null, null, "item()"]]}
 / FunctionTest
 / MapTest
 / ArrayTest
 / AtomicOrUnionType
 / ParenthesizedItemType

// 187
AtomicOrUnionType = typeName:EQName {return ["typeTest", typeName]}

// 188
KindTest
 = DocumentTest
 / ElementTest
 / AttributeTest
 / SchemaElementTest {return "unsupported"}
 / SchemaAttributeTest {return "unsupported"}
 / PITest
 / CommentTest
 / TextTest
 / NamespaceNodeTest {return "unsupported"}
 / AnyKindTest

// 189
AnyKindTest
 = "node()" {return ["kindTest", "node()"]}

// 190
DocumentTest
 = "document-node(" _ innerTest:(ElementTest / SchemaElementTest)? _ ")" {return ["kindTest", "document-node()", innerTest]}
 / "document-node()" {return ["kindTest", "document-node()"]}

// 191
TextTest
 = "text()" {return ["kindTest", "text()"]}

// 192
CommentTest
 = "comment()" {return ["kindTest", "comment()"]}

// 193
NamespaceNodeTest
 = "namespace-node()" {return ["kindTest", "namespace-node()"]}

// 194
// Let's keep it simple: only accept NCNames, optionally quoted, since quoted non-ncnames should throw a typeError later anyway
PITest
 = "processing-instruction(" _ target:NCName _ ")" {return ["kindTest", "processing-instruction()", target]}
 / "processing-instruction(" _ literal:StringLiteral _ ")" {return ["kindTest", "processing-instruction()", literal[1]]}
 / "processing-instruction()" {return ["kindTest", "processing-instruction()"]}

// 195
AttributeTest
 = "attribute(" _ name:AttribNameOrWildCard _ "," _ type:TypeName _ ")" {return ["kindTest", "attribute()", name, type]}
 / "attribute(" _ name:AttribNameOrWildCard _ ")" {return ["kindTest", "attribute()", name]}
 / "attribute()" {return ["kindTest", "attribute()"]}

// 196
AttribNameOrWildCard = AttributeName / ("*" {return ["*", null, "*"]})

// 197
SchemaAttributeTest
 = "schema-attribute(" _ decl:AttributeDeclaration _ ")" {return ["kindTest", "schema-attribute()", decl]}

// 198
AttributeDeclaration = AttributeName

// 199
ElementTest
 = "element" _ "(" _ name:ElementNameOrWildCard _ "," _ type:TypeName _ ")" {return ["kindTest", "element()", name, type]}
 / "element" _ "(" _ name:ElementNameOrWildCard _ ")" {return ["kindTest", "element()", name]}
 / "element" _ "(" _ ")" {return ["kindTest", "element()"]}

// 200
ElementNameOrWildCard = ElementName / ("*" {return ["*", null, "*"]})

// 201
SchemaElementTest = "schema-element(" ElementDeclaration ")"

// 202
ElementDeclaration = ElementName

// 203
AttributeName = EQName

// 204
ElementName = EQName

// 205
SimpleTypeName = TypeName

// 206
TypeName = EQName

// 207
FunctionTest = AnyFunctionTest / TypedFunctionTest

// 208
AnyFunctionTest = "function" _ "(" _ "*" _ ")" {return ["anyFunctionTest"]}

// 209
TypedFunctionTest
 = "function" _ "(" _ types:(first:SequenceType rest:("," _ t:SequenceType {return t})* {return appendRest(first, rest)})? _ ")" S "as" S SequenceType {return ["functionTest", types]}

// 210
MapTest = AnyMapTest / TypedMapTest

// 211
AnyMapTest = "map" _ "(" _ "*" _ ")" {return ["typeTest", [null, null, "map(*)"]]}

// 212
TypedMapTest = "map" _ "(" _ keyType:AtomicOrUnionType _ "," _ valueType:SequenceType _ ")" {return ["typedMapTest", keyType, valueType]}

// 213
ArrayTest = AnyArrayTest / TypedArrayTest

// 214
AnyArrayTest = "array" _ "(" _ "*" _ ")" {return ["anyArrayTest"]}

// 215
TypedArrayTest = "array" _ "(" _ type:SequenceType _ ")" {return ["typedArrayTest", type]}

// 216
ParenthesizedItemType = "(" _ type:ItemType _ ")" {return type}

// 217
URILiteral = StringLiteral

// 219
IntegerLiteral = digits:Digits {return ["integerConstantExpr", digits]}

// 220
DecimalLiteral
 = "." digits:Digits {return ["decimalConstantExpr", parseFloat("." + digits)]}
 / decimal:$(Digits "." Digits?) {return ["decimalConstantExpr", parseFloat(decimal)]}

// 221
DoubleLiteral
 = double:$((("." Digits) / (Digits ("." [0-9]*)?)) [eE] [+-]? Digits) {return ["doubleConstantExpr", parseFloat(double)]}

// 222
StringLiteral
 = ('"' lit:(PredefinedEntityRef / CharRef / EscapeQuot / [^"&])* '"' {return lit.join('')})
 / ("'" lit:(PredefinedEntityRef / CharRef / EscapeApos / [^'&])* "'" {return lit.join('')})

// 223
URIQualifiedName = uri:BracedURILiteral localName:NCName {return [uri, localName]}

// 224
BracedURILiteral = "Q" _ "{" uri:[^{}]* "}" {return uri.join('').trim()}

// 225 TODO: Not in XPath mode
PredefinedEntityRef
 = "&" c:(
    "lt" {return "<"}
    / "gt" {return ">"}
    / "amp" {return "&"}
    / "quot" {return "&"}
    / "apos" {return "\'"}) ";" {return c}

// 226
EscapeQuot
 = "\"\"" {return "\""}

// 227
EscapeApos
 = "''" {return "'"}

// 231
Comment
 = "(:" (CommentContents / Comment)* ":)"

// 233
CharRef
 = ("&#x" codePoint:([0-9a-fA-F]+) ";") {return parseCodePoint(parseInt(charref, 16))}
 / ("&#" codePoint:([0-9]+) ";") {return parseCodePoint(parseInt(charref, 10))}

// 234 Note: https://www.w3.org/TR/REC-xml-names/#NT-QName
QName = PrefixedName / UnprefixedName

// 235 Note: https://www.w3.org/TR/REC-xml-names/#NT-NCName
NCName = start:NCNameStartChar rest:(NCNameChar*) {return start + rest.join("")}

// 237 Note: https://www.w3.org/TR/REC-xml/#NT-Char
Char = [\t\n\r -\uD7FF\uE000\uFFFD] / [\uD800-\uDBFF][\uDC00-\uDFFF] /* any Unicode character, excluding the surrogate blocks, FFFE, and FFFF. */

// 238
Digits
 = digits:[0-9]+ {return parseInt(digits.join(""), 10)}

// 239
CommentContents
 = !"(:" !":)" Char

// Whitespace Note: https://www.w3.org/TR/REC-xml/#NT-S
_
 = WhitespaceCharacter*

S
 = WhitespaceCharacter+

ExplicitWhitespace
 = ("\u0020" / "\u0009" / "\u000D" / "\u000A")+

WhitespaceCharacter
 = "\u0020" / "\u0009" / "\u000D" / "\u000A"
 / Comment // Note: comments can occur anywhere where whitespace is allowed: https://www.w3.org/TR/xpath-3/#DefaultWhitespaceHandling

// XML Types
PrefixedName = prefix:Prefix ":" local:LocalPart {return [prefix, local]}

UnprefixedName = local:LocalPart {return ['', local]}

LocalPart = NCName

Prefix = NCName

NCNameStartChar = [A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD] / [\uD800-\uDB7F][\uDC00-\uDFFF]

NCNameChar = NCNameStartChar / [\-\.0-9\xB7\u0300-\u036F\u203F\u2040]

NameChar = NCNameChar / ":"

NameStartChar = NCNameStartChar / ":"

Name = $(NameStartChar (NameChar)*)
