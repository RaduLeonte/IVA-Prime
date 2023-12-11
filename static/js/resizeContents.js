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

        //console.log("Cursor:", hoveringOverSidebarEdge, hoveringOverContainerEdge)
        if (hoveringOverSidebarEdge) {
            document.documentElement.style.cursor = 'col-resize';
        } else {
            document.documentElement.style.cursor = 'auto';
        };
    });
});