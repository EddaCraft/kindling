use std::time::Duration;

use kindling_bench::statistics::LatencySummary;

#[test]
fn latency_summary_reports_percentiles_and_throughput() {
    let samples = (1..=100).map(Duration::from_micros).collect::<Vec<_>>();

    let summary = LatencySummary::from_samples(&samples, Duration::from_millis(10));

    assert_eq!(summary.samples, 100);
    assert_eq!(summary.min_us, 1.0);
    assert_eq!(summary.p50_us, 50.0);
    assert_eq!(summary.p95_us, 95.0);
    assert_eq!(summary.p99_us, 99.0);
    assert_eq!(summary.max_us, 100.0);
    assert_eq!(summary.mean_us, 50.5);
    assert_eq!(summary.operations_per_second, 10_000.0);
}

#[test]
fn latency_summary_handles_no_samples() {
    let summary = LatencySummary::from_samples(&[], Duration::ZERO);

    assert_eq!(summary.samples, 0);
    assert_eq!(summary.operations_per_second, 0.0);
    assert_eq!(summary.p99_us, 0.0);
}

#[test]
fn batch_summary_uses_logical_operation_count_for_throughput() {
    let samples = [Duration::from_millis(20)];
    let summary =
        LatencySummary::from_samples_with_operations(&samples, Duration::from_millis(20), 100);

    assert_eq!(summary.samples, 1);
    assert_eq!(summary.operations_per_second, 5_000.0);
}
