# Changelog

All notable changes to @kindling/provider-local will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-27

### Added

- Initial release
- LocalFtsProvider for FTS-based retrieval
- Deterministic ranking algorithm combining FTS score and recency
- Scope-based filtering (sessionId, repoId, agentId, userId)
- Explainable results with match explanations
- Configurable result limits
- Evidence snippet extraction
