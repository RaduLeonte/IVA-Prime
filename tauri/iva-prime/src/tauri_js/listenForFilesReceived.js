if (window.__TAURI__) {
  import('@tauri-apps/api/event').then(({ listen }) => {
    listen('files_received', (event) => {
      console.log('Received files from backend:', event.payload);
      FileIO.importQueue(event.payload);
    });
  }).catch((err) => {
    console.error('Failed to load Tauri event API:', err);
  });
}