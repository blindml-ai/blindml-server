const { exec } = require('child_process');
const fs = require('fs');

const NODE_PATH = 'server.js'; // 실행할 Node.js 파일 경로
const START_PORT = 4000; // 시작 포트 번호
const HAPROXY_CONFIG_PATH = '/etc/haproxy/haproxy.cfg'; // HAProxy 설정 파일 경로

function startServers(instanceCount) {
    const ports = [];

    console.log(`Starting ${instanceCount} server instances...`);

    for (let i = 0; i < instanceCount; i++) {
        const port = START_PORT + i;
        ports.push(port);

        const command = `PORT=${port} node ${NODE_PATH}`;
        exec(command, { env: { ...process.env, PORT: port } }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error starting server on port ${port}:`, error.message);
            } else {
                console.log(`Server started on port ${port}`);
                console.log(stdout);
            }
        });
    }

    return ports;
}


function configureHAProxy(ports) {
    console.log('Configuring HAProxy...');
    const haproxyConfig = `
global
    log /dev/log local0
    log /dev/log local1 notice
    maxconn 50000
    daemon

defaults
    maxconn 30000
    log     global
    option  httplog
    option  dontlognull
    timeout connect 50000ms
    timeout client  500000ms
    timeout server  500000ms

frontend http_front
    mode http
    bind *:5000
    default_backend http_back
    
listen stats
    mode http
    bind *:8080
    stats enable
    stats uri /
    stats refresh 10s

backend http_back
    mode http
    balance roundrobin
    option httpchk GET /health
${ports.map((port, index) => `    server node${index + 1} 127.0.0.1:${port} maxconn 30000 check`).join('\n')}
  \n`; // 마지막 줄바꿈 추가

    fs.writeFileSync(HAPROXY_CONFIG_PATH, haproxyConfig);
    console.log('HAProxy configuration updated.');

    exec('sudo systemctl restart haproxy', (error) => {
        if (error) {
            console.error('Error restarting HAProxy:', error);
        } else {
            console.log('HAProxy restarted successfully.');
        }
    });
}

// Command-line argument for instance count
const instanceCount = parseInt(process.argv[2], 10);
if (!instanceCount || isNaN(instanceCount) || instanceCount <= 0) {
    console.error('Please provide a valid number of instances to start.');
    process.exit(1);
}

const ports = startServers(instanceCount);
configureHAProxy(ports);
