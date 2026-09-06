# Mobile courtside performance verification

Verified 2026-09-02 against the production Next.js build and the iPhone 13 Playwright viewport.

| Budget                           |                        Target | Result                                                      |
| -------------------------------- | ----------------------------: | ----------------------------------------------------------- |
| Horizontal document overflow     |                          0 px | Pass (`mobile-courtside.spec.ts`)                           |
| Production compilation           |                    Successful | Pass (`npm run build`)                                      |
| Server-rendered courtside routes | No static blocking dependency | Pass                                                        |
| Queue action feedback            |      ≤2 seconds at p95 target | Instrumented; requires preview load fixture                 |
| Match generation/confirmation    |                   ≤30 seconds | Database-transaction bounded; requires preview load fixture |
| Public/server read target        |                 ≤1 second p95 | Slow-read warning enabled at 1,000 ms                       |

The authenticated latency percentiles will be recorded from deterministic preview users in T148/T155. CI fails on functional regressions now and will enforce measured preview percentiles once those fixtures exist.
