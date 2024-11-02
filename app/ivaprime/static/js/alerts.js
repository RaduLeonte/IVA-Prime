const Alerts = new class {
    /**
     * 
     * @param {*} title 
     * @param {*} body 
     */
    warning(title, body) {
        this.showAlert(
            title,
            body,
            "warning",
            5
        );
    };


    /**
     * 
     * @param {*} title 
     * @param {*} body 
     */
    error(title, body) {
        this.showAlert(
            title,
            body,
            "error",
            -1
        );
    };


    /**
     * 
     * @param {*} title 
     * @param {*} body 
     * @param {*} type 
     * @param {*} duration 
     * @returns 
     */
    showAlert(title, body, type="warning", duration=5) {
        return;
    };
};