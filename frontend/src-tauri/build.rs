fn main() {
  let cwd = std::env::current_dir().unwrap();
  println!("cargo:warning=CWD: {:?}", cwd);
  
  // List files in binaries directory
  let bin_path = cwd.join("binaries");
  println!("cargo:warning=Checking binaries path: {:?}", bin_path);
  
  if bin_path.exists() {
      println!("cargo:warning=Binaries directory exists.");
      match std::fs::read_dir(&bin_path) {
          Ok(entries) => {
              for entry in entries {
                  if let Ok(entry) = entry {
                       println!("cargo:warning=Found file: {:?}", entry.path());
                  }
              }
          }
          Err(e) => println!("cargo:warning=Error reading binaries dir: {}", e),
      }
  } else {
      println!("cargo:warning=Binaries directory DOES NOT exist at expected path.");
      
      // Try listing parent directory to see where we are
      if let Some(parent) = cwd.parent() {
          println!("cargo:warning=Listing parent {:?}:", parent);
           if let Ok(entries) = std::fs::read_dir(parent) {
              for entry in entries {
                  if let Ok(entry) = entry {
                      println!("cargo:warning=Parent content: {:?}", entry.path());
                  }
              }
           }
      }
  }

  tauri_build::build()
}
