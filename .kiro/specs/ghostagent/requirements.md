# GhostAgent requirements

## Context

The supplied conversation describes a small GhostAgent web project for turning rough ideas into requirements, architecture and usable web code. The intended static deployment is GitHub Pages. This implementation prioritizes a working demonstration over a complex full-stack platform.

## User stories and acceptance criteria

### 1. Describe an idea
- WHEN a user enters 6–2000 characters, THE SYSTEM SHALL accept the idea.
- WHEN input is empty, too short or too long, THE SYSTEM SHALL reject it with clear feedback.
- WHEN a user selects a built-in example, THE SYSTEM SHALL populate the form without auto-submitting.

### 2. Generate an honest first version
- WHEN no server model is configured, THE SYSTEM SHALL clearly show local template mode.
- WHEN an idea is submitted, THE SYSTEM SHALL create requirements.md, design.md and tasks.md.
- WHEN an idea matches todo, notes or habits, THE SYSTEM SHALL include the matching working frontend starter.
- WHEN an idea does not match a dedicated starter, THE SYSTEM SHALL label the generic-list fallback and its unimplemented business features.
- WHEN AI is configured, THE SYSTEM SHALL send the idea only to the configured server and validate the returned plan.
- THE SYSTEM SHALL distinguish model-refined target requirements from already implemented starter features.

### 3. Inspect and export
- THE SYSTEM SHALL provide tabs for requirements, design, tasks, code and a sandboxed interactive preview.
- WHEN download is selected, THE SYSTEM SHALL create a valid UTF-8 ZIP with code, README and .kiro specs/steering.
- THE SYSTEM SHALL offer text copy and clear clipboard error feedback.

### 4. Keep projects local
- THE SYSTEM SHALL store at most 8 projects in the current browser.
- THE SYSTEM SHALL support reopen, download, delete and confirmed clear-all actions.
- WHEN storage fails, THE SYSTEM SHALL retain the current session and notify the user to download.

### 5. Usability and deployment
- THE SYSTEM SHALL work at a 390px mobile width and desktop width without horizontal document overflow.
- THE SYSTEM SHALL support keyboard tab navigation, labelled forms and reduced-motion preferences.
- THE SYSTEM SHALL run on static hosting without dependencies or a build step.
- THE SYSTEM SHALL keep optional AI secrets on a loopback-only server, not in the frontend.
