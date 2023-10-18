/**
 * Settings pop up window.
 */
document.addEventListener('DOMContentLoaded', function () {
  // Creat the popup window and immediately hide it.
  const settingsWindow = document.createElement('div');
  settingsWindow.id = "settings-window"
  settingsWindow.className = 'hideable-window';
  /**
   * Int:
   * <label for="fontSize">Font Size (Integer):</label>
   * <input type="number" id="fontSize" name="fontSize" min="10" max="24">
   * 
   * Float:
   * <label for="primerConcInput">Primer concentration [nM]:</label>
   * <input type="text" id="primerConcInput" name="primerConcInput">
   * 
   * Dropdown:
   * <select id="theme" name="theme">
   *  <option value="light">Light</option>
   *  <option value="dark">Dark</option>
   * </select>
   * 
   * Tickbox:
   * <label for="notificationsEnabled">Enable Notifications:</label>
   * <input type="checkbox" id="notificationsEnabled" name="notificationsEnabled">
   * 
   * <div class="settings-window-row"></div>
   */
  settingsWindow.innerHTML = `
      <h2 id="tm-calc-header">Settings:</h2>
      <div class="settings-group">
          <h3>Melting temperature parameters:</h3>
          <div class="settings-window-row">
            <label for="primerConcSettingsInput">Primer concentration [nM]:</label>
            <input type="text" id="primerConcSettingsInput" name="primerConcSettingsInput" value="${primerConc*1E9}">
          </div>
          <div class="settings-window-row">
            <label for="saltConcSettingsInput">Salt concentration [M]:</label>
            <input type="text" id="saltConcSettingsInput" name="saltConcSettingsInput" value="${saltConc}">
          </div>
      </div>

      <div class="settings-group">
          <h3>Primer generation settings:</h3>
          <div class="settings-window-row">
            <label for="homoRegionTmSettingsInput">Homologous region TM [°C]:</label>
            <input type="text" id="homoRegionTmSettingsInput" name="homoRegionTmSettingsInput" value="${homoRegionTm}">
          </div>
          <div class="settings-window-row">
            <label for="tempRegionTmSettingsInput">Template binding region TM [°C]:</label>
            <input type="text" id="tempRegionTmSettingsInput" name="tempRegionTmSettingsInput" value="${tempRegionTm}">
          </div>
      </div>

      <div class="settings-group">
          <h3>Appearance settings:</h3>

          <div class="settings-window-row">
            <label for="theme">Theme:</label>
            <select id="theme" name="theme">
                <option value="light">Light</option>
                <option value="dark" disabled>Dark</option>
            </select>
          </div>

          <div class="settings-window-row">
            <label for="gridWithSettingsInput">Grid size (bases per row):</label>
            <input type="number" id="gridWithSettingsInput" name="gridWithSettingsInput" min="10" max="9999" value="${gridWidth}">
          </div>
      </div>

      <a id="save-settings-btn" class="standard-btn-a" href=#>Save Settings</a>
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

