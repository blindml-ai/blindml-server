const Docker = require('dockerode');
const os = require('os')

class DockerModel {
    constructor() {
        const isWindows = os.platform() === 'win32';

        // 윈도우 환경에서 Docker와의 연결 설정
        if (isWindows) {
            // 윈도우에서 Docker Desktop을 사용할 때는 TCP 소켓을 통해 연결
            //"Expose daemon on tcp://localhost:2375 without TLS" 옵션을 활성화합니다.
            //this.docker = new Docker({host: '127.0.0.1', port: 2375});
            this.docker = new Docker();
        } else {
            //this.docker = new Docker();
            // 리눅스 또는 유닉스 환경에서는 UNIX 소켓을 통해 연결
            this.docker = new Docker({socketPath: '/var/run/docker.sock'});

        }
    }

     checkDockerInstalled = async () => {
        try {
            // Docker Daemon 실행 여부 확인
            await this.docker.ping();
            // 성공적으로 응답을 받으면 Docker Daemon이 실행 중임
            return { status: 'success', message: 'Docker Daemon is running.' };
        } catch (error) {
            // 연결 실패 시 처리
            if (error.code === 'ECONNREFUSED') {
                return { status: 'error', message: 'Docker Daemon is not running. Please start Docker.' };
            } else {
                return { status: 'error', message: 'An error occurred: ' + error.message };
            }
        }
    }
    checkDockerStatus = async(containerId) => {
        try {
            const container = this.docker.getContainer(containerId);
            const data = await container.inspect();
            const stat = data.State.Status;
            if(stat == "running") {
                return true
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error checking container status:', error);
            return false;
        }
    }
    checkDockerStatusString = async(containerId) => {
        try {
            const container = this.docker.getContainer(containerId);
            const data = await container.inspect();
            const stat = data.State.Status;
            return stat;
        } catch (error) {
            console.error('Error checking container status:', error);
            return false;
        }
    }
    checkDockerImageExists = async(imageName) =>{

        imageName = imageName +":latest"
        // Docker 이미지 목록을 가져옴
        const images = await this.docker.listImages();
        // 이미지 목록에서 해당 imageName을 가진 이미지를 검색
        const imageExists = images.some(image => {
            return image.RepoTags && image.RepoTags.some(tag => tag === imageName);
        });
        return imageExists;
    }

    waitForDockerImage = async(imageName, timeout = 300000) => {
        const startTime = Date.now();
        while (true) {
            // 이미지 존재 여부 확인
            if (await this.checkDockerImageExists(imageName)) {
                console.log('Docker image is ready:', imageName);
                return true;
            }
            // 현재 시간과 시작 시간의 차이가 timeout보다 크면 중단
            if (Date.now() - startTime > timeout) {
                throw new Error('Timeout waiting for Docker image');
            }
            // 잠시 대기 후 다시 확인
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }


    startDocker = async (real_id) =>{
        try {
            if(real_id) {
                const container = this.docker.getContainer(real_id);
                await container.start();
            } else {
                return {status : 'fail', msg : 'Please upload the model files'}
            }
            return { status : 'success', msg: "Container started successfully" }
        } catch (error) {
            return { status : 'fail', msg: error.message }
        }
    }
    stopDocker = async (real_id) =>{
        try {
            const container = this.docker.getContainer(real_id);
            await container.stop();
            return { status : 'success', msg: "Container stopped successfully" }
        } catch (error) {
            console.log(error.msg)
            return { status : 'fail', msg: "Failed to stop the container" }
        }
    }
    removeDocker = async (container_id) =>{
        try {
            const container = this.docker.getContainer(container_id);
            await container.remove();
            return { status : 'success', message: "Container removed successfully" }
        } catch (error) {
            console.log(error.message)
            return { status : 'fail', message: "Failed to delete the container" }
        }
    }


    getDockerList = async (containerList) => {
        let allContainers;
        try {
            allContainers = await this.docker.listContainers({all: true});
        } catch (error) {
            console.error("Docker에 연결 중 오류 발생:", error);
            // Docker가 실행되지 않는 경우, 모든 컨테이너의 status_code를 -100으로 설정
            return containerList.map(container => ({...container, status_code: -100}));
        }

        // 컨테이너 ID로 실제 컨테이너 상태를 매핑
        const containerStatusMap = allContainers.reduce((acc, container) => {
            acc[container.Id] = container.State;
            return acc;
        }, {});

        // 인자로 받은 배열을 업데이트
        const updatedContainerList = containerList.map(container => {
            // Docker에서 상태 확인
            const dockerState = containerStatusMap[container.realid];
            // 상태에 따라 status_code 업데이트, Docker 상태 맵에 없는 경우 변경 없음
            if (dockerState) {
                switch (dockerState) {
                    case 'running':
                        container.status_code = 500; // RUNNING
                        break;
                    case 'exited':
                        container.status_code = 400; // STOPPED
                        break;
                    case 'created':
                        container.status_code = 310; // CREATE_CONTAINER_FINISH
                        break;
                    default:
                        container.status_code = -500; // RUNNING_ERROR
                        break;
                }
            }
            // Docker 상태 맵에 없는 경우, container는 변경 없이 유지
            return container;
        });

        return updatedContainerList;
    }



}


module.exports = DockerModel