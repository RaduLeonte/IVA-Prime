class AmbiguousBaseError extends Error {
    constructor(seq) {
        super(`While extending the primers an ambigous base was encountered: ${seq}`);
        this.name = "Primer Design Failed: Ambiguous bases";
    };
};


class OutOfBasesError extends Error {
    constructor() {
        super("Cannot extend primer beyond the boundaries of a linear sequence.");
        this.name = "Primer Design Failed: Reached sequence bounds";
    }
};


function handleError(error) {
    Alerts.error(error.name, error.message);
};
