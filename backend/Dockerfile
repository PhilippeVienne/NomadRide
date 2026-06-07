# Stage 1: Build ecCodes binaries on Amazon Linux 2023 (same OS as Lambda runner)
FROM public.ecr.aws/lambda/nodejs:22 AS eccodes-builder

USER root
RUN dnf update -y && \
    dnf install -y gcc gcc-c++ make cmake wget tar gzip libpng-devel libjpeg-turbo-devel git

WORKDIR /tmp
RUN git clone --depth 1 https://github.com/ecmwf/ecbuild.git && \
    mkdir -p ecbuild/build && cd ecbuild/build && \
    cmake .. -DCMAKE_INSTALL_PREFIX=/usr/local && \
    make install

RUN wget https://github.com/ecmwf/eccodes/archive/refs/tags/2.34.0.tar.gz -O eccodes-2.34.0.tar.gz && \
    tar -xzf eccodes-2.34.0.tar.gz && \
    mkdir build && cd build && \
    cmake ../eccodes-2.34.0 \
      -DCMAKE_INSTALL_PREFIX=/usr/local \
      -DENABLE_PYTHON=OFF \
      -DENABLE_FORTRAN=OFF \
      -DENABLE_NETCDF=OFF \
      -DENABLE_AEC=OFF && \
    make -j$(nproc) && \
    make install

# Stage 2: App Builder
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 3: Production Runtime
FROM public.ecr.aws/lambda/nodejs:22 AS runner

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy compiled ecCodes binaries, libraries, and sharing resources
COPY --from=eccodes-builder /usr/local/bin/grib* /usr/local/bin/
COPY --from=eccodes-builder /usr/local/lib/libeccodes* /usr/local/lib/
COPY --from=eccodes-builder /usr/local/share/eccodes /usr/local/share/eccodes

# Configure system paths for dynamic linking
ENV LD_LIBRARY_PATH=/usr/local/lib:${LD_LIBRARY_PATH}
ENV PATH=/usr/local/bin:${PATH}

# Copy the bundled files
COPY --from=builder /app/dist ./dist

# Default to the handler
CMD ["dist/lambda.handler"]
