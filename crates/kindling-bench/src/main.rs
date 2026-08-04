use std::error::Error;

use kindling_bench::profile::Profile;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    let mut args = std::env::args().skip(1);
    let mut profile_name = "smoke".to_string();
    let mut pretty = false;
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--profile" => {
                profile_name = args.next().ok_or("--profile requires a value")?;
            }
            "--pretty" => pretty = true,
            "--help" | "-h" => {
                eprintln!("Usage: kindling-bench [--profile smoke|standard|stress] [--pretty]");
                return Ok(());
            }
            unknown => return Err(format!("unknown argument: {unknown}").into()),
        }
    }
    let profile = Profile::from_name(&profile_name)
        .ok_or_else(|| format!("unknown profile: {profile_name}"))?;
    let report = kindling_bench::workloads::run(profile).await?;
    if pretty {
        println!("{}", serde_json::to_string_pretty(&report)?);
    } else {
        println!("{}", serde_json::to_string(&report)?);
    }
    Ok(())
}
