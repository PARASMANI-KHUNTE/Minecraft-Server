# BEFORE (Likely caused the error):
# FROM eclipse-temurin:17-jre-alpine

# AFTER (FIX): Use Java 21 for compatibility with the latest Minecraft versions
FROM eclipse-temurin:21-jre-alpine

# ... rest of your Dockerfile remains the same ...
WORKDIR /server
COPY . /server
EXPOSE 25565
ENTRYPOINT ["java", "-Xmx1536M", "-Xms1536M", "-jar", "server.jar", "nogui"]