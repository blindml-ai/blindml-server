const Docker = require('dockerode')
const docker = new Docker();
const fs = require('fs');
const path = require('path');
const tar = require('tar');
const uuid = require('uuid'); // UUID 생성기
const os = require('os')

   async function buildDockerImage(modelData, pythonVersion, requirementsContent) {

        let imageName = modelData.image_name;
        let tempDir = path.join(__dirname, 'temp', uuid.v4());
        try {
            fs.mkdirSync(tempDir, { recursive: true });

            const dockerfilePath = path.join(tempDir, 'Dockerfile');
            const requirementsPath = path.join(tempDir, 'requirements.txt');
            const startServerScriptPath = path.join(tempDir, 'start-server.sh');
            const serverScriptSourcePath = path.join(__dirname, 'concreteml-server.py')
            const serverScriptDestPath = path.join(tempDir, 'blindml_server.py'); // 도커 컨텍스트 내 목적지 파일 경로

            //client.zip, server.zip은 /app/output 폴더에 복제한다
            const outputDir = path.join(tempDir, 'output')
            fs.mkdirSync(outputDir, { recursive: true });
            fs.copyFileSync(modelData.files['client.zip'], path.join(outputDir, 'client.zip'));
            fs.copyFileSync(modelData.files['server.zip'], path.join(outputDir, 'server.zip'));

            // start-server.sh 스크립트 내용
            //const startServerScript = `#!/bin/bash uvicorn blindml_server:app --host 0.0.0.0 --port ${'${SERVER_PORT:-8000}'}`;
            const startServerScript = `#!/bin/bash
python3 /app/blindml_server.py
`;
            // Extract and modify requirements content
            let lines = requirementsContent.split('\n');
            let hasFastapi = false;
            let hasUvicorn = false;
            let hasConcreteML = false;
            let hasHttpx = false;
            let hasNestAsyncio = false;
            let hasPydantic = false;
            let hasPythonMultipart = false; // Add python-multipart flag

            // Update existing dependencies if found

            lines = lines.map(line => {
                if (line.startsWith('fastapi==')) {
                    hasFastapi = true;
                    return 'fastapi>=0.102.0,<0.103.0';
                } else if (line.startsWith('uvicorn==')) {
                    hasUvicorn = true;
                    return 'uvicorn>=0.21.0,<0.22.0';
                } else if (line.startsWith('httpx==')) {
                    hasHttpx = true;
                    return 'httpx>=0.23.0,<0.24.0';
                } else if (line.startsWith('nest-asyncio==')) {
                    hasNestAsyncio = true;
                    return 'nest-asyncio>=1.5.0,<2.0.0';
                } else if (line.startsWith('pydantic==')) {
                    hasPydantic = true;
                    return 'pydantic>=1.10.0,<2.0.0';
                } else if (line.startsWith('python-multipart==')) { // Check for python-multipart
                    hasPythonMultipart = true;
                    return 'python-multipart>=0.0.5,<0.1.0';
                }
                return line;
            });

            
            // Add missing dependencies
            if (!hasFastapi) lines.push('fastapi>=0.102.0,<0.103.0');
            if (!hasUvicorn) lines.push('uvicorn>=0.21.0,<0.22.0');
            if (!hasHttpx) lines.push('httpx>=0.23.0,<0.24.0');
            if (!hasNestAsyncio) lines.push('nest-asyncio>=1.5.0,<2.0.0');
            if (!hasPydantic) lines.push('pydantic>=1.10.0,<2.0.0');
            if (!hasPythonMultipart) lines.push('python-multipart>=0.0.15,<=0.0.17'); // Add python-multipart if missing

            // Rejoin the lines into a single requirements file
            const modifiedRequirementsContent = lines.join('\n');

            // Output the modified requirements for validation or further use
            console.log(modifiedRequirementsContent);

            //TODO : /home/jovyan/output 이 경로는 concreteml-server.py와 동기화 시켜야함
            // Dockerfile, requirements.txt, start-server.sh 작성
            fs.writeFileSync(dockerfilePath, `
FROM ubuntu:22.04

WORKDIR /app

# 비대화식 모드 설정 및 환경 변수 추가
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUSERBASE=/app/python-packages
ENV PATH="/app/python-packages/bin:$PATH"

# 필수 패키지 설치
RUN apt-get update && \\
    apt-get install -y --no-install-recommends \\
    build-essential \\
    cmake \\
    ninja-build \\
    libhwloc-dev \\
    libboost-all-dev \\
    libgmp-dev \\
    rustc \\
    git \\
    curl \\
    pkg-config \\
    libpthread-stubs0-dev \\
    libgoogle-perftools-dev \\
    python3 \\
    python3-pip && \\
    apt-get clean && rm -rf /var/lib/apt/lists/* && \\
    [ ! -e /usr/bin/pip ] && ln -sf /usr/bin/pip3 /usr/bin/pip || echo "/usr/bin/pip already exists" && \\
    [ ! -e /usr/bin/python ] && ln -sf /usr/bin/python3 /usr/bin/python || echo "/usr/bin/python already exists"

# Python 패키지 최신화
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# ASIO 설치
RUN git clone https://github.com/chriskohlhoff/asio.git /asio && \\
    cp -r /asio/asio/include/asio /usr/local/include/ && \\
    cp -r /asio/asio/include/asio.hpp /usr/local/include/

# HPX 설치
RUN git clone --branch stable https://github.com/STEllAR-GROUP/hpx.git /hpx && \\
    mkdir /hpx/build && cd /hpx/build && \\
    cmake -DCMAKE_BUILD_TYPE=Release \\
          -DHPX_WITH_MARCH=core2 \\
          -DHPX_WITH_EXAMPLES=OFF \\
          -DHPX_WITH_NETWORKING=ON \\
          -DHPX_WITH_PARCELPORT_TCP=ON \\
          -DHPX_WITH_THREAD_MANAGER_IDLE_BACKOFF=ON \\
          -DHPX_WITH_FETCH_ASIO=ON \\
          -DAsio_DIR=/usr/local/include \\
          -DBoost_ROOT=/usr/local \\
          -DHPX_WITH_MALLOC=system \\
          -DCMAKE_CXX_FLAGS="-pthread -O2" .. > /hpx/build/cmake_output.log 2>&1 || \\
    { echo "CMake configuration failed! Logs:"; cat /hpx/build/cmake_output.log; exit 1; } && \\
    make -j$(nproc) > /hpx/build/make_output.log 2>&1 || \\
    { echo "Build failed! Logs:"; cat /hpx/build/make_output.log; exit 1; } && \\
    make install

# 환경 변수 설정
ENV CXXFLAGS="-pthread -O2"
ENV CFLAGS="-pthread -O2"

# 프로젝트 복사 및 설치
COPY . /app/

# Python 의존성 설치
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 서버 실행 스크립트 준비
COPY start-server.sh /app/start-server.sh
RUN chmod +x /app/start-server.sh

# 출력 디렉토리 생성 및 권한 설정
RUN mkdir -p /app/output && chmod -R 777 /app/output

# 디버깅용 HPX 로그 활성화
ENV HPX_LOG_LEVEL=debug

# 포트 노출 및 서버 실행
EXPOSE 8000

CMD ["/app/start-server.sh"]
`);
            fs.writeFileSync(requirementsPath, modifiedRequirementsContent);
            fs.writeFileSync(startServerScriptPath, startServerScript);
            fs.copyFileSync(serverScriptSourcePath, serverScriptDestPath);

            const tarballPath = path.join(os.tmpdir(), `${uuid.v4()}.tar`);
            await tar.c({
                gzip: true,
                file: tarballPath,
                cwd: tempDir
            }, ['.']);
            const buildStream = await docker.buildImage(tarballPath, {
                t: imageName,
                platform: 'linux/amd64'
            });
            await new Promise((resolve, reject) => {
                let errorMessages = ""; // 에러 메시지 수집
                docker.modem.followProgress(buildStream, (err, res) => {
                    if (err) {
                        console.error("Error during Docker build process:", err);
                        reject(err);
                        return; // 에러가 있으면 즉시 종료
                    }

                    // 실시간 로그 출력
                    res.forEach((output) => {
                        if (output.stream && typeof output.stream === 'string') {
                            process.stdout.write(output.stream); // 로그를 실시간으로 출력
                            console.log(output.stream.trim()); // 로그를 콘솔에 출력

                        }
                        if (output.errorDetail && output.errorDetail.message) {
                            errorMessages += `${output.errorDetail.message}\n`;
                        }
                    });

                    if (errorMessages.length > 0) {
                        reject(new Error(`Docker build failed with errors:\n${errorMessages}`)); // 에러 메시지와 함께 종료
                    } else {
                        resolve(); // 성공적으로 빌드
                    }
                });
            });

            console.log('Docker image concretemlBuild completed:', imageName);
            return { success: true, message: "" };
        } catch (err) {
            console.error('Error building Docker image:', err);
            return { success: false, message: err };
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }



async function createContainer(modelData, envVariables, gpu_enabled, cpu_cores, ram_gb, port) {

    let deviceRequests = [];
    if (gpu_enabled === 1) {
        deviceRequests.push({
            Driver: 'nvidia', // NVIDIA GPU 드라이버를 사용
            Capabilities: [['gpu']], // GPU 사용을 요청
            Count: -1 // 사용 가능한 모든 GPU에 대한 액세스 요청
        });
    }

    // CPU 코어 수와 RAM 크기를 설정합니다.
    const nanoCpus = cpu_cores * 1e9; // CPU 코어 수를 나노 CPU 단위로 변환
    const memory = ram_gb * 1e9; // GB 단위의 RAM 크기를 바이트 단위로 변환

    try {
        const container = await docker.createContainer({
            Image: (modelData.image_name),
            name: "blindml_server_" + port, // 포트 번호를 포함하여 컨테이너에 고유한 이름을 부여
            Env: envVariables.concat([`SERVER_PORT=${port}`]), // 환경 변수 배열에 동적으로 생성된 포트 추가
            ExposedPorts: { ["80/tcp"]: {} },
            HostConfig: {
                PortBindings: { ["80/tcp"]: [{ HostPort: `${port}` }] }, // 호스트와 컨테이너 간 포트 바인딩
                DeviceRequests: deviceRequests, // GPU 사용 설정
                NanoCpus: nanoCpus, // CPU 코어 수 설정
                Memory: memory, // 메모리 크기 설정
                LogConfig: { // 로깅 드라이버 설정 추가
                    Type: "json-file", // 로깅 드라이버 타입 (예: json-file, none 등)
                    Config: {
                        "max-size": "10m", // 로그 파일 최대 크기
                        "max-file": "3" // 로그 파일의 최대 개수
                    }
                }
            }
        });
        console.log(`Container created on port ${port} with GPU enabled: ${gpu_enabled === 1}, CPU Cores: ${cpu_cores}, RAM: ${ram_gb}GB`);
        return container;
    } catch (error) {
        console.error('Error creating container:', error);
        return false;
    }
}

async function getPortDynamic() {
    const { default: getPort } = await import('get-port');
    return getPort();
}

module.exports = {
    buildDockerImage,
    createContainer,
    getPortDynamic
};


