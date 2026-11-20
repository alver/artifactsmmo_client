// Task 013: a scenario that imports this FIRST (before index.mts) starts at 21:50 UTC instead of T0 (12:00) — the clock
// reads AMMO_CHECK_NOW when it loads, as a second boot does. Its limits count from T0.
process.env.AMMO_CHECK_NOW ??= String(Date.UTC(2026, 0, 15, 21, 50, 0));
