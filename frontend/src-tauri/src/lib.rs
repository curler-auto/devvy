#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Spawn the sidecar
            use tauri_plugin_shell::ShellExt;
            let sidecar_command = app.shell().sidecar("devtools-desktop").unwrap();
            let (mut rx, mut _child) = sidecar_command.spawn().unwrap();

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                   match event {
                       tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                           log::info!("[Sidecar] {}", String::from_utf8_lossy(&line));
                       }
                       tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                           log::error!("[Sidecar] {}", String::from_utf8_lossy(&line));
                       }
                        _ => {}
                   }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
