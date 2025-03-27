const ContainerModel = require('../models/ContainerModel')
const DockerModel = require('../models/DockerModel')
const QueryModel = require('../models/QueryModel')
const LogModel = require('../models/LogModel')
const concreteml = require('../libraries/concreteml/concreteml-buildx');
const UUIDV4  = require('uuidv4');
const fs = require('fs').promises;
require('dotenv').config();


class ContainerController {

    constructor() {
        this.serviceUrl = process.env.SERVICE_SERVER;
        this.servicePort = process.env.SERVICE_PORT
        this.cm = new ContainerModel()
        this.dm = new DockerModel()
        this.logger = new LogModel();
        this.query = new QueryModel()
    }
    /**
     * Fetch users for autocomplete functionality.
     * Retrieves users whose email or nickname match the search query.
     */
    getUsersForAutoComplete = async (req,res) => {
        const searchQuery = req.query.search
        if (!searchQuery) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        try {
            const users = await this.query.prepareLikeAll("SELECT id, profile, nickname, email FROM user WHERE email LIKE ? OR nickname LIKE ?", searchQuery);
            res.json({ users });
        } catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Display the container creation page with available security levels.
     * Redirects to sign-in if the user is not authenticated.
     */
    getCreate = async (req,res) => {
        if(!req.session.user) {
            res.redirect("/users/signin")
        }
        try {
            var rows = await this.query.selectAllQuery('SELECT * FROM security', []);
            res.render('container/container_create', { securityLevels: rows });
        }catch(e) {
            console.error(e.message);
            res.send('Error fetching security levels');
            return;
        }

    }
    /**
     * Handle container creation.
     * Generates a new container, assigns resources, and prepares it for execution.
     */
    postCreate = async (req, res) => {
        const container_uuid = UUIDV4.uuid();
        const STATUS_CODES = await this.cm.listStatus();
        const server_url = `${req.protocol}://${req.headers.host}`;

        //TODO : 도커서버가 분리된다는 시나리오에서, 현재 메인서버가아닌 도커서버의 다이나믹 포트여야 한다.
        const port = await concreteml.getPortDynamic();

        try {
            if (!req.session.user) {
                res.redirect('/users/signin');
                return;
            }

            const pythonVersion = '3.8'; //TODO: HARD CODING
            const {
                name, desc, cpu, ram, gpuEnabled, securityLevel,
                visibility, fheLib, fheVersion, requirements,
                whitelist, blacklist, tags, version
            } = req.body;

            const parsedCpu = parseInt(cpu, 10);
            const parsedRam = parseInt(ram, 10);
            const parsedSecurityLevel = parseInt(securityLevel, 10);
            const gpuEnabledInt = gpuEnabled === 'on' ? 1 : 0;

            // 모델 데이터 준비
            const modelData = {
                fhe_lib: fheLib,
                fhe_lib_version: fheVersion,
                model_name: name,
                requirements,
                image_name: "blindml/" + name.toLowerCase(),
                files: {
                    'client.zip': req.files.find(file => file.originalname === 'client.zip')?.path,
                    'server.zip': req.files.find(file => file.originalname === 'server.zip')?.path,
                    'serialized_processing.json': req.files.find(file => file.originalname === 'serialized_processing.json')?.path
                }
            };

            // 컨테이너 데이터셋 구성
            const dataset = {
                container_uuid,
                name,
                fheLib,
                fheVersion,
                requirements,
                desc,
                parsedCpu,
                parsedRam,
                gpuEnabledInt,
                parsedSecurityLevel,
                visibility,
                modelDataString: JSON.stringify(modelData),
                tags,
                version,
                email: req.session.user.email,
                whitelist,
                blacklist,
                user_id: req.session.user.id,
                port : port
            };

            // 컨테이너 데이터 저장
            const model_id = await this.cm.createTransaction(dataset);
            res.json({ success: true, message: 'Container and model data are stored successfully.', container_id: container_uuid });

            await this.cm.updateContainerStatus(container_uuid, STATUS_CODES.READY.code);

            // FHE 파일 및 requirements.txt가 업로드된 경우 처리
            if (requirements && req.files.length > 0) {
                // 도커 설치 여부 확인
                const docker_check = await this.dm.checkDockerInstalled();

                if (false) {
                    await this.cm.updateContainerStatus(container_uuid, STATUS_CODES.NO_DOCKER.code);
                    res.json({ success: false, message: docker_check.message, container_id: container_uuid });
                    return;
                } else {
                    if (fheLib === "concrete-ml") {


                        const clientZipBase64 = modelData.files['client.zip']
                            ? await fs.readFile(modelData.files['client.zip'], { encoding: 'base64' })
                            : '';
                        const serverZipBase64 = modelData.files['server.zip']
                            ? await fs.readFile(modelData.files['server.zip'], { encoding: 'base64' })
                            : '';


                        // 도커 이미지 생성 중 상태 업데이트
                        await this.cm.updateContainerStatus(container_uuid, STATUS_CODES.BUILDING_IMAGE.code);
                        const buildnow = await concreteml.buildDockerImage(modelData, pythonVersion, requirements);

                        // 빌드 에러 발생 처리
                        if (buildnow.success == false) {
                            await this.cm.updateContainerStatus(container_uuid, STATUS_CODES.BUILD_IMAGE_ERROR.code);
                            throw new Error(buildnow.message);
                        }

                        await this.cm.updateContainerStatus(container_uuid, STATUS_CODES.BUILD_IMAGE_FINISH.code);


                        // 컨테이너 생성
                        const envVariables = [
                            `CONTAINER_ID=${container_uuid}`,
                            `MODEL_ID=${model_id}`,
                            `CLIENT_ZIP=${clientZipBase64}`,
                            `SERVER_ZIP=${serverZipBase64}`,
                            `AUTH_SERVER_URL=${server_url}/auth/container/verify_access`,
                            `PYTHON_VERSION=${pythonVersion}`,
                            `LIBRARY_VERSION=${fheVersion}`,
                            `LIBRARY_NAME=${fheLib}`
                        ];


                        await this.cm.updateContainerStatus(container_uuid, STATUS_CODES.CREATING_CONTAINER.code);

                        // 도커 이미지 체크
                        await this.dm.waitForDockerImage(modelData.image_name);

                        // 컨테이너 생성 및 실행
                        const container = await concreteml.createContainer(modelData, envVariables, gpuEnabledInt, parsedCpu, parsedRam, port);
                        if (container) {
                            await this.cm.updateContainerStatus(container_uuid, STATUS_CODES.CREATE_CONTAINER_FINISH.code);
                            await this.cm.updateContainerRealId(container_uuid, container.id);

                            const container_check = await this.dm.checkDockerStatus(container.id);
                            if (container_check) {
                                await this.cm.startContainer(container.id);
                                await this.cm.updateContainerStatus(container_uuid, STATUS_CODES.RUNNING.code);
                            } else {
                                await this.cm.updateContainerStatus(container_uuid, STATUS_CODES.STOPPED.code);
                            }
                        } else {
                            throw STATUS_CODES.CREATE_CONTAINER_ERROR.description;
                        }
                    }
                }
            }
        } catch (error) {
            const current_status = await this.cm.getCurrentContainerStatus(container_uuid);
            await this.cm.updateContainerStatus(container_uuid, current_status < 0 ? current_status : -current_status);

            const log_object = { level: 'ERROR', message: error.message, detail: "", user_id: req.session.user.id };
            await this.logger.insertLog(log_object);
        }
    };
    /**
     * Get container status.
     * Fetches the current status of a container by its ID.
     */
    postStatus = async (req,res) =>{
        if(!req.session.user) {
            res.redirect("/users/signin")
        }
        const {container_id} = req.body
        try {
            var status_obj = await this.query.selectQuery(`SELECT * from container_status where code = (SELECT status_code from container where id=?)`, [container_id]);
            var error_log ="";
            if(status_obj.code < 0) {
                error_log = await this.logger.getLogByUserIdLastone(req.session.user.id);
            }
            res.status(200).json({code : status_obj.code, description :status_obj.description, container_id : container_id, error_log : error_log})
        }catch(e) {
            res.status(500).json({code : -1})
        }
    }
    /**
     * Retrieve detailed information about a specific container.
     */
    getContainerDetail = async (req,res) =>{
        try {
            const { container_id } = req.params;
            var user_id = req.session.user ? req.session.user.id : -1; // Updated line
            if(user_id == -1) {
                res.render('common/access-denied', {message : 'You need to sign in'})
                return;
            }
            const loggedIn = true;
            var row = await this.cm.getContainerDetail(user_id, container_id)
            for(var i=0; i < row.length; i++) {
                await this.cm.updateContainerStatus(row[i]['id'], row[i]['status_code'])
            }

            let endpoint = this.serviceUrl +":"+ this.servicePort + "/proxy/"
            if(row.fhe_lib === "concrete-ml") {
                endpoint += "cm/"
            }
            endpoint += container_id;

            var security_levels = await this.query.selectAllQuery('SELECT * FROM security', []);
            res.render('container/container_detail', { container: row, securityLevels : security_levels, user_id: user_id, nickname : req.session.user.nickname, endpoint : endpoint, loggedIn : true });
        }catch(e){
            console.error(e.message);
        }
    }
    /**
     * Edit a container
     */
    getContainerEdit = async (req,res) =>{
        try {
            if(!req.session.user) {
                res.redirect('users/signin')
            }
            const { container_id } = req.params;
            var user_id = req.session.user.id;
            const sql = `SELECT c.id, u.id as user_id, u.nickname, u.email, c.owner, c.name, c.desc, c.cpu, c.ram, c.gpu_enabled, c.visibility, c.security, c.tags, c.version, c.status_code, c.insert_time, c.update_time, m.fhe_lib, m.fhe_lib_version,m.data as model_data, EXISTS (SELECT 1 FROM user_container AS uc WHERE uc.user_id = ? AND uc.container_id = c.id) AS is_user_container_linked FROM container AS c JOIN user AS u ON c.owner = u.id JOIN model AS m ON c.model = m.id WHERE c.id = ?`
            var row = await this.query.selectQuery(sql, [user_id, container_id])
            if(row.owner !== user_id) {
                res.render('common/access-denied', {message : 'You are not the owner of this container'})
            }

            var security_levels = await this.query.selectAllQuery('SELECT * FROM security', []);
            res.render('container/container_edit', { container: row, securityLevels : security_levels, user_id: user_id });
        }catch(e){
            console.error(e.message);
        }
    }
    /**
     * Start a container.
     * Initiates the execution of a Docker container based on its real ID.
     */
    postStartContainer = async (req, res) => {
        try {
            const containerRealId = await this.query.selectQuery(`SELECT realid FROM container WHERE id=?`, [req.params.container_id]);
            const result = await this.dm.startDocker(containerRealId.realid);

            if (result.status !== "success") {
                return res.status(500).send({ status: 'fail', message: result.msg });
            }

            // 도커 start 명령이 성공한 후, 도커 상태 체크
            const finalStatus = await this.dm.checkDockerStatusString(containerRealId.realid);

            if (!finalStatus) {
                return res.status(500).send({ status: 'fail', message: 'An error occurred' });
            }

            // 도커 상태에 따른 응답 처리
            const statusResponse = {
                'running': { code: 200, message: "The container is running" },
                'paused': { code: 500, message: "The container is paused" },
                'created': { code: 500, message: "The container is not started" },
                'exited': { code: 500, message: "The container is exited" },
                'dead': { code: 500, message: "The container is dead" }
            };

            const response = statusResponse[finalStatus] || { code: 500, message: 'Unknown status' };
            res.status(response.code).send({ status: 'success', message: response.message });

        } catch (error) {
            res.status(500).send({ status: 'fail', message: error.message });
        }
    };
    /**
     * Stop the container
     */
    postStopContainer = async (req,res) =>{
        try {
            const containerRealId = await this.query.selectQuery(`SELECT realid FROM container WHERE id=?`, [req.params.container_id]);
            const result = await this.dm.stopDocker(containerRealId.realid);

            if (result.status !== "success") {
                return res.status(500).send({ status: 'fail', message: result.msg });
            }

            // 도커 start 명령이 성공한 후, 도커 상태 체크
            const finalStatus = await this.dm.checkDockerStatusString(containerRealId.realid);

            if (!finalStatus) {
                return res.status(500).send({ status: 'fail', message: 'An error occurred' });
            }

            // 도커 상태에 따른 응답 처리
            const statusResponse = {
                'running': { code: 200, message: "The container is running" },
                'paused': { code: 500, message: "The container is paused" },
                'created': { code: 500, message: "The container is not started" },
                'exited': { code: 500, message: "The container is exited" },
                'dead': { code: 500, message: "The container is dead" }
            };

            const response = statusResponse[finalStatus] || { code: 500, message: 'Unknown status' };
            res.status(response.code).send({ status: 'success', message: response.message });

        } catch (error) {
            res.status(500).send({ status: 'fail', message: error.message });
        }
    }
    /**
     * Remove the container
     */
    postRemoveContainer = async (req,res) =>{
        try {
            if(!req.session.user) {
                res.status(403).send({message : 'You need to sign in'})
            }
            else {
                var container_id = req.params.container_id;
                var isValid = await this.cm.checkValidUser(req.session.user.id, container_id)
                if(isValid) {
                    try {
                        var container_data = await this.cm.selectContainer(container_id)
                        //디비 삭제
                        await this.cm.deleteContainer(container_id)
                        //도커 삭제는 실패할 수 있다.
                        var docker_remove = await this.dm.removeDocker(container_data.realid);
                        res.status(200).send({status: 'success', message:'Container has beend deleted successfully', docker : docker_remove})
                    }catch(e) {
                        res.status(500).send({status:'error', message : 'Failed to delete container'})
                    }

                } else {
                    res.status(403).send({status : 'error', message : 'You are not the owner of this container'})
                }
            }

        } catch (error) {
            res.status(500).send({ status : 'error', error: error.message });
        }
    }

    /**
     * Subscribe the container
     */
    postSubscribe = async(req,res) => {
        try {
            if(!req.session.user) {
                res.status(403).send({message : 'You need to sign in'})
                return;
            }

            const { container_id, action } = req.body;
            const user_id= req.session.user.id


            // Check if container_id and action are provided
            if (!container_id || !action) {
                return res.status(400).json({ error: 'Missing container_id or action' });
            }

            const subscriptions = await this.cm.getSubscriptionStatus(container_id, user_id)

            // Perform subscription or unsubscription
            if (action === 'subscribe' && subscriptions.subscribed != 1) {
                await this.cm.subscribe(container_id,user_id)
                subscriptions.subscribed = true;
                subscriptions.subscribersCount += 1;

                return res.status(200).send({ success: true, newSubscriberCount: subscriptions.subscribersCount });
            } else if (action === 'unsubscribe' && subscriptions.subscribed == 1) {
                await this.cm.unsubscribe(container_id,user_id)
                subscriptions.subscribed = false;
                subscriptions.subscribersCount -= 1; // Decrement count
                return res.status(200).send({ success: true, newSubscriberCount: subscriptions.subscribersCount });
            } else {
                return res.status(400).json({ error: 'Invalid action or already in desired state' });
            }

        }catch(e) {
            res.status(500).send({status:'error', error: e.message})
        }
    }

}

module.exports = ContainerController