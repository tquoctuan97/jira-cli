# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2026-09-11

### Fixed

- Fixed `attachment download` rejecting the required global `--output-file` option.

## [0.3.0] - 2026-09-11

### Added

- Added `issue context` to return an AI-agent-friendly view of an issue, including bounded recent comments, attachment metadata, and local issue links.
- Added cached npm version checks with update notices on stderr.
- Added `--quiet` and environment-variable controls for disabling update notices in automation.
- Added Jira Wiki Markup guidance for issue descriptions and comments.
- Added documentation for creating and using Jira Personal Access Tokens.

### Changed

- Limited the default fields returned by `issue get` to a useful, predictable set while preserving explicit field selection and raw output.
- Made `issue search` output more compact by default for lower-noise agent workflows.
- Excluded noisy custom fields from default issue reads unless explicitly requested.

## [0.2.0] - 2026-07-16

### Changed

- Moved Agent Skill installation to the Skills CLI workflow: `npx skills add tquoctuan97/jira-cli --skill jira-cli`.
- Expanded the bundled Agent Skill with clearer prerequisites, safe-operation guidance, and Jira workflow examples.

### Removed

- Removed the built-in `jira-cli install --skills` command and its installation services.

## [0.1.0] - 2026-07-15

### Added

- Initial public release of `@tquoctuan97/jira-cli`.
- Added Jira authentication and session status commands.
- Added issue creation, retrieval, update, search, and workflow transition commands.
- Added support for comments, attachments, links, watchers, projects, fields, and users.
- Added JSON output designed for scripting and AI-agent usage.
- Added the Jira CLI Agent Skill, documentation, and automated tests.
