# Public website deployment

The complete live application uses React, both Spring Boot services and a shared MySQL database.
GitHub Pages alone cannot run the Java services or the database. Deploy the four services below
to a container host such as Railway. Only the web gateway receives a public HTTPS domain.

## Services

| Name | Source root | Port | Readiness path | Networking |
| --- | --- | --- | --- | --- |
| MySQL | Official MySQL 8.4 image with a persistent volume | 3306 | Database connection | Private |
| report-service | `/report-service` | 8080 | `/api/stats` | Private |
| alert-service | `/alert-service` | 8080 | `/api/alerts?active=true` | Private |
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

## Public classroom demo

The container build enables a notice that the shared data and identities are for demonstration.
Use the supplied synthetic identities. Registration is disabled at both the UI and gateway
in this public mode to avoid collecting visitors' real phone numbers. Reporting, voting,
alert resolution and insights continue to use the real Java services and MySQL. Existing
role selection remains demonstration behavior rather than authenticated access. The gateway
caps writes to 120 per minute per instance, limits request bodies, hides backend errors and
serves static assets with security headers. This is a classroom demo, not an emergency service.

Local Vite development keeps registration available. If deploying a private authenticated
environment instead, rebuild with `VITE_PUBLIC_DEMO=false` and set `PUBLIC_DEMO=false` in web.

## Verify the same containers locally

Start Docker Desktop. Set distinct `DB_PASSWORD` and `DB_ROOT_PASSWORD` values in the terminal,
then run `docker compose up --build -d` from the project root. Open `http://localhost:8080`.
Only port 8080 is published; MySQL persists in the `mysql-data` volume. Stop with
`docker compose down` (without `-v`, which would remove the database volume).

Gateway checks: `node --test frontend/server.test.mjs`.

## Make the GitHub source public

An owner can open the repository's **Settings → General → Danger Zone → Change repository
visibility → Public**. Keep `College-review/`, local credentials and generated files excluded.
Source visibility and a deployed website's visitor access are separate settings.
