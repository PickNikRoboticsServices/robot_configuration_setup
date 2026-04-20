# DEPRECATED Robot Configuration Setup

https://github.com/PickNikRoboticsServices/bloodhound

Functionality moved to Bloodhound.

Guides and tooling for building MoveIt Pro robot configuration packages, designed to be used by Claude Code agents and human engineers.

## Core Files

The most important files in this repo are the **Claude instruction files** that guide autonomous robot configuration:

| File | Purpose |
|------|---------|
| **`CLAUDE.md`** | Main entry point. Workspace setup, routing table to specific guides, Docker templates, build commands. |
| **`.claude/existing_urdf_config.md`** | Step-by-step guide for creating a MoveIt Pro config from an existing URDF. Includes end effector setup. |
| **`.claude/urdf_from_cad.md`** | Guide for building a URDF from raw CAD/STL mesh files. |
| **`.claude/verification.md`** | Systematic verification steps for a running config (controllers, objectives, teleop, visual inspection). |
| **`.claude/debugging.md`** | Troubleshooting reference: log locations, common errors, CLI commands. |
| **`.claude/file_checklist.md`** | Complete file checklist for a config package. |

## Tooling

| Directory | Purpose |
|-----------|---------|
| `ui_testing/` | Playwright-based screenshot capture for automated visual verification of the MoveIt Pro web UI. |

## Supporting Material

| Directory | Purpose |
|-----------|---------|
| `supporting_docs/` | Checklists, source references, and test instructions used during development. |
