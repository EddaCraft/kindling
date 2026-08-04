# kindling benchmarks

This crate measures the public workloads that can affect an integration using
kindling as a bundled local service. It is private (`publish = false`) and adds
no dependencies to the shipped client, runtime, or daemon.

The suite covers:

- fresh bundled-daemon startup;
- direct SQLite/service writes as the no-transport baseline;
- warm and deduplicated daemon writes through the durable spool wrapper;
- concurrent daemon writers;
- one-page and exhaustive keyset-paginated reads;
- ranked full-text retrieval;
- unavailable-daemon spool writes and replay;
- process CPU, RSS, threads, file descriptors, physical I/O counters, database
  growth, and spool growth.

Benchmark names describe kindling behavior rather than any downstream product.

## Statistical benchmarks

Run the Criterion suite in release mode:

```bash
cargo bench -p kindling-bench --bench workloads
```

Filter to one workload when iterating:

```bash
cargo bench -p kindling-bench --bench workloads -- daemon/list-full-scan
```

Criterion writes its normal comparison data and reports under
`target/criterion/`. Do not commit those machine-specific results.

## Workload and resource profile

The profiler emits stable-schema JSON suitable for archiving or comparing in
CI and lab runs:

```bash
cargo run -p kindling-bench --release -- --profile smoke --pretty
cargo run -p kindling-bench --release -- --profile standard > kindling-perf.json
cargo run -p kindling-bench --release -- --profile stress > kindling-stress.json
```

| Profile    | Purpose                          | Seed rows | Measured writes | Concurrent writes | Spool/replay rows |
| ---------- | -------------------------------- | --------: | --------------: | ----------------: | ----------------: |
| `smoke`    | Fast correctness and local check |     2,000 |             200 |               200 |               100 |
| `standard` | Representative workstation run   |    20,000 |           2,000 |             4,000 |             1,000 |
| `stress`   | Scaling and resource pressure    |   200,000 |          20,000 |            32,000 |           100,000 |

Latency is reported in microseconds with min, mean, p50, p95, p99, max, and
operations/second. Full-scan metrics also report rows processed so pagination
completeness is visible. Outage writes include aggregate, first-10%, and
last-10% windows so backlog-dependent latency is not hidden by one percentile.

Resource sampling uses `/proc/self` on Linux because the bundled daemon runs in
the same process. It reports average CPU in saturated-core units (`1.0` means
one fully used core), start/end/peak RSS, peak RSS above the workload baseline,
RSS growth, starting and peak threads/file descriptors with peak-over-start
deltas, and physical read/write byte deltas. Absolute values describe the
benchmark process; the delta fields describe resources added during one
workload window. Unsupported operating systems return
`available: false` and `null` resource fields while still producing latency,
throughput, and storage measurements.

For comparable numbers, use the same release build, hardware, filesystem,
power profile, dataset profile, and background-load conditions. Run the suite
more than once and use Criterion's comparison rather than treating a single
profiler run as a regression threshold.
