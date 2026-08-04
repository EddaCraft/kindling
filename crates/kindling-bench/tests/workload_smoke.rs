use kindling_bench::profile::Profile;

#[tokio::test]
async fn smoke_profile_exercises_every_workload_group() {
    let report =
        kindling_bench::workloads::run(Profile::from_name("smoke").expect("smoke profile exists"))
            .await
            .expect("smoke workload completes");

    let names = report
        .groups
        .iter()
        .map(|group| group.name.as_str())
        .collect::<Vec<_>>();
    assert_eq!(
        names,
        ["cold-start", "direct-service", "daemon", "outage-recovery"]
    );
    assert!(report.system.logical_cpus > 0);
    for group in &report.groups {
        assert!(!group.metrics.is_empty());
        assert!(group
            .metrics
            .iter()
            .all(|metric| metric.operation_count > 0));
    }
    let replay = report.groups[3]
        .metrics
        .iter()
        .find(|metric| metric.name == "spool-replay")
        .expect("replay metric");
    assert_eq!(replay.operation_count, report.profile.spool_operations);
}
