# FloodWatch Chennai

**A Community Verified Waterlogging Reporting and Alert System**

Crowd-sourced waterlogging reports for Chennai. Citizens report a waterlogged street with a severity level,
neighbours vote to confirm it, a **Canvas ward map** colours each ward live, and an **alert-service**
microservice raises a street alert once a report is confirmed by **N** people (default N = 3).

21CSE354T Full Stack Web Development – project by **Vijayaragavan S (RA2311003010595)** and
**Hemanth Ragavendra (RA2311003010559)**, guided by Dr. Anita M.

## Architecture

```
React 18 + Vite (:5173)  ── /api/... via Vite proxy ──┐
                                                     │
        ┌───────────────────────────┐   POST /api/alerts/evaluate/{id}   ┌──────────────────────────┐
        │ report-service  :8081     │ ─────────────────────────────────▶ │ alert-service  :8082     │
        │ Spring Boot + Data JPA    │   PUT /api/alerts/street/{id}/...  │ Spring Boot + plain JDBC │
        └─────────────┬─────────────┘                                    └────────────┬─────────────┘
                      └──────────────────── MySQL 8 · floodwatch ──────────────────────┘
                wards · streets · app_users · reports · votes                alerts
```

| Unit | Where it is used |
|------|------------------|
| 1 HTML & CSS | Semantic HTML, CSS variables, Flexbox/Grid, transitions, transforms, keyframe animations, HTML5 Canvas ward map (`frontend/src/components/WardMap.jsx`) |
| 2 JavaScript & React | DOM/canvas events, fetch + async/await, React Router, controlled forms, `useState`, `useEffect`, `useContext`, `useMemo`, `useRef`, `useCallback`, custom hooks `useApi`, `useInterval`, `useLocalStorage` with `useDebugValue` |
| 3 SQL & JDBC | `database/schema.sql`, `database/queries.sql`; joins, GROUP BY/HAVING, sub-queries, UNION/INTERSECT/EXCEPT; alert-service uses `DriverManager`, `Statement`, `PreparedStatement`, `ResultSet` |
| 4 Spring Boot | Two Boot apps, three-tier controller → service → repository, domain model, business rules, JUnit tests |
| 5 Data JPA & Microservices | JPA entities and repositories (derived queries, JPQL), two services communicating over REST with `RestClient` |

## Run it (Windows)

Requirements: **JDK 17+** (the JDK IntelliJ installs in `%USERPROFILE%\.jdks` is found automatically), **Node.js 18+**,
**MySQL 8+** running on port 3306. Maven is **not** needed – each service has the Maven wrapper (`mvnw.cmd`).

1. Start MySQL **8.0.31 or later** (the insights use `INTERSECT` and `EXCEPT`).
   In Command Prompt, set your local credentials:

   ```bat
   set "DB_USER=root"
   set "DB_PASSWORD=your-local-mysql-password"
   ```

   In PowerShell, use `$env:DB_USER = 'root'` and `$env:DB_PASSWORD = 'your-local-mysql-password'`.
   Both services read these environment variables; `.env.example` is a reference and is not loaded automatically.
   The `floodwatch` database, tables and synthetic demo data are created on first start.
2. Run **`start-windows.bat` from that same terminal**. It checks Java, Node.js, MySQL and the ports, then starts
   report-service, waits until it answers, starts alert-service, waits, starts the React client and opens
   http://localhost:5173. The first run downloads libraries and takes a few minutes.
3. Use **Acting as** in the top bar to switch between citizens and ward officials.

Manual start (set the database environment variables in each backend terminal, then run these in three terminals in this order;
the Maven wrapper settings are already included):
```
cd report-service && mvnw.cmd spring-boot:run
cd alert-service  && mvnw.cmd spring-boot:run
cd frontend       && npm install && npm run dev
```
Tests: `mvnw.cmd test` in each service folder. Stop: close the three windows.
Reset demo data: `DROP DATABASE floodwatch;` in MySQL Workbench, then start again.

Local credentials are not stored in the committed configuration. `College-review/`, local environment files,
build output and installed dependencies are excluded from Git.

## Demonstration boundaries

The **Acting as** selector changes the demo user ID; it is not a login or authenticated session.
`report-service` checks the supplied user's role when resolving a report. `alert-service` resolution endpoints
do not enforce a server-side role check; hiding the button in the UI is only demo behaviour.
Closing an alert does not resolve its underlying report, so a later evaluation or startup backfill can reopen it.
The services share one database, and the insight season boundaries are fixed to the supplied demo seasons.

## Verification and source history

On 13 November 2026, both backend modules compiled and their existing JUnit suites passed:
five vote transition tests and five alert level tests. These focused tests do not exercise the database,
HTTP endpoints, concurrent requests or authentication. The screenshots in `docs/screenshots` are supplied
demonstration evidence, not captures from that test run.

On 14 November 2026, the locked frontend dependencies were installed in a clean verification directory
and `npm run build` passed with Vite 5.4.21 (54 modules transformed).

The initial Git history imports an existing classroom project in meaningful component groups.
Commit timestamps record this publication; they do not represent historical sprint dates.

## Demo script (2 minutes)

1. **Live map** – coloured wards, pulsing rings = active alerts, click Pallikaranai for its reports.
2. **Report flooding** – submit a report for Velachery, see validation and the success page.
3. **Verify reports** – filter OPEN, sort “Closest to confirmation”, switch user and click *I see it too*
   until the toast says *Confirmed by 3 neighbours – alert-service notified*. Try voting twice or on your own report.
4. **Alerts** – the new street alert appears; switch to *Zone Officer* and close it.
5. **Insights** – INTERSECT / EXCEPT / UNION panels, click *Show SQL*.

## REST API

| Service | Method & path | Purpose |
|---------|---------------|---------|
| report | `GET /api/wards`, `GET /api/wards/{id}/streets` | Reference data |
| report | `GET /api/wards/summary`, `GET /api/stats` | Map cells and headline numbers |
| report | `GET /api/reports?status=ACTIVE&wardId=` | Report feed with vote counts |
| report | `POST /api/reports` | New report `{streetId,userId,severity,depthCm,description}` |
| report | `POST /api/reports/{id}/votes` | Vote `{userId, voteType: CONFIRM/DENY}` |
| report | `PUT /api/reports/{id}/resolve?userId=` | Official resolves a report |
| report | `GET/POST /api/users` | List / register citizens |
| alert | `POST /api/alerts/evaluate/{reportId}` | Called by report-service |
| alert | `GET /api/alerts?active=true`, `PUT /api/alerts/{id}/resolve` | Alert board |
| alert | `GET /api/insights` | Set-operation analytics |

Demo data (53 localities, 108 streets, 14 users, 64 reports, 97 votes) is synthetic and generated for this project.
The ward grid is schematic, not a survey map.
