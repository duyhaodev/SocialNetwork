FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -Dmaven.test.skip=true -Dspotless.skip=true

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache tzdata
ENV TZ=Asia/Ho_Chi_Minh
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-Duser.timezone=Asia/Ho_Chi_Minh", "-jar", "app.jar", "--spring.profiles.active=docker"]
