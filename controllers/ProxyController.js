const axios = require('axios');
const UserModel = require('../models/UserModel')
const ContainerModel = require('../models/ContainerModel')
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const os = require('os')
const FormData = require('form-data');


//TODO : MAKE CSEM VERSION

class ProxyController {
    constructor() {
        this.userModel = new UserModel();
        this.containerModel = new ContainerModel();
        this.dockerServerUrl = process.env.DOCKER_SERVER; // .env 파일에서 Docker 서버 URL 로드
        this.servicePort = process.env.SERVICE_PORT;
    }

    /**
     * Handles proxy request for initializing Concrete ML container.
     * Validates API key and forwards the request to the Docker server.
     */
    postConcreteMLInit = async (req, res) => {
        try {
            // 헤더에서 Authorization 값 추출
            const apiKey = req.headers.authorization?.replace("Bearer ", "");
            const containerId = req.params.container_id;
            const payloadData = req.body;

            if (!apiKey || !containerId) {
                return res.status(400).json({ success: false, message: "Missing API Key or Container ID" });
            }

            // 1. 적법성 검증
            const authResponse = await this.searchContainerPort(apiKey, containerId);

            if (!authResponse.success) {
                return res.status(401).json({ success: false, message: "Authentication failed" });
            }

            const port = authResponse.port;

            // 2. 도커 서버로 요청 프록시
            const dockerUrl = `${this.dockerServerUrl}:${port}/init`;

            // 요청 보내기
            const response = await axios.post(dockerUrl, payloadData, {
                headers: { Authorization: `Bearer ${apiKey}` },
                responseType: 'arraybuffer', // 바이너리 및 JSON 데이터 모두 처리 가능
            });

            // Content-Type 확인 및 응답 처리
            const contentType = response.headers['content-type'];
            const pythonVersion = response.headers['x-python-version']
            const libraryName = response.headers['x-library-name']
            const libraryVersion = response.headers['x-library-version']

            res.setHeader('X-Python-Version', pythonVersion || '3.8');
            res.setHeader('X-Library-Name', libraryName || 'concrete-ml');
            res.setHeader('X-Library-Version', libraryVersion || '1.4.0');

            if (contentType.includes('application/json')) {
                // JSON 응답 처리
                const jsonString = Buffer.from(response.data).toString('utf-8'); // ArrayBuffer → 문자열
                const jsonData = JSON.parse(jsonString); // 문자열 → JSON 객체
                console.log('JSON Response:', jsonData);
                return res.status(response.status).json({ data: jsonData }); // JSON 데이터 반환
            } else if (contentType.includes('application/zip')) {
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', 'attachment; filename="client.zip"');
                return res.status(response.status).send(response.data);
            } else {
                throw new Error(`Unexpected Content-Type: ${contentType}`);
            }
        } catch (error) {
            console.error("Proxy error:", error.message);

            // 응답이 있는 경우 상태 코드와 메시지 반환
            if (error.response) {
                return res.status(error.response.status).json({
                    success: false,
                    message: error.response.statusText,
                    error: error.response.data,
                });
            }

            // 예외 발생 시
            return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        }
    };

    /**
     * Handles proxy request for prediction using Concrete ML container.
     * Processes multipart form data and forwards it to the Docker server.
     */
    postConcreteMLPredict = async (req, res) => {
        try {
            const apiKey = req.headers.authorization?.replace("Bearer ", "");
            const containerId = req.params.container_id;

            if (!apiKey || !containerId) {
                return res.status(400).json({ success: false, message: "Missing API Key or Container ID" });
            }

            // 인증 및 포트 검색
            const authResponse = await this.searchContainerPort(apiKey, containerId);
            if (!authResponse.success) {
                return res.status(401).json({ success: false, message: "Authentication failed" });
            }

            const port = authResponse.port;
            const dockerUrl = `${this.dockerServerUrl}:${port}/predict`;

            // 요청 데이터를 multipart/form-data로 변환
            const formData = new FormData();

            if (req.files['EncryptedData']) {
                formData.append(
                    'encrypted_data',
                    fs.createReadStream(req.files['EncryptedData'][0].path),
                    'encrypted_data.bin'
                );
            }

            if (req.files['EvaluationKey']) {
                formData.append(
                    'evaluation_key',
                    fs.createReadStream(req.files['EvaluationKey'][0].path),
                    'serialized_evaluation_keys.ekl'
                );
            }

            // 추가 필드 처리 (옵션)
            for (const key in req.body) {
                formData.append(key, req.body[key]);
            }

            // 도커 컨테이너로 요청
            const response = await axios.post(dockerUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                    Authorization: `Bearer ${apiKey}`,
                },
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            console.error("Proxy Predict Error:", error.message);
            res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        }
    };
    /**
     * Handles proxy request to reset Concrete ML container.
     */
    postConcreteMLReset = async (req, res) => {
        try {
            const apiKey = req.headers.authorization?.replace("Bearer ", "");
            const containerId = req.params.container_id;

            if (!apiKey || !containerId) {
                return res.status(400).json({ success: false, message: "Missing API Key or Container ID" });
            }

            // 인증 및 포트 검색
            const authResponse = await this.searchContainerPort(apiKey, containerId);
            if (!authResponse.success) {
                return res.status(401).json({ success: false, message: "Authentication failed" });
            }

            const port = authResponse.port;
            const dockerUrl = `${this.dockerServerUrl}:${port}/reset`;

            // JSON 데이터 전송
            const response = await axios.post(dockerUrl, req.body, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            console.error("Proxy Reset Error:", error.message);
            res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        }
    };

    /**
     * Validates API key and retrieves the container's assigned port.
     */
    searchContainerPort = async (apiKey, containerId) => {
        try {
            const user = await this.userModel.getUserByApikey(apiKey); // 비동기 처리
            const user_id = user?.id; // null-safe 연산자 추가

            if (!user_id) {
                return { success: false, message: "Invalid API key" };
            }

            const container_data = await this.containerModel.getContainerDetail(user_id, containerId); // 비동기 처리

            if (container_data) {
                return { success: true, message: "Authentication Success", port: container_data.port };
            }

            return { success: false, message: "Container not found" };

        } catch (e) {
            console.error("Error in getContainerPort:", e.message);
            return { success: false, message: "Internal server error" };
        }
    };
}

module.exports = ProxyController;
