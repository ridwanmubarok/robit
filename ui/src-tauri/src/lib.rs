use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let mut log_dir = app.path().home_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
      log_dir.push(".robit");
      let _ = std::fs::create_dir_all(&log_dir);
      let log_file_path = log_dir.join("backend.log");

      let sidecar_command = app.shell().sidecar("robit-backend").unwrap();
      let (mut rx, mut _child) = sidecar_command.spawn().expect("Failed to spawn robit-backend sidecar");

      tauri::async_runtime::spawn(async move {
          use std::io::Write;
          let mut log_file = std::fs::OpenOptions::new()
              .create(true)
              .append(true)
              .open(&log_file_path)
              .ok();

          if let Some(ref mut f) = log_file {
              let _ = writeln!(f, "\n--- Sidecar started at {:?} ---", std::time::SystemTime::now());
          }

          while let Some(event) = rx.recv().await {
              match event {
                  CommandEvent::Stdout(line) => {
                      let text = String::from_utf8_lossy(&line);
                      print!("{}", text);
                      if let Some(ref mut f) = log_file {
                          let _ = write!(f, "{}", text);
                          let _ = f.flush();
                      }
                  }
                  CommandEvent::Stderr(line) => {
                      let text = String::from_utf8_lossy(&line);
                      print!("{}", text);
                      if let Some(ref mut f) = log_file {
                          let _ = write!(f, "{}", text);
                          let _ = f.flush();
                      }
                  }
                  _ => {}
              }
          }
      });

      if cfg!(debug_assertions) {
        // debug
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
