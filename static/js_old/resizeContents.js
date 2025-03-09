/**
 * Sidebar.
 */
document.addEventListener('DOMContentLoaded', function() {
    const resizableSidebar = document.getElementById('sidebar');
    let isResizingSidebar = false;
    let startX = 0;
    const sidebarMinWidth = 20; // Minimum height in %
    const sidebarMaxWidth = 80; // Maximum height in %
    const sidebarHitbox = 5;

    document.addEventListener('mousedown', (e) => {
        const sidebarRightX = resizableSidebar.offsetLeft + resizableSidebar.offsetWidth;
        if (Math.abs(e.pageX - sidebarRightX) <= sidebarHitbox) {
            isResizingSidebar = true;
            startX = e.pageX;
            startWidthPercentage  = (resizableSidebar.offsetWidth / resizableSidebar.parentElement.offsetWidth) * 100;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('selectstart', disableTextSelection);
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
        updateAnnotationTrianglesWidth();
    };

    function disableTextSelection(e) {
        e.preventDefault();
    };
    
    function onMouseUp() {
        isResizingSidebar = false;
        document.documentElement.style.cursor = 'auto';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('selectstart', disableTextSelection);
        document.removeEventListener('mouseup', onMouseUp);
    };

    /**
     * Cursor logic.
     */
    document.addEventListener('mousemove', (e) => {
        const resizableSidebar = document.getElementById('sidebar');

        if (Math.abs(e.pageX - (resizableSidebar.offsetLeft + resizableSidebar.offsetWidth)) <= sidebarHitbox) {
            document.documentElement.style.cursor = 'col-resize';
        } else {
            document.documentElement.style.cursor = 'auto';
        };
    });
});