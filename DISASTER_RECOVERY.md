# LifeOS Database Disaster Recovery Runbook

> **Operational Runbook for Production Incidents, Corruption, and Disaster Recovery (NFR-3.3)**  
> Target RPO (Recovery Point Objective): <= 1 minute (via MongoDB Atlas continuous oplog archiving)  
> Target RTO (Recovery Time Objective): <= 30 minutes (cluster restore & application cutover)  
> Document Version: 1.0.0 (Phase 10 Production Readiness)

---

## 1. How do I determine whether the primary DB is unavailable?

1. **Automated Health Check & Monitoring**:
   - Check `/api/v1/health` endpoint. If MongoDB status reports `down` or latency times out (>5000ms), the API returns `503 Service Unavailable`.
   - Inspect **Sentry** alerts for sudden spikes in `MongoServerSelectionError`, `MongoNetworkError`, or connection pool exhaustion.
   - Inspect **MongoDB Atlas Alert Console** / **PagerDuty** for critical alerts:
     - `NO_PRIMARY`: Cluster cannot elect a primary node.
     - `HOST_DOWN`: Multi-AZ node failures exceeding replica quorum.
     - `DISK_FULL`: Storage exhaustion on primary/secondary nodes.
2. **Command-Line Connectivity Verification**:
   ```bash
   # Test direct ping against primary cluster URI (without credentials in history)
   mongosh "$MONGO_URI" --eval "db.adminCommand('ping')" --quiet
   ```
   If the command fails with `ServerSelectionTimeoutError` after 30 seconds across all nodes, declare primary DB unavailable.
3. **Data Corruption or Ransomware Assessment**:
   - If the database is responsive but data has been dropped, ransomware-encrypted, or corrupted by a faulty migration or rogue query:
     - Immediately isolate the database: revoke public application network access via Atlas IP Access List / Security Groups to prevent propagation of corruption.

---

## 2. How do I identify the recovery target?

1. **Incident Triage & Timestamp Determination**:
   - **Scenario A (Accidental Data Deletion / Rogue Migration / Bad Script)**:
     - Query audit logs or application logs via Datadog/CloudWatch for the exact timestamp of the malicious query or migration execution.
     - Target: Set recovery timestamp $T_{\text{target}}$ to **1 minute prior** to the incident timestamp.
   - **Scenario B (Ransomware / Unauthorized Compromise)**:
     - Inspect `AuditLog` collection or web server access logs for the earliest unauthorized admin authentication or exploit event.
     - Target: Set $T_{\text{target}}$ to the last known healthy state before the exploit occurred.
   - **Scenario C (Catastrophic Cloud Provider / Regional Outage)**:
     - Target: The most recent continuous oplog timestamp prior to the outage.
2. **Confirm Timestamp in UTC**:
   - All recovery timestamps must be formatted in ISO-8601 UTC (e.g. `2026-09-07T10:45:00Z`).

---

## 3. How do I restore?

### Option A: Production MongoDB Atlas Native PITR (Standard Production Procedure)

1. **Using Atlas Web Console**:
   - Navigate to **Database Deployments** > Select Cluster > **Backup** tab.
   - Click **Restore Backup** > Select **Point-in-Time Restore**.
   - Enter the exact Point-in-Time target timestamp in UTC.
   - Select Destination:
     - **Staging / Verification Cluster** (Recommended for forensic verification before cutover).
     - OR **Restore In-Place** (Overwrites existing production cluster).
   - Click **Confirm Restore**. Atlas will restore the nearest base snapshot and replay oplog transactions up to the specified minute.
2. **Using MongoDB Atlas CLI**:
   ```bash
   # Create a point-in-time restore job to an isolated recovery cluster
   atlas backup restores start pointInTime \
     --clusterName lifeos-production \
     --pointInTimeUTC "2026-09-07T10:45:00Z" \
     --targetClusterName lifeos-recovery-cluster \
     --targetProjectId "$ATLAS_PROJECT_ID"
   ```

### Option B: Self-Managed / Staging / Tooling Restore (`scripts/restore/restore.ts`)

1. **Locate Verified Snapshot & Manifest**:
   - Identify the backup archive and manifest in storage (e.g. `backups/` or S3):
     ```bash
     ls -la backups/*.manifest.json
     ```
2. **Execute Safe Restoration**:
   - The script automatically verifies the **SHA-256 checksum** against the manifest before initiating `mongorestore` and decrypts AES-256-GCM payloads:
   ```bash
   # Restore into an isolated recovery database (e.g., lifeos_recovery)
   npx tsx scripts/restore/restore.ts \
     --archive=backups/lifeos_backup_lifeos_2026-09-07T10-00-00-000Z.dump.gz.enc \
     --target-db=lifeos_recovery \
     --uri="mongodb://localhost:27017"
   ```
   > **Note**: Restoring over a production database requires passing `--force-production-overwrite` with explicit engineering sign-off.

---

## 4. How do I verify the restored database?

Before directing user traffic to the restored cluster/database, execute automated compatibility and integrity checks:

```bash
# Run the automated application compatibility verification suite
npx tsx scripts/restore/verify-recovery.ts --db=lifeos_recovery
```

**Verification Checklist**:
- [ ] **Mongoose Connection**: API connects cleanly without topology errors.
- [ ] **Authentication**: User credentials and password hashes verify (`bcrypt.compare`).
- [ ] **Core Entity Queries**: Notes, Habits, Events, Goals, and Categories load with full schemas.
- [ ] **Analytics Aggregations**: Complex MongoDB aggregation pipelines (Finance and Productivity) execute and return valid numerical totals.
- [ ] **AI Context Integrity**: Conversations and message history are readable without character encoding corruption.
- [ ] **Index Parity**: All 27 Mongoose model indexes (including compound and unique indexes) are built and operational.
- [ ] **Corruption Absence**: Verify known rogue/corrupted records are completely absent.

