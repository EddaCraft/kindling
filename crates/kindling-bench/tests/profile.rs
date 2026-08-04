use kindling_bench::profile::Profile;

#[test]
fn named_profiles_scale_work_without_changing_scenarios() {
    let smoke = Profile::from_name("smoke").expect("smoke profile");
    let standard = Profile::from_name("standard").expect("standard profile");
    let stress = Profile::from_name("stress").expect("stress profile");

    assert!(smoke.write_operations < standard.write_operations);
    assert!(standard.write_operations < stress.write_operations);
    assert!(smoke.seed_observations < standard.seed_observations);
    assert!(standard.seed_observations < stress.seed_observations);
    assert_eq!(stress.spool_operations, 100_000);
    assert_eq!(smoke.name, "smoke");
    assert!(Profile::from_name("unknown").is_none());
}
