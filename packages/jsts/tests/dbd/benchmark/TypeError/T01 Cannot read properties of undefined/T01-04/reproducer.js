const type = {
    type: 'FieldType',
};

validateType({}, type);

function canTypeBeValidated() {
    return true;
}

/**
 * Check if return tag type is void or undefined
 * Validate type for a given JSDoc node
 * @param {Object} jsdocNode JSDoc node
 * @param {Object} type JSDoc tag
 * @returns {void}
 * @private
 */
function validateType(jsdocNode, type) {
  if (!type || !canTypeBeValidated(type.type)) {
      return;
  }
  const typesToCheck = [];
  let elements = [];
  switch (type.type) {
      case "TypeApplication":  // {Array.<String>}
          elements = type.applications[0].type === "UnionType" ? type.applications[0].elements : type.applications;
          typesToCheck.push(getCurrentExpectedTypes(type));
          break;
      case "RecordType":  // {{20:String}}
          elements = type.fields;
          break;
      case "UnionType":  // {String|number|Test}
      case "ArrayType":  // {[String, number, Test]}
          elements = type.elements;
          break;
      case "FieldType":  // Array.<{count: number, votes: number}>
          typesToCheck.push(getCurrentExpectedTypes(type.value)); // Noncompliant
          break;
      default:
          typesToCheck.push(getCurrentExpectedTypes(type));
  }
  elements.forEach(validateType.bind(null, jsdocNode));
  typesToCheck.forEach(function(typeToCheck) {
      if (typeToCheck.expectedType &&
          typeToCheck.expectedType !== typeToCheck.currentType) {
          context.report({
              node: jsdocNode,
              message: "Use '{{expectedType}}' instead of '{{currentType}}'.",
              data: {
                  currentType: typeToCheck.currentType,
                  expectedType: typeToCheck.expectedType
              }
          });
      }
  });
}

/**
 * Extract the current and expected type based on the input type object
 * @param {Object} type JSDoc tag
 * @returns {Object} current and expected type object
 * @private
 */
function getCurrentExpectedTypes(type) {
  let currentType;
  if (type.name) { // Noncompliant: type can be undefined
      currentType = type.name;
  } else if (type.expression) {
      currentType = type.expression.name;
  }
  const expectedType = currentType && preferType[currentType];
  return {
      currentType,
      expectedType
  };
}
