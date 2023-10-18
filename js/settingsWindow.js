/**
 * Melting temperature calculator window.
 */
document.addEventListener('DOMContentLoaded', function () {
    // Creat the popup window and immediately hide it.
    const settingsWindow = document.createElement('div');
    settingsWindow.id = "settings-window"
    settingsWindow.className = 'tm-calc-window';
    /**
     * Int
     * 
     * Float
     * 
     * Dropdown
     * 
     * Tickbox 
     */
    settingsWindow.innerHTML = `
      <h2 id="tm-calc-header">Settings:</h2>
        <div class="settings-group">
            <h3>Melting temperature parameters:</h3>

            <label for="primerConcInput">Primer concentration [nM]:</label>
            <input type="text" id="primerConcInput" name="primerConcInput">

            <label for="saltConcInput">Salt concentration [M]:</label>
            <input type="text" id="saltConcInput" name="saltConcInput">
        </div>

        <div class="settings-group">
            <h3>Appearance Ssttings</h3>
            <label for="theme">Theme:</label>
            <select id="theme" name="theme">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
            
            <label for="fontSize">Font Size (Integer):</label>
            <input type="number" id="fontSize" name="fontSize" min="10" max="24">
            
            <label for="lineHeight">Line Height (Float):</label>
            <input type="text" id="lineHeight" name="lineHeight">
        </div>

        <div class="settings-group">
            <h2>Notification Settings</h2>
            <label for="notificationsEnabled">Enable Notifications:</label>
            <input type="checkbox" id="notificationsEnabled" name="notificationsEnabled">
            
            <label for="notificationSound">Notification Sound:</label>
            <input type="file" id="notificationSound" name="notificationSound">
        </div>

        <button type="button" id="saveButton">Save Settings</button>
    `;
    settingsWindow.style.display = 'none';
    document.body.appendChild(settingsWindow);
  });
  
  
  /**
   * Display melting temperature calculator window.
   */
  function showSettingsWindow() {
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
      event.stopPropagation();
      if (!isSettingsWindowVisible) {
        showSettingsWindow();
        isSettingsWindowVisible = true;
      }
    });
  
    document.addEventListener('click', function (event) {
      event.stopPropagation();
      if (isSettingsWindowVisible && !event.target.closest('#settings-window')) {
        hideSettingsWindow();
        isSettingsWindowVisible = false;
      }
    });
  
    window.addEventListener('resize', function () {
      if (isSettingsWindowVisible) {
        repositionSettingsWindow();
      };
    });
  });