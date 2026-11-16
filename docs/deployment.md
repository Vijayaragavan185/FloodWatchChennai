# Public website deployment

Live demo: **https://floodwatch-chennai-vijay185.up.railway.app**.
It is deployed in Railway's Singapore region with persistent MySQL storage. Only the web
gateway has a public domain; both Java services and MySQL remain private.

The complete live application uses React, both Spring Boot services and a shared MySQL database.
GitHub Pages alone cannot run the Java services or the database. Deploy the four services below
to a container host such as Railway. Only the web gateway receives a public HTTPS domain.

## Services

| Name | Source root | Port | Readiness path | Networking |
| --- | --- | --- | --- | --- |
| MySQL | Official MySQL 8.4 image with a persistent volume | 3306 | Database connection | Private |
| report-service | `/report-service` | 8080 | `/api/stats` | Private |
| alert-service | `/alert-service` | 8080 | `/api/alerts` | Private |
| web | `/frontend` | 8080 | `/health` | Public HTTPS |

Each source directory contains its own Dockerfile, so select the matching root directory when
creating a service from this GitHub repository. Do not add legacy `railway.json` configuration.
Set `PORT=8080` for the three application services. The container builds run the existing backend
tests and the Vite production build. Start MySQL and report-service first, wait for reporting
readiness, then start alert-service so its initial alert backfill sees the reports. Start web last.

## Railway variables

For both Java services, select the `cloud` Spring profile (the Dockerfiles set this automatically).
Use reference variables so secrets remain in the hosting account rather than in Git:

| Variable | Value |
| --- | --- |
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |

For report-service, also set
`ALERT_SERVICE_URL=http://${{alert-service.RAILWAY_PRIVATE_DOMAIN}}:8080`.

For web, set:

| Variable | Value |
| --- | --- |
| `REPORT_SERVICE_URL` | `http://${{report-service.RAILWAY_PRIVATE_DOMAIN}}:8080` |
| `ALERT_SERVICE_URL` | `http://${{alert-service.RAILWAY_PRIVATE_DOMAIN}}:8080` |
| `PUBLIC_DEMO` | `true` |

Enable public networking only on web and generate its HTTPS domain. Do not expose MySQL or
either Java service directly. The browser calls `/api/...` on the same website origin; the web
gateway forwards those requests over the private network, so no localhost URLs or database
credentials are included in the browser bundle. Client-side routes such as `/feed` work when
opened directly. `/health` returns success only when both backend services answer successfully.

Railway requires an authorized connected account. Check the account's available credits and
resource limits before deployment; a free trial is not a promise of permanent free hosting.
The final public URL is assigned by the host after deployment and must be verified then.

The deployed services follow the GitHub `main` branch. Watch paths limit each application to
its own source folder, so documentation-only changes do not rebuild every service.

## MySQL memory settings

The live demo's MySQL container has a 500 MB memory limit. Default MySQL 8.4 buffers
and caches approached that limit and the database restarted, briefly causing `/api/insights`
to return 503. The MySQL service now uses this custom Railway start command:

```text
docker-entrypoint.sh mysqld --innodb-buffer-pool-size=64M --innodb-buffer-pool-chunk-size=64M --innodb-log-buffer-size=16M --max-connections=40 --table-open-cache=256 --table-definition-cache=400 --thread-cache-size=4 --tmp-table-size=16M --max-heap-table-size=16M --temptable-max-ram=32M --performance-schema=OFF
```

Keep `docker-entrypoint.sh` in the Railway command because an image's custom start command
overrides its entrypoint. Docker Compose supplies the same options using `command`, which
keeps the image's default entrypoint. These settings bound the main caches and temporary-table
memory and disable optional Performance Schema SQL instrumentation for this small demo.
Railway's CPU, memory and disk metrics remain available. These settings are not a hard cap
on total MySQL memory. Monitor usage as traffic grows and
adjust resources or concurrency when necessary. The database volume and credentials remain
the same when applying these settings.

The frontend retries GET requests after 0.5, 1 and 2 seconds for network failures or
502/503/504 responses. A lasting outage displays an error and Insights offers **Try again**.
POST and PUT requests are never automatically replayed, preventing duplicate reports or votes.

## Public classroom demo

The container build enables a notice that the shared observations are for demonstration.
Sign in with a provisioned email/password account. Public registration is disabled.
Set `AUTH_ACCOUNTS_JSON` in the web service to a JSON array of accounts with `email`, `salt`,
`hash` (hex scrypt output, 32 bytes), `role`, `fullName` and a synthetic `phone` for citizens.
Never commit credentials. Citizen database rows are created on first successful login;
the officer account maps to an existing OFFICIAL database identity. Password hashes remain
in the hosting environment. Eight-hour opaque sessions are stored in gateway memory and
use Secure HttpOnly SameSite=Strict cookies; logout revokes a session and redeployment
signs users out. GET `/api/auth/me` restores the current session; POST `/api/auth/login`
and POST `/api/auth/logout` manage it. The gateway binds every write to the session user,
blocks unauthenticated writes and requires OFFICIAL for both report and alert closure.
The Java services remain private. Reporting, voting, alerts and insights use MySQL. The gateway
caps writes to 120 per minute per instance, limits request bodies, hides backend errors and
serves static assets with security headers. This is a classroom demo, not an emergency service.

For a local gateway over HTTP, set `COOKIE_SECURE=false` and configure the same account
hashes. Direct Vite-to-Java development does not provide the gateway authentication endpoints.

## Verify the same containers locally

Start Docker Desktop. Set distinct `DB_PASSWORD` and `DB_ROOT_PASSWORD` values in the terminal,
then run `docker compose up --build -d` from the project root. Open `http://localhost:8080`.
Only port 8080 is published; MySQL persists in the `mysql-data` volume. Stop with
`docker compose down` (without `-v`, which would remove the database volume).

Frontend and gateway checks: `npm test --prefix frontend`.

## Make the GitHub source public

An owner can open the repository's **Settings → General → Danger Zone → Change repository
visibility → Public**. Keep `College-review/`, local credentials and generated files excluded.
Source visibility and a deployed website's visitor access are separate settings.
