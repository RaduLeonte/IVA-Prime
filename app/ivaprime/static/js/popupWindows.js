
const PopupWindow = new class {
    /**
     * Shows popup window
     * 
     * @param {*} targetWindowId - id of target element to show
     */
    show(targetWindowID) {
        document.querySelector("div.modal").style.display = "block";
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
        document.querySelector("div.modal").style.display = "none";
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


function createModalWindow(id, title, inputLabel, inputValue, actionLabel, actionFunction, inputSuffix=null) {
    const modalWindow = document.createElement("div");
    modalWindow.id = id
    modalWindow.classList.add("popup-window")
    modalWindow.classList.add("modal-window");

    modalWindow.innerHTML = `
    <h2>${title}</h2>

    <div class="popup-window-vgroup">
        <label>${inputLabel}</label>
        <div class="popup-window-input-wrapper">
            <input type="text" id="${id}-input" class="popup-window-input popup-window-input-with-suffix" value="${inputValue}">
            ${inputSuffix ? `<div class="popup-window-input-suffix">${inputSuffix}</div>` : ""}
        </div>
    </div>
    
    
    <div class="popup-window-hgroup">
        <a class="round-button modal-button-action" href="#" id="${id}-action-button">${actionLabel}</a>
        <a class="round-button modal-button-cancel" href="#" onclick="removeModalWindow('${id}')">Cancel</a>
    </div>
    `;

    const modal = document.querySelector("div.modal");
    modal.style.display = "block";
    modal.appendChild(modalWindow);


    document.getElementById(`${id}-action-button`).addEventListener("click", function (event) {
        event.preventDefault();
        const inputValue = document.getElementById(`${id}-input`).value;
        actionFunction(inputValue);
        removeModalWindow(id);
    });


    const modalInput = document.getElementById(`${id}-input`);
    modalInput.focus();
    modalInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById(`${id}-action-button`).click();
        };
    });


    function onEscapeKey(event) {
        if (event.key === "Escape") {
            event.preventDefault();
            removeModalWindow(id);
            document.removeEventListener("keydown", onEscapeKey);
        };
    };
    document.addEventListener("keydown", onEscapeKey);
};


function removeModalWindow(modalWindowId) {
    const modalWindow = document.getElementById(modalWindowId);
    const modal = modalWindow.parentNode;
    modal.style.display = "none"
    modal.removeChild(modalWindow);
};