
const PopupWindow = new class {
    /**
     * Shows popup window
     * 
     * @param {*} targetWindowId - id of target element to show
     */
    show(targetWindowID) {
        // Select window
        const targetWindow = document.getElementById(targetWindowID);

        // Check if it exists
        if (!targetWindow) {
            console.error("Target window does not exist.")
            return;
        };

        // Change its display style to visible
        targetWindow.style.display = "flex";
    };

    /**
     * Hide popup window
     * 
     * @param {*} targetWindowId - id of target element to hide 
     */
    hide(targetWindowID) {
        // Select window
        const targetWindow = document.getElementById(targetWindowID);

        // Check if it exists
        if (!targetWindow) {
            console.error("Target window does not exist.")
            return;
        };

        // Change its display style to none
        targetWindow.style.display = "none";
    };
};