---

## 5. How do I point the application at the restored DB?

1. **Update Connection String in Environment**:
   - Update `MONGO_URI` in production secret manager (AWS Secrets Manager, Doppler, or Render/Railway environment configuration) to point to the restored cluster:
     ```env
     MONGO_URI=mongodb+srv://app_user:SECURE_PASSWORD@lifeos-production.xyz.mongodb.net/lifeos?retryWrites=true&w=majority
     ```
2. **Execute Rolling Application Restart**:
   - Trigger a rolling restart of the API services (`lifeos-api` tasks in ECS/Kubernetes or deployment provider).
   - Monitor container boot logs to verify database connection initialization:
     `{"level":30,"msg":"MongoDB connected"}`
3. **Verify API Health**:
   ```bash
   curl -f https://api.lifeos.app/api/v1/health
   ```
   Ensure response returns `{"status":"ok","database":"connected"}`.

---

## 6. What happens to Redis / BullMQ?

### Data Classification & Recovery Matrix:

| Redis Data Category | Durability Policy | Disaster Recovery Action |
| :--- | :--- | :--- |
| **Ephemeral Cache** (API cache, exported reports) | Ephemeral | Intentionally lost. Rebuilds on-demand from database queries. |
| **Pub/Sub** (Socket.IO adapter channels) | Ephemeral | Connections re-establish immediately as clients reconnect. |
| **Rate Limit Counters** (`ratelimit:*`, OCR limits) | Ephemeral | Safely reset to 0; no disruption to legitimate traffic. |
| **BullMQ `lifeos-jobs`** (Reminders, Summaries) | Reconstructable | If Redis was wiped during disaster, reconnecting creates clean queues. Scheduled cron dispatchers (`dispatchDailySummaries`, `dispatchPeriodicRecommendations`) automatically reschedule upcoming work. Pending calendar reminders are reconciled by the reminder sync query. |
| **BullMQ `account-purge`** (Pending account deletions) | Durable in Mongo | `purgeEligibleAccounts()` reads `deletionRequestedAt` directly from MongoDB `User` documents. Zero loss of compliance state occurs if the queue is drained or reset. |

### Reconciliation Step:
If Redis was replaced or wiped, run the BullMQ queue initializer to re-populate recurring timers:
```bash
# Restart API processes — automatic queue bootstrapping registers periodic dispatchers on startup
```

---

## 7. What must be rotated after a disaster?

If the disaster was caused by security compromise, unauthorized access, or database credential leakage:

1. **Database Credentials**:
   - Immediately rotate the MongoDB Atlas database user password in Atlas and update `MONGO_URI`.
2. **Session Secrets**:
   - Rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in API environment. This immediately invalidates all active sessions, forcing users to re-authenticate cleanly.
3. **Third-Party API Keys**:
   - If env files or infrastructure configs were exposed, rotate:
     - Google OAuth Client Secret (`GOOGLE_CLIENT_SECRET`)
     - AI Provider API Keys (`MISTRAL_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`)
     - Web Push VAPID Private Key (`VAPID_PRIVATE_KEY`)
     - Sentry DSN and Transactional Email keys
4. **Backup Encryption Key**:
   - Generate a new 256-bit AES hex key and update `BACKUP_ENCRYPTION_KEY`.

---

## 8. How do I communicate recovery status?

### Internal Status Cadence (Incident Response Team):
- Post updates every **15 minutes** in `#incident-database-recovery` or War Room:
  - **T+0m**: Incident declared, investigation initiated, write access disabled.
  - **T+10m**: Root cause isolated, recovery target timestamp identified ($T_{\text{target}}$).
  - **T+20m**: Restore in progress on isolated staging cluster.
  - **T+25m**: Verification script completed (100% checks passed).
  - **T+30m**: Traffic cutover complete, system operational.

### External Statuspage Updates (for Users):
- **Initial Notice**: *"We are currently investigating a database performance issue affecting LifeOS. Data is safe and team is actively resolving."*
- **During Restore**: *"Emergency maintenance is underway. Access to LifeOS is temporarily paused while we perform system recovery."*
- **Post-Recovery**: *"All systems are restored and fully operational. Zero data loss occurred up to the recovery point. We are continuing to monitor performance."*

---

## 9. What evidence proves recovery succeeded?

A disaster recovery operation is officially declared **SUCCESSFUL** only when the following audit evidence is collected:

1. **Restore Execution Log**:
   - Output from Atlas Cloud Backup or `scripts/restore/restore.ts` confirming exit code `0`, SHA-256 match, and total restored document count.
2. **Compatibility Verification Report**:
   - Output from `verify-recovery.ts` showing all 8 checks passed:
     - `Mongoose Connection: OK`
     - `Authentication against restored data: OK`
     - `Notes query & integrity: OK`
     - `Habits query & streak state: OK`
     - `Analytics aggregation pipeline: OK`
     - `AI Conversation history readable: OK`
     - `Indexes validated across collections: OK`
     - `Database corruption check: CLEAN`
3. **Absence of Malicious/Corrupted Data**:
   - Specific query proving the post-target corrupted records or deletions are absent in the restored database.
4. **API Smoke Test Confirmation**:
   - Successful HTTP `200 OK` from `GET /api/v1/health` and verified user login flow via `POST /api/v1/auth/login`.
