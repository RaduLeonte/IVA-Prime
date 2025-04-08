/**
 * FileIO
 */
class ParsingError extends Error {
    constructor(name, description) {
        super(description);
        this.name = `Parsing error: ${name}`;
    };
};


/**
 * Primers
 */
/**
 * Error for when primer extension encounters an ambigous base (non-ACTG)
 */
class AmbiguousBaseError extends Error {
    constructor(seq) {
        super(`While extending the primers an ambigous base was encountered: ${seq}`);
        this.name = "Primer Design Failed: Ambiguous bases";
    };
};


/**
 * Error for when primer extension would go beyond bounds of a linear sequence
 */
class OutOfBasesError extends Error {
    constructor() {
        super("Cannot extend primer beyond the boundaries of a linear sequence.");
        this.name = "Primer Design Failed: Reached sequence bounds";
    };
};


/**
 * Error for when TBR region is no specific
 */
class TBRNotSpecificError extends Error {
    constructor(indices) {
        super("Multiple binding sites were found for the TBR of the primer sequence.");
        this.name = "Primer Design Failed: Template binding region is not specific";
        this.indices = indices;
    };
};


/**
 * Handle error by displaying it as an alert for the user
 * 
 * @param {Error} error - Caught error class to be handled
 */
function handleError(error) {
    Alerts.error(error.name, error.message);
};
