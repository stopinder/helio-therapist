# Temporary build dependency advisory exception

Reviewed 17 November 2026; expires automatically at 00:00 UTC on 24 November 2026.

Advisory: https://github.com/advisories/GHSA-fc5q-39xc-vjpf (CVE-2026-112366).
Upstream reports no patched version. The installed latest release is picomatch 4.0.7.

The vulnerable path accepts attacker-supplied repeated extglob patterns and can exhaust a Node process through regular-expression backtracking. In this application picomatch and its affected dependents are development dependencies only (npm ls picomatch --omit=dev is empty). Build glob patterns come from checked-in Vite/Tailwind/test configuration; they do not come from client records, transcripts, request parameters or uploaded filenames. The production SPA and API code do not import this package. Production build input is the reviewed repository, not arbitrary user-authored glob patterns.

The release retains npm's complete audit and rejects any finding other than this exact advisory and its dependency chain when every affected lockfile node is marked dev-only. It fails closed on incomplete reports, audit failures, a runtime dependency, another advisory, dependency cycles or expiry. The independent CI runtime audit remains unchanged. This is risk acceptance for trusted build inputs, not a claim the dependency is patched or the raw full audit is clean. Do not use this exception for public development servers or services accepting glob patterns. Remove it when an upstream fix exists; review any renewed exception explicitly.

A previous prebuild gate treated development-only findings as production vulnerabilities even though the existing Quality workflow already distinguishes strict runtime auditing from informational development auditing. This bounded exception allows this clinical bug fix to build without downgrading tools, suppressing all audits or changing the runtime safety gate.
