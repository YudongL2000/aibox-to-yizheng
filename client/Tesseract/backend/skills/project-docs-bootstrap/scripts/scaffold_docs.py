#!/usr/bin/env python3
"""
Deterministically scaffold a lifecycle-based docs/ tree.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


SECTIONS = {
    "overview": {
        "heading": "Overview",
        "files": {
            "introduction.md": "# Introduction\n\n- Explain what this project is.\n- Explain why it exists.\n- Explain who should care.\n",
            "architecture.md": "# Architecture\n\n- Describe the major components.\n- Show how data and control flow through the system.\n- Link to deeper technical docs when they exist.\n",
            "glossary.md": "# Glossary\n\n- Define project-specific terms.\n- Expand acronyms and internal shorthand.\n- Remove entries that stop being useful.\n",
            "faq.md": "# FAQ\n\n- Capture repeated questions.\n- Prefer short answers with links to deeper pages.\n- Delete stale answers instead of letting them drift.\n",
        },
    },
    "getting-started": {
        "heading": "Getting Started",
        "files": {
            "prerequisites.md": "# Prerequisites\n\n- List required tools, runtimes, and accounts.\n- Call out OS or hardware constraints.\n- Keep version requirements explicit.\n",
            "installation.md": "# Installation\n\n- Describe how to install or clone the project.\n- Keep commands copy-pasteable.\n- Link to configuration next.\n",
            "configuration.md": "# Configuration\n\n- Explain the minimum configuration to run the project.\n- Separate templates from secrets.\n- Call out environment-specific switches.\n",
            "quickstart.md": "# Quick Start\n\n- Show the shortest path to a working local run.\n- Keep it to a few commands.\n- Link outward instead of expanding every detail here.\n",
        },
    },
    "usage": {
        "heading": "Usage",
        "files": {
            "cli.md": "# CLI Usage\n\n- Document supported commands and flags.\n- Include one or two realistic examples.\n- Link to troubleshooting when behavior is surprising.\n",
            "api.md": "# API Usage\n\n- Describe the main endpoints or integration surface.\n- Show request and response shape at a high level.\n- Link to detailed schemas if they exist elsewhere.\n",
            "examples.md": "# Examples\n\n- Capture representative end-to-end examples.\n- Prefer real workflows over toy snippets.\n- Keep examples short enough to scan quickly.\n",
            "troubleshooting.md": "# Troubleshooting\n\n- List the failures users actually hit.\n- Put diagnosis before workaround.\n- Remove outdated fixes once the root problem is gone.\n",
        },
    },
    "development": {
        "heading": "Development",
        "files": {
            "setup.md": "# Development Setup\n\n- Explain how maintainers boot a local dev environment.\n- Include tools, services, and seed data if needed.\n- Keep it current with the real workflow.\n",
            "project-structure.md": "# Project Structure\n\n- Explain how the repository is organized.\n- Point out high-value modules and boundaries.\n- Highlight where new code should go.\n",
            "coding-guidelines.md": "# Coding Guidelines\n\n- Capture only the rules that matter in practice.\n- Prefer concrete examples over abstract slogans.\n- Link to formatter or lint configuration when relevant.\n",
            "testing.md": "# Testing\n\n- Describe test layers and the minimum merge bar.\n- Show how to run focused checks quickly.\n- Call out slow or environment-specific suites.\n",
            "debugging.md": "# Debugging\n\n- Record the known high-value debugging entry points.\n- Prefer symptom -> check -> likely cause.\n- Keep one-off incident notes elsewhere.\n",
        },
    },
    "deployment": {
        "heading": "Deployment",
        "files": {
            "environments.md": "# Environments\n\n- Describe dev, staging, and prod differences.\n- Keep naming and ownership explicit.\n- Document only live environments.\n",
            "build.md": "# Build\n\n- Explain what gets built and by which commands.\n- Note caches, artifacts, and version boundaries.\n- Keep CI and local build behavior aligned.\n",
            "deploy.md": "# Deploy\n\n- Document the supported deployment path.\n- Keep commands or pipeline steps exact.\n- Link to rollback before incidents force guesswork.\n",
            "rollback.md": "# Rollback\n\n- Explain how to revert safely.\n- State prerequisites and risk checks.\n- Keep the steps boring and deterministic.\n",
            "monitoring.md": "# Monitoring\n\n- Point to logs, dashboards, metrics, and alerts.\n- Explain what healthy looks like.\n- Include first checks for common incidents.\n",
        },
    },
    "security": {
        "heading": "Security",
        "files": {
            "auth.md": "# Authentication And Authorization\n\n- Explain the auth model and permission boundaries.\n- Clarify who can do what.\n- Link to implementation detail only when needed.\n",
            "secrets.md": "# Secrets Management\n\n- Explain where secrets live and how they are provisioned.\n- Never put secret values in docs.\n- Separate templates from real credentials.\n",
            "threat-model.md": "# Threat Model\n\n- Record the highest-value threats and assumptions.\n- Keep it practical rather than academic.\n- Update it when architecture changes meaningfully.\n",
        },
    },
    "product": {
        "heading": "Product",
        "files": {
            "requirements.md": "# Requirements\n\n- Capture the current product goals.\n- Distinguish shipped behavior from desired behavior.\n- Link out to decision records where tradeoffs were made.\n",
            "user-flows.md": "# User Flows\n\n- Document the major end-to-end user paths.\n- Keep actors and outcomes explicit.\n- Prefer a few real flows over exhaustive diagrams.\n",
            "roadmap.md": "# Roadmap\n\n- List the next meaningful milestones.\n- Avoid backlog dumps.\n- Mark uncertainty instead of implying false precision.\n",
        },
    },
    "decisions": {
        "heading": "Decisions",
        "files": {
            "README.md": "# ADR Index\n\n- List architecture or technical decision records here.\n- Give each ADR a stable number and concise title.\n- Link only current records, not brainstorming notes.\n",
        },
    },
    "changelog": {
        "heading": "Changelog",
        "files": {
            "CHANGELOG.md": "# Changelog\n\n## Unreleased\n\n- Record notable user-facing changes.\n- Prefer grouped entries over commit-by-commit dumps.\n",
            "releases.md": "# Releases\n\n- Summarize release milestones and packaging notes.\n- Link to changelog entries or release artifacts.\n- Keep it lightweight if CHANGELOG already carries the detail.\n",
        },
    },
}

PROFILES = {
    "minimal": [
        ("getting-started", ["quickstart.md"]),
        ("deployment", ["deploy.md"]),
        ("changelog", ["CHANGELOG.md"]),
    ],
    "opensource": [
        ("overview", ["introduction.md", "architecture.md", "faq.md"]),
        ("getting-started", ["prerequisites.md", "installation.md", "configuration.md", "quickstart.md"]),
        ("usage", ["examples.md", "troubleshooting.md"]),
        ("development", ["setup.md", "project-structure.md", "coding-guidelines.md", "testing.md"]),
        ("security", ["auth.md", "secrets.md"]),
        ("changelog", ["CHANGELOG.md"]),
    ],
    "saas": [
        ("overview", ["introduction.md", "architecture.md", "glossary.md", "faq.md"]),
        ("getting-started", ["prerequisites.md", "installation.md", "configuration.md", "quickstart.md"]),
        ("usage", ["cli.md", "api.md", "examples.md", "troubleshooting.md"]),
        ("development", ["setup.md", "project-structure.md", "coding-guidelines.md", "testing.md", "debugging.md"]),
        ("deployment", ["environments.md", "build.md", "deploy.md", "rollback.md", "monitoring.md"]),
        ("security", ["auth.md", "secrets.md", "threat-model.md"]),
        ("decisions", ["README.md"]),
        ("changelog", ["CHANGELOG.md", "releases.md"]),
    ],
}

TITLE_OVERRIDES = {
    "api": "API",
    "cli": "CLI",
    "faq": "FAQ",
    "readme": "README",
    "changelog": "CHANGELOG",
    "quickstart": "Quick Start",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scaffold a lifecycle-based docs tree.")
    parser.add_argument("--root", required=True, help="Project root where docs/ should be created.")
    parser.add_argument("--profile", required=True, choices=sorted(PROFILES), help="Docs profile to scaffold.")
    parser.add_argument("--docs-dir", default="docs", help="Documentation root directory name. Default: docs")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files.")
    parser.add_argument("--dry-run", action="store_true", help="Print planned actions without writing files.")
    return parser.parse_args()


def log(action: str, path: Path) -> None:
    print(f"{action:8} {path}")


def ensure_dir(path: Path, dry_run: bool) -> None:
    if path.exists():
        log("exists", path)
        return
    log("mkdir", path)
    if not dry_run:
        path.mkdir(parents=True, exist_ok=True)


def write_file(path: Path, content: str, force: bool, dry_run: bool) -> None:
    if path.exists() and not force:
        log("skip", path)
        return
    log("write", path)
    if not dry_run:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


def build_readme(profile: str) -> str:
    lines = ["# Project Documentation", ""]
    for section_key, files in PROFILES[profile]:
        heading = SECTIONS[section_key]["heading"]
        lines.append(f"## {heading}")
        for file_name in files:
            stem = Path(file_name).stem
            normalized = stem.replace("-", " ").lower()
            title = TITLE_OVERRIDES.get(normalized)
            if title is None:
                title = " ".join(word.capitalize() for word in normalized.split())
            lines.append(f"- [{title}]({section_key}/{file_name})")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def scaffold(root: Path, docs_dir_name: str, profile: str, force: bool, dry_run: bool) -> int:
    docs_root = root / docs_dir_name
    ensure_dir(docs_root, dry_run)
    write_file(docs_root / "README.md", build_readme(profile), force=force, dry_run=dry_run)

    for section_key, files in PROFILES[profile]:
        section_root = docs_root / section_key
        ensure_dir(section_root, dry_run)
        section_files = SECTIONS[section_key]["files"]
        for file_name in files:
            content = section_files[file_name]
            write_file(section_root / file_name, content, force=force, dry_run=dry_run)

    return 0


def main() -> int:
    args = parse_args()
    root = Path(args.root).expanduser().resolve()
    if not root.exists():
        print(f"[ERROR] root does not exist: {root}", file=sys.stderr)
        return 1
    return scaffold(root, args.docs_dir, args.profile, args.force, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
