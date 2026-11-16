FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp verify

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/target/alert-service-1.0.0.jar app.jar
USER app
ENV SPRING_PROFILES_ACTIVE=cloud PORT=8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=8 CMD curl -fsS "http://127.0.0.1:${PORT}/api/alerts?active=true" >/dev/null || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
