
export { jsonify }

import { toPaddedString , quote } from './Quote'

// A set of types used to distinguish objects from primitives.
var objectTypes = {
    "function": true,
    "object": true
};



// Convenience aliases.
var objectProto = Object.prototype,
    getClass = objectProto.toString,
    undefined;

// Internal: Contains `try...catch` logic used by other functions.
// This prevents other functions from being deoptimized.
function attempt(func, errorFunc) {
try {
    func();
} catch (exception) {
    if (errorFunc) {
    errorFunc();
    }
}
}

var functionClass = "[object Function]",
    numberClass = "[object Number]",
    stringClass = "[object String]",
    arrayClass = "[object Array]",
    booleanClass = "[object Boolean]";

function forOwn ( object , callback ){

    const isFunction = typeof object === 'function'

    let property, isConstructor;
    
    for ( property in object ) 
        if( 
        
            ! ( isFunction && property == 'prototype' ) && 
            Object.hasOwn(object,property) && 
            ! ( isConstructor = property === 'constructor' )
        
        ) callback(property);
    
    // Manually invoke the callback for the `constructor` property due to
    // cross-environment inconsistencies.
    
    if( isConstructor || Object.hasOwn(object,(property = 'constructor')) )
       callback(property);
}


// Internal: Recursively serializes an object. Implements the
// `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.

function serialize ( args ){

    let { property, object, callback, properties, whitespace, indentation, stack } = args

    var value, type, className, results, element, index, length, prefix, result;

    attempt(function () {
        // Necessary for host object support.
        value = object[property];
    });

    if( typeof value == 'object' && value ){

        if( value instanceof Date )
            value = value.toISOString()
        else
        if( typeof value.toJSON == 'function' )
            value = value.toJSON(property)
    }

    if (callback) {
    // If a replacement function was provided, call it to obtain the value
    // for serialization.
    value = callback.call(object, property, value);
    }
    // Exit early if value is `undefined` or `null`.
    if (value == undefined) {
    return value === undefined ? value : "null";
    }
    type = typeof value;
    // Only call `getClass` if the value is an object.
    if (type == "object") {
    className = getClass.call(value);
    }
    switch (className || type) {
    case "boolean":
    case booleanClass:
        // Booleans are represented literally.
        return "" + value;
    case "number":
    case numberClass:
        // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
        // `"null"`.
        return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
    case "string":
    case stringClass:
        // Strings are double-quoted and escaped.
        return quote("" + value);
    }
    // Recursively serialize objects and arrays.
    if (typeof value == "object") {
    // Check for cyclic structures. This is a linear search; performance
    // is inversely proportional to the number of unique nested objects.
    for (length = stack.length; length--;) {
        if (stack[length] === value) {
        // Cyclic structures cannot be serialized by `JSON.stringify`.
        throw TypeError();
        }
    }
    // Add the object to the stack of traversed objects.
    stack.push(value);
    results = [];
    // Save the current indentation level and indent one additional level.
    prefix = indentation;
    indentation += whitespace;

    if (className == arrayClass) {
        // Recursively serialize array elements.
        for (index = 0, length = value.length; index < length; index++) {
        element = serialize({
            property : index ,
            object : value ,
            callback , 
            properties , 
            whitespace , 
            indentation , 
            stack
        })

        results.push(element === undefined ? "null" : element);
    }
        result = results.length ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
    } else {

        // Recursively serialize object members. Members are selected from
        // either a user-specified list of property names, or the object
        // itself.

        forOwn(properties || value, function (property) {

            const element = serialize({
                property, 
                object : value , 
                callback, 
                properties, 
                whitespace, 
                indentation, 
                stack 
            })

            if( element === undefined )
                return
            
            // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
            // is not the empty string, let `member` {quote(property) + ":"}
            // be the concatenation of `member` and the `space` character."
            // The "`space` character" refers to the literal space
            // character, not the `space` {width} argument provided to
            // `JSON.stringify`.

            results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
        })

        result = results.length ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
    }
    // Remove the object from the traversed object stack.
    stack.pop();
    return result;
    }
};


function jsonify (source, filter, width) {

    var whitespace, callback, properties, className;
    
    if (objectTypes[typeof filter] && filter) {
        
        className = getClass.call(filter);

        if (className == functionClass) {
            callback = filter;
        } else
        if (className == arrayClass) {
            
            // Convert the property names array into a makeshift set.
            properties = {};
            
            for (var index = 0, length = filter.length, value; index < length;) {
                
                value = filter[index++];
                className = getClass.call(value);
                
                if (className == "[object String]" || className == "[object Number]") {
                    properties[value] = 1;
                }
            }
        }
    }

    if (width)
        whitespace = ''.padStart(width)

    // Opera <= 7.54u2 discards the values associated with empty string keys
    // (`""`) only if they are used directly within an object member list
    // (e.g., `!("" in { "": 1})`).

    return serialize({
        property : '' ,
        object : (value = {}, value[""] = source, value) , 
        callback , 
        properties , 
        whitespace , 
        indentation : '' ,
        stack : []
    })
};

