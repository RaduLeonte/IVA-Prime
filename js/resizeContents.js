/**
 * Sidebar.
 */
document.addEventListener('DOMContentLoaded', function() {
    const resizableSidebar = document.getElementById('sidebar');
    let isResizingSidebar = false;
    let startX = 0;
    let startWidth = 0;
    const sidebarMinWidth = 20; // Minimum height in %
    const sidebarMaxWidth = 80; // Maximum height in %

    document.addEventListener('mousedown', (e) => {
        const sidebarRightX = resizableSidebar.offsetLeft + resizableSidebar.offsetWidth;
        if (Math.abs(e.pageX - sidebarRightX) <= sidebarHitbox) {
            isResizingSidebar = true;
            startX = e.pageX;
            startWidthPercentage  = (resizableSidebar.offsetWidth / resizableSidebar.parentElement.offsetWidth) * 100;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
    });

    function onMouseMove(e) {
        if (!isResizingSidebar) return;
    
        let newWidth = startWidthPercentage + ((e.pageX - startX) / resizableSidebar.parentElement.offsetWidth) * 100;
        if (newWidth < sidebarMinWidth) {
            newWidth = sidebarMinWidth;
        } else if (newWidth > sidebarMaxWidth) {
            newWidth = sidebarMaxWidth;
        };


        resizableSidebar.style.width = `${newWidth}%`;
        const resizableSidebar2 = document.getElementById('sidebar2');
        if (resizableSidebar2) {
            resizableSidebar2.style.width = `${newWidth}%`;
        };
        updateAnnotationTrianglesWidth();
    };
    
    function onMouseUp() {
        isResizingSidebar = false;
        document.documentElement.style.cursor = 'auto';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
});


/**
 * Containers.
 */

/**
 * Wait for tables to exist then return. secondPlasmidIported
 */
function waitForSecondPlasmid(callback) {
    const checkForSecondPlasmid = setInterval(function() {
      if (secondPlasmidImported) {
        clearInterval(checkForSecondPlasmid);
        callback();
      };
    }, 100); // Check for table existence every 100ms
};


// Listeners waiting for the tables to exist before enabling the cursor hover hint
waitForSecondPlasmid(function() {
    enablePlasmidContainerResize();
});


function enablePlasmidContainerResize() {
    const resizableContainer = document.getElementById('first-plasmid-container');
    let isResizingContainer = false;
    let startY = 0;
    let startHeight = 0;
    const minHeight = 20; // Minimum height in %
    const maxHeight = 80; // Maximum height in %

    document.addEventListener('mousedown', (e) => {
        console.log("Mouse down")
        const containerBottomY  = resizableContainer.offsetTop  + resizableContainer.offsetHeight;
        if (Math.abs(e.pageY - containerBottomY) <= containerHitbox) {
            isResizingContainer = true;
            startY = e.pageY;
            startHeight  = parseInt(getComputedStyle(resizableContainer).height, 10);
            //console.log("Start height:", startHeight)

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
    });


    function onMouseMove(e) {
        if (!isResizingContainer) return;   
    
        let newHeight  = startHeight  + (e.pageY - startY);
        const parentHeight = resizableContainer.parentElement.clientHeight;

        newHeight = (newHeight / parentHeight) * 100;
        if (newHeight < minHeight) {
            newHeight = minHeight;
        } else if (newHeight > maxHeight) {
            newHeight = maxHeight;
        };

        if (newHeight < parentHeight) {
            //console.log("New Height:", newHeight)
            resizableContainer.style.height = `${newHeight}%`;
        };
    };
    
    function onMouseUp() {
        isResizingContainer = false;
        document.documentElement.style.cursor = 'auto';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
};


/**
 * Cursor logic.
 */

document.addEventListener('mousemove', (e) => {
    const resizableSidebar = document.getElementById('sidebar');
    const sidebarRightX = resizableSidebar.offsetLeft + resizableSidebar.offsetWidth;
    if (Math.abs(e.pageX - sidebarRightX) <= sidebarHitbox) {
        hoveringOverSidebarEdge = true;
    } else {
        hoveringOverSidebarEdge = false;
    };

    const resizableContainer = document.getElementById('first-plasmid-container');
    const containerBottomY  = resizableContainer.offsetTop  + resizableContainer.offsetHeight;
    if (Math.abs(e.pageY - containerBottomY) <= containerHitbox) {
        hoveringOverContainerEdge = true;
    } else {
        hoveringOverContainerEdge = false;
    };

    //console.log("Cursor:", hoveringOverSidebarEdge, hoveringOverContainerEdge)
    if (hoveringOverSidebarEdge && hoveringOverContainerEdge) {
        document.documentElement.style.cursor = 'all-scroll';
    } else if (hoveringOverSidebarEdge) {
        document.documentElement.style.cursor = 'col-resize';
    } else if (hoveringOverContainerEdge) {
        document.documentElement.style.cursor = 'row-resize';
    } else {
        document.documentElement.style.cursor = 'auto';
    };
});