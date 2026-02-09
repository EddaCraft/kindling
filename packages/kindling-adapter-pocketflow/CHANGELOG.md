# Changelog

All notable changes to @eddacraft/kindling-adapter-pocketflow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-27

### Added

- Initial release
- KindlingNode class for instrumented workflow nodes
- KindlingFlow class for instrumented workflows
- Automatic capsule creation per node execution
- Node lifecycle observation recording (start, output, error, end)
- Intent inference from node names with configurable patterns
- Confidence tracking with execution history
- Support for retries and fallback handling
- Truncation of large outputs
- Base PocketFlow classes (BaseNode, Node, Flow) re-exported for convenience
