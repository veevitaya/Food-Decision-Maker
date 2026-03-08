# Analytics Production Requirements

## 1. Data Contracts and Schema Governance
- Freeze canonical event taxonomy with explicit versioning policy.
- Maintain backward compatibility window for old event versions.
- Add migration docs for every schema change.
- Add contract tests between frontend event payloads and API validators.
- Define deprecation flow for event fields and event types.

## 2. Ingestion Reliability and Throughput
- Add queue-based buffering (Kafka/SQS/RabbitMQ) for burst traffic.
- Add retry strategy with dead-letter queue for failed writes.
- Ensure idempotency at storage layer with unique keys and replay-safe writes.
- Validate sustained load (p95/p99 latency, max batch throughput).
- Add backpressure behavior for ingestion overload.

## 3. Data Quality and Validation
- Enforce quality thresholds with hard failures for critical invalid payloads.
- Add daily quality score with trend history and anomaly detection.
- Add automated reconciliation:
  - frontend emitted events vs backend ingested events.
- Add duplicate/out-of-order/late-arrival monitoring.
- Add quality incident classification and triage runbook.

## 4. Storage and Derived Model Hardening
- Move derived analytics to persistent tables/materialized views.
- Add scheduled incremental aggregation jobs.
- Add historical backfill scripts with resume/retry support.
- Partition large event tables by time for query performance.
- Add retention and archive strategy (raw, aggregated, audit data).

## 5. Observability and SLOs
- Define SLOs for:
  - ingest success rate
  - ingestion latency
  - freshness of derived features
  - recommendation response latency
- Add dashboards for pipeline stages:
  - event ingest -> storage -> feature build -> recommendation serving.
- Add alert routing to Slack/Email/PagerDuty with severity levels.
- Add synthetic probes for critical analytics endpoints.

## 6. Security and Compliance
- Enforce role-based authorization at every admin/owner analytics endpoint.
- Apply data minimization and field-level masking for sensitive values.
- Add immutable audit trail for config and access changes.
- Validate privacy rights workflows:
  - export/delete requests propagate to all derived stores.
- Add key rotation process and secret scanning checks.

## 7. Experimentation and Causal Integrity
- Persist assignment, exposure, and outcome events in separate trusted tables.
- Prevent assignment drift across sessions/devices for same user.
- Add experiment guardrails (error rate, latency, regression thresholds).
- Add analysis templates:
  - conversion uplift
  - confidence intervals
  - sample ratio mismatch checks.
- Add automatic experiment stop criteria.

## 8. Recommendation System Maturity
- Define online/offline feature parity tests.
- Add model/heuristic fallback hierarchy and fail-open behavior.
- Add cold-start policy for:
  - new users
  - sparse users
  - new restaurants.
- Track recommendation quality KPIs:
  - CTR, save rate, order-click rate, retention uplift.
- Add drift detection for feature distributions and ranking outputs.

## 9. Operational Readiness
- Document runbooks for:
  - ingestion outage
  - data corruption
  - delayed jobs
  - bad experiment rollout.
- Add one-command recovery for aggregation rebuild.
- Define on-call ownership (primary/secondary).
- Add release gates before deploy:
  - schema checks
  - smoke tests
  - performance budget checks.

## 10. Testing and Release Controls
- Add integration tests for end-to-end analytics flow.
- Add snapshot tests for key admin analytics payloads.
- Add load tests for event batch endpoint and recommendation endpoint.
- Add canary rollout for scoring/experiment changes.
- Add rollback plan validated in staging.

## Production Exit Criteria
- All critical SLOs monitored with live alerts and on-call response.
- Data quality pass rate above agreed threshold for 30 consecutive days.
- Recommendation and experiment pipelines have reproducible auditability.
- Privacy/compliance workflows verified against live data stores.
- Incident recovery procedures validated in at least one drill.
