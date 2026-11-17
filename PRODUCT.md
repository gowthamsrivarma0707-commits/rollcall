# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Python 3 standard library (`http.server`, `sqlite3`), vanilla HTML5/CSS3/JavaScript, zero heavy node or framework runtime dependencies.

## Users

1. **Students**: College students checking their live attendance percentage, seeing which classes they attended/missed, and calculating exactly how many classes they can afford to skip while staying above 75%.
2. **Teachers / Faculty**: Professors and lecturers marking period-by-period class roll call in seconds, reviewing historical records, and exporting monthly sheets.
3. **College Administrators (HOD / Principal)**: Academic authority reviewing branch-wide compliance, managing credentials, and auditing attendance integrity.

## Product Purpose

Eliminate manual paper registers and slow, clunky university ERPs. Provide an instant, zero-latency, mobile-responsive attendance portal tailored for Indian engineering & degree college environments (specifically GVP campus context).

## Positioning

A lightweight, distraction-free attendance tracker with instantaneous real-time calculation ("bunk meter" / safe skips calculator) and direct 1-click period roll call for teachers that works effortlessly on poor mobile networks.

## Core Workflows

- **Student Flow**: Sign in with roll number → Live percentage meter with 75% cutoff threshold alert → Period-wise breakdown & safe bunk allowance.
- **Teacher Flow**: Sign in with faculty ID → Select Branch, Semester, Section & Period → Quick tap attendance roster (Present / Absent / Late toggle) → Instant save & audit log.
- **Admin Flow**: Password reset, staff/student enrollment synchronization, and monthly Excel export via `openpyxl`.

## Constraints & Standards

- Zero frontend framework bundle bloat (vanilla CSS + JS only for instant load on 3G/4G).
- High contrast, accessible typography and clear color indicators (Emerald Green for Safe >75%, Crimson Red for Shortage <75%).
- Responsive design tailored for mobile browsers (Chrome / Safari on Android and iOS).
