
export { toPaddedString , quote }


// Internal: Converts `value` into a zero-padded string such that its
// length is at least equal to `width`. The `width` must be <= 6.

function toPaddedString ( width : number , value : any ){
    return String(value).padStart(width,'0')
}



//  Escapes Control Characters

const ControlChars = {
    92 : `\\\\` ,
    34 : `\\"` ,
    13 : `\\r` ,
    12 : `\\f` ,
    10 : `\\n` ,
    9 : `\\t` ,
    8 : `\\b`
}


// Internal: Double-quotes a string `value`, replacing all ASCII control
// characters (characters with code unit values between 0 and 31) with
// their escaped equivalents. This is an implementation of the
// `Quote(value)` operation defined in ES 5.1 section 15.12.3.

const unicodePrefix = `\\u00`

function escapeChar ( char : string ){

    const
        code = char.charCodeAt(0) ,
        escaped = ControlChars[ code ]

    if( escaped )
        return escaped

    const hex = code.toString(16)

    return unicodePrefix + toPaddedString(2,hex)
}


const reEscape = /[\x00-\x1f\x22\x5c]/g

function quote ( value : string ){

    reEscape.lastIndex = 0


    if( reEscape.test(value) )
        value = value.replace(reEscape, escapeChar)

    return `"${ value }"`
}
