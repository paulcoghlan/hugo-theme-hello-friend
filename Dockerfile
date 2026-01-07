# Stage 1: Build the Hugo site
FROM debian:bullseye-slim as builder

# Set environment variables
ENV HUGO_VERSION 0.142.0
ENV NODE_MAJOR 20

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    vim-tiny \
    git \
    ca-certificates \
    gnupg \
    libimage-exiftool-perl

# Install Hugo (detect architecture)
RUN ARCH=$(dpkg --print-architecture) && \
    HUGO_BINARY="hugo_extended_${HUGO_VERSION}_linux-${ARCH}.deb" && \
    curl -L https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/${HUGO_BINARY} -o ${HUGO_BINARY} && \
    apt-get install -y ./${HUGO_BINARY} && \
    rm ${HUGO_BINARY}

# Install Node.js
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    npm install -g yarn

# Clean up
RUN rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /site

# Copy theme files
COPY . /theme-src/

# Copy build script to container
COPY build.sh ./

RUN chmod +x build.sh

# Define build argument with a default value
ARG HUGO_ACTION=build
# Convert ARG to ENV so it's available at runtime
ENV HUGO_ACTION=${HUGO_ACTION}

CMD ["./build.sh"]
