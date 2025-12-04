# Start with the official Java Runtime Environment (JRE) for stability
FROM eclipse-temurin:17-jre-alpine

# Set the working directory where the server will run
WORKDIR /server

# Copy all files from your local folder (server.jar, eula.txt, server.properties) 
# into the /server directory in the container
COPY . /server

# Expose the default Minecraft port 
EXPOSE 25565

# Define the command to execute when the container starts.
# -Xmx/-Xms set the maximum/minimum RAM dedicated to the Java application.
# Replace 'server.jar' with your actual server file name (e.g., paper-1.20.4.jar)
CMD ["java", "-Xmx2G", "-Xms2G", "-jar", "server.jar", "nogui"]