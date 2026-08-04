//! Distribution summaries shared by the benchmark and profiling surfaces.

use std::time::Duration;

use serde::{Deserialize, Serialize};

/// A compact latency distribution with throughput for one measured operation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LatencySummary {
    pub samples: usize,
    pub min_us: f64,
    pub mean_us: f64,
    pub p50_us: f64,
    pub p95_us: f64,
    pub p99_us: f64,
    pub max_us: f64,
    pub operations_per_second: f64,
}

impl LatencySummary {
    /// Summarise measured samples using nearest-rank percentiles.
    #[must_use]
    pub fn from_samples(samples: &[Duration], elapsed: Duration) -> Self {
        Self::from_samples_with_operations(samples, elapsed, samples.len())
    }

    /// Summarise samples while using a separate logical operation count for
    /// throughput (for example, one timed sample that flushes 1,000 entries).
    #[must_use]
    pub fn from_samples_with_operations(
        samples: &[Duration],
        elapsed: Duration,
        operation_count: usize,
    ) -> Self {
        if samples.is_empty() {
            return Self {
                samples: 0,
                min_us: 0.0,
                mean_us: 0.0,
                p50_us: 0.0,
                p95_us: 0.0,
                p99_us: 0.0,
                max_us: 0.0,
                operations_per_second: 0.0,
            };
        }

        let mut micros = samples
            .iter()
            .map(Duration::as_secs_f64)
            .map(|seconds| seconds * 1_000_000.0)
            .collect::<Vec<_>>();
        micros.sort_by(f64::total_cmp);
        let mean_us = micros.iter().sum::<f64>() / micros.len() as f64;
        let operations_per_second = if elapsed.is_zero() {
            0.0
        } else {
            operation_count as f64 / elapsed.as_secs_f64()
        };

        Self {
            samples: micros.len(),
            min_us: micros[0],
            mean_us,
            p50_us: percentile(&micros, 0.50),
            p95_us: percentile(&micros, 0.95),
            p99_us: percentile(&micros, 0.99),
            max_us: micros[micros.len() - 1],
            operations_per_second,
        }
    }
}

fn percentile(sorted: &[f64], quantile: f64) -> f64 {
    let rank = (quantile * sorted.len() as f64).ceil() as usize;
    sorted[rank.saturating_sub(1).min(sorted.len() - 1)]
}
