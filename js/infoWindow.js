/**
 * Settings pop up window.
 */
document.addEventListener('DOMContentLoaded', function () {
    // Creat the popup window and immediately hide it.
    const infoWindow = document.createElement('div');
    infoWindow.id = "info-window"
    infoWindow.className = 'hideable-window';
    infoWindow.innerHTML = `
        <h2 id="tm-calc-header">Info:</h2>
        <p> Hi.</p>
    `;
    infoWindow.style.display = 'none';
    document.body.appendChild(infoWindow);
  });
  
  
  /**
   * Display  window.
   */
  function showInfoWindow() {
    const settingsWindow = document.getElementById('settings-window');
    settingsWindow.style.display = 'block';
    repositionSettingsWindow();
  }
  
  
  /**
   * Hide melting temperature calculator window.
   */
  function hideSettingsWindow() {
    const settingsWindow = document.getElementById('settings-window');
    settingsWindow.style.display = 'none';
  }
  
  
  /**
   * Reposition window on resize
   */
  function repositionSettingsWindow() {
    const settingsWindow = document.getElementById('settings-window');
    const rectButton = document.getElementById('settings-btn').getBoundingClientRect();
    const rectHeader = document.getElementsByTagName("header")[0].getBoundingClientRect();
  
    settingsWindow.style.right = (window.innerWidth - rectButton.right) + "px";
    settingsWindow.style.top = rectHeader.bottom + "px";
  }
  
  /**
   * Button listener.
   */
  document.addEventListener('DOMContentLoaded', function () {
    const settingsButton = document.getElementById('settings-btn');
    settingsButton.addEventListener('click', function(event) {
      console.log("Clicked on settings button.")
      event.stopPropagation();
      if (document.getElementById("settings-window").style.display === "none") {
        console.log("--1");
        hideAllHideableWindows();
        showSettingsWindow();
      } else {
        console.log("--2");
        hideAllHideableWindows();
      }
    });
  
    document.addEventListener('click', function (event) {
      event.stopPropagation();
      if (document.getElementById("settings-window").style.display !== "none") {
        const window = document.getElementById('settings-window');
        const windowRect = window.getBoundingClientRect();
        
        const clickX = event.clientX;
        const clickY = event.clientY;
        if (
          clickX < windowRect.left || 
          clickX > windowRect.right || 
          clickY < windowRect.top || 
          clickY > windowRect.bottom
        ) {
          hideSettingsWindow();
        }
      }
    });
  
    window.addEventListener('resize', function () {
      if (document.getElementById("settings-window").style.display !== "none") {
        repositionSettingsWindow();
      };
    });
  });
  
  
  function hideAllHideableWindows() {
    console.log("Hiding all windows.")
    const popupWindows = document.querySelectorAll('.hideable-window');
    for (const popupWindow of popupWindows) {
      popupWindow.style.display = 'none';
    }
  }