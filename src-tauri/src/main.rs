// CareerOS desktop shell (ADR-022): a launcher, not a platform.
// Spawns the bundled Next.js server as a Node sidecar on 127.0.0.1,
// waits for it to answer, opens a webview at it, and kills it on exit.
// All product behavior lives in the web app; boundary rules are in
// docs/DESKTOP_ARCHITECTURE.md.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct Sidecar(Mutex<Option<CommandChild>>);

/// First free port at or above 3000. The extension's host permissions are
/// port-less, so falling back off 3000 doesn't strand it.
fn pick_port() -> u16 {
    (3000..3100)
        .find(|p| TcpListener::bind(("127.0.0.1", *p)).is_ok())
        .unwrap_or(3000)
}

/// Ready = the server answers an HTTP request, not merely accepts TCP.
fn wait_until_ready(port: u16, timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) {
            let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
            let request = format!("GET / HTTP/1.0\r\nHost: 127.0.0.1:{port}\r\n\r\n");
            if stream.write_all(request.as_bytes()).is_ok() {
                let mut buf = [0u8; 16];
                if matches!(stream.read(&mut buf), Ok(n) if n > 0) {
                    return true;
                }
            }
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    false
}

fn main() {
    let port = pick_port();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(Sidecar(Mutex::new(None)))
        .setup(move |app| {
            // User data goes to the platform app-data dir; the install
            // location stays read-only (ADR-023).
            let app_data = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data)?;

            let resources = app.path().resource_dir()?;
            let server_dir = resources.join("server");
            let server_js = server_dir.join("server.js");

            // The watchdog preload makes the sidecar exit if this process
            // dies without running its Exit cleanup (crash, SIGKILL). The
            // server must still boot without it, so preload conditionally.
            let watchdog = server_dir.join("sidecar-watchdog.cjs");
            let mut node_args: Vec<String> = Vec::new();
            if watchdog.exists() {
                node_args.push("-r".into());
                node_args.push(watchdog.to_string_lossy().into_owned());
            }
            node_args.push(server_js.to_string_lossy().into_owned());
            let (_rx, child) = app
                .shell()
                .sidecar("node")?
                .args(node_args)
                .current_dir(&server_dir)
                .env("PORT", port.to_string())
                .env("HOSTNAME", "127.0.0.1")
                .env("NODE_ENV", "production")
                .env("CAREEROS_DATA_DIR", app_data.to_string_lossy().as_ref())
                .env("APP_URL", format!("http://127.0.0.1:{port}"))
                .env("CAREEROS_SHELL_PID", std::process::id().to_string())
                .spawn()?;
            *app.state::<Sidecar>().0.lock().unwrap() = Some(child);

            if !wait_until_ready(port, Duration::from_secs(30)) {
                return Err("The CareerOS server did not start within 30 seconds.".into());
            }

            let url: tauri::Url = format!("http://127.0.0.1:{port}").parse()?;
            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
                .title("CareerOS")
                .inner_size(1280.0, 850.0)
                .min_inner_size(800.0, 600.0)
                .build()?;

            // Native menu — items navigate the webview to existing pages;
            // there is deliberately no parallel native UI.
            let about = MenuItemBuilder::with_id("about", "About CareerOS").build(app)?;
            let health = MenuItemBuilder::with_id("health", "Health & Diagnostics").build(app)?;
            let settings = MenuItemBuilder::with_id("settings", "Settings…")
                .accelerator("CmdOrCtrl+,")
                .build(app)?;
            let backup = MenuItemBuilder::with_id("backup", "Back Up Now…").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit CareerOS")
                .accelerator("CmdOrCtrl+Q")
                .build(app)?;
            let app_menu = SubmenuBuilder::new(app, "CareerOS")
                .items(&[&about, &health, &settings, &backup])
                .separator()
                .items(&[&quit])
                .build()?;
            let menu = MenuBuilder::new(app).items(&[&app_menu]).build()?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                let path = match event.id().as_ref() {
                    "about" => "/about",
                    "health" => "/health",
                    "settings" | "backup" => "/settings",
                    "quit" => {
                        app_handle.exit(0);
                        return;
                    }
                    _ => return,
                };
                if let Some(win) = app_handle.get_webview_window("main") {
                    let _ = win.eval(&format!("window.location.href = '{path}'"));
                }
            });

            let _ = window.set_focus();
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build the CareerOS shell")
        .run(|app_handle, event| {
            // Tauri does NOT kill sidecars automatically. SQLite runs in WAL
            // mode, so a hard kill is crash-safe.
            if let RunEvent::Exit = event {
                if let Some(child) = app_handle.state::<Sidecar>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        });
}
