#!/usr/bin/env bash
# test-limit-signatures.sh — pins the spend-limit signature matcher (Phase SQ D1).
#
# Run from the career-ops root:  bash batch/tests/test-limit-signatures.sh
# Exits 0 only if every assertion passes; nonzero on the first failure.
#
# Part A (this file, Step 1): asserts the D1 ERE directly, applied case-insensitively
# via `grep -Eiq`, against the recorded spend/session/usage-limit strings plus two
# negative anchors (a green-build line and the adjacent transient rate-limit class).
#
# Self-test (D1 / plan Done-when): deleting the `spend` alternation from SESSION_LIMIT_ERE
# below makes positives #1 and #2 ("...monthly spend limit") stop matching, so the run
# exits nonzero — i.e. the test can go red. Part B (Step 2) extends this with a
# function-level smoke against the real is_session_limit_log() in batch/batch-runner.sh.

set -u

# The D1 signature matcher, shared with /build-queue's spend canary/park and with
# is_session_limit_log() in batch/batch-runner.sh. Update all copies together.
SESSION_LIMIT_ERE='(session|usage|spend)[[:space:]]+limit|limit[[:space:]]+reached|resets [0-9:]+[ap]m'

fail=0

# match EXPECTED STRING — assert grep -Eiq result against the ERE.
#   EXPECTED = "match"    -> string MUST match the ERE
#   EXPECTED = "no-match" -> string MUST NOT match the ERE
match() {
  local expected="$1"; shift
  local str="$1"
  if printf '%s' "$str" | grep -Eiq "$SESSION_LIMIT_ERE"; then
    got="match"
  else
    got="no-match"
  fi
  if [ "$got" != "$expected" ]; then
    printf 'FAIL: expected %-8s got %-8s for: %s\n' "$expected" "$got" "$str" >&2
    fail=1
  else
    printf 'ok  : %-8s : %s\n' "$got" "$str"
  fi
}

# --- Positive set (recorded spend/session/usage-limit signatures) ---
match match 'All 4 Step-3 review subagents failed with "You'\''ve hit your monthly spend limit" (claude.ai/settings/usage).'
match match "You've hit your monthly spend limit"
match match "Session limit reached - resets 3pm"
match match "You have reached your usage limit"
match match "limit  reached"        # double space exercises [[:space:]]+
match match "resets 4:30pm"

# --- Negative anchors ---
match no-match "test suite passed; 125 tests green, merged cleanly"          # red-on-garbage anchor
match no-match "rate limit exceeded, too many requests (429)"                # adjacent class: is_rate_limit_log's jurisdiction

if [ "$fail" -ne 0 ]; then
  echo "test-limit-signatures.sh: FAILED" >&2
  exit 1
fi
echo "test-limit-signatures.sh: all signature assertions passed"
exit 0
