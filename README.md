# BlindML Server

**BlindML** is an open-source MLOps platform powered by **Fully Homomorphic Encryption (FHE)**.

It enables secure deployment of AI models and inference on encrypted data—without decrypting user inputs during computation.

## ✨ What Is BlindML Server?

**BlindML Server** is a Node.js backend for running AI inference on encrypted data using Fully Homomorphic Encryption.

It supports secure model inference through a simple API. Uploaded models are automatically deployed in Docker containers for easier management and scaling.

> 📡 Model inference is requested through [**BlindML Client**](https://github.com/blindml-ai/blindml-client).

## 🚀 Key Features

- **Privacy-preserving AI inference** using Fully Homomorphic Encryption
- A lightweight backend for encrypted inference workflows
- Integration with Python applications through **BlindML Client**
- Automatic deployment of uploaded models in Docker containers
- A developer-friendly architecture that is easy to deploy and customize
- Support for environments where sensitive inputs must remain encrypted during inference

## 🖥️ Supported Environments

| Operating System | Server Support |
|------------------|----------------|
| Windows | ❌ Native server deployment is not supported |
| macOS | ❌ Native server deployment is not supported |
| Linux | ✅ Supported |

> Windows and macOS users can access BlindML Server remotely when the server and its Docker environment are hosted on Linux.

### Reference Experimental Environment

The original experimental environment used the following specifications:

| Component | Specification |
|-----------|---------------|
| CPU | Intel Core i7 |
| Memory | 64 GB RAM |
| Storage | 7 TB HDD |
| Operating System | Ubuntu 20.04 |
| Python | 3.8 |
| Node.js | 20.11.0 |
| Concrete ML | 1.4.0 |
| Applications | BlindML Server and BlindML Client |

> These specifications describe the original experimental setup, not minimum hardware requirements. The current setup instructions below follow the project's Node.js requirement of **22.10 or later**.
>
> When reproducing the original environment, use the corresponding project revision and dependency versions.

## 🔐 Supported FHE Libraries

| Library | Description |
|---------|-------------|
| [**Concrete ML**](https://github.com/zama-ai/concrete-ml) by Zama | An open-source library for machine learning with FHE |
| **CSEM** — planned | An FHE inference engine designed to support more than 100 machine learning functions |

> After starting BlindML Server, select an available FHE library when deploying a model.

---

## 🧰 Getting Started

### 1. Prerequisites

Make sure the following tools and services are available:

- [Git](https://git-scm.com/)
- [Docker Engine](https://docs.docker.com/engine/install/ubuntu/)
- [Miniconda](https://www.anaconda.com/docs/getting-started/miniconda/main)
- [Python 3.8](https://www.python.org/), managed through the project Conda environment
- [Node.js ≥ 22.10](https://nodejs.org/)
- [RabbitMQ](https://www.rabbitmq.com/docs/install-debian)

> **Important:** Docker and RabbitMQ must be running before BlindML Server starts. The server process must have access to both services.

### 2. Clone the Repository

```bash
git clone https://github.com/blindml-ai/blindml-server.git
cd blindml-server
```

### 3. Set Up the Python Environment

Miniconda manages the Python environment required by the FHE libraries.

#### 3.1. Install Miniconda

```bash
# Download the installer.
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh

# Run the installer.
bash Miniconda3-latest-Linux-x86_64.sh

# Activate Conda.
# Adjust this path if you selected a custom installation directory.
source ~/miniconda3/bin/activate

# Initialize Conda for Bash.
conda init bash
source ~/.bashrc

# Verify the installation.
conda --version
```

For Zsh, use `conda init zsh` and `source ~/.zshrc` instead.

#### 3.2. Create and Activate the Environment

Run the following commands from the directory containing the provided `environment.yml` file:

```bash
conda env create -f environment.yml

# List available environments.
conda env list

# Activate the project environment.
conda activate cm14008

# Verify the Python version.
python --version
```

> These commands assume that the environment is named `cm14008`. If your `environment.yml` specifies a different name, use that name instead.

#### 3.3. Verify the FHE Library

```bash
python -m pip show concrete-ml
```

The original experimental environment used Concrete ML 1.4.0. If you are reproducing that environment and the required version is missing, install it with:

```bash
python -m pip install concrete-ml==1.4.0
```

> For other project revisions, use the version specified by their dependency files. Do not overwrite an existing project-specific version solely to match the original experiment.

### 4. Install Docker Engine

The following commands configure Docker's official Ubuntu package repository.

> For a new deployment, check the [Docker installation guide](https://docs.docker.com/engine/install/ubuntu/) for supported Ubuntu releases. Package availability for the original Ubuntu 20.04 environment may differ.

```bash
# Install prerequisite packages.
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key.
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker's official repository.
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and related components.
sudo apt update
sudo apt install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Start Docker and enable it at boot.
sudo systemctl enable --now docker

# Verify the installation.
docker --version
sudo systemctl status docker --no-pager
sudo docker run --rm hello-world
```

#### Docker Context and Application Access

Installing Docker Desktop alongside Docker Engine may create a separate Docker context.

The original Linux test environment used the Docker Engine endpoint associated with the `default` context.

```bash
docker context ls
docker context use default
```

Ensure that BlindML Server's Docker connection settings point to the intended Docker Engine and that the server process has permission to access it.

> Selecting a Docker CLI context does not automatically update Dockerode's connection settings. A successful Docker command with `sudo` also does not verify access for the user running BlindML Server.

### 5. Install Node.js

Install **Node.js 22.10 or later** using the appropriate installation method from the [official Node.js website](https://nodejs.org/).

Verify that Node.js and npm are available:

```bash
node --version
npm --version
```

> The original experiment used Node.js 20.11.0. Use that version only when reproducing the corresponding historical project revision.

### 6. Install and Start RabbitMQ

RabbitMQ must be installed and running before starting BlindML Server.

#### 6.1. Install RabbitMQ

For the original Ubuntu experimental environment, the following commands install the RabbitMQ package available from the configured Ubuntu repositories:

```bash
sudo apt update
sudo apt install -y rabbitmq-server
```

> Ubuntu repositories may provide older RabbitMQ and Erlang versions. For a new deployment, follow the [official RabbitMQ installation guide](https://www.rabbitmq.com/docs/install-debian) to configure the appropriate repositories and supported versions.

#### 6.2. Start and Verify RabbitMQ

```bash
# Start RabbitMQ and enable it at boot.
sudo systemctl enable --now rabbitmq-server

# Check the service status.
sudo systemctl status rabbitmq-server --no-pager

# Verify that the RabbitMQ node is running.
sudo rabbitmq-diagnostics ping
sudo rabbitmqctl status
```

#### 6.3. Check the Connection Settings

For a local installation, the default AMQP endpoint is:

```text
amqp://localhost:5672
```

Review the RabbitMQ connection module in the project's `config` directory and confirm that its hostname, port, credentials, and virtual host match your RabbitMQ instance.

> The default RabbitMQ `guest` account is restricted to local connections. If BlindML Server connects from another machine or a separate container, configure a dedicated RabbitMQ user with the required permissions.
>
> Inside a container, `localhost` refers to that container. Use a broker hostname or address reachable from the server's runtime environment.

### 7. Configure the Environment Variables

Create or edit the `.env` file in the project root.

The configuration below shows the documented default settings. Empty database values select SQLite3; provide the database values to use MySQL.

```env
# Service server configuration
SERVICE_SERVER=http://127.0.0.1
SERVICE_PORT=3000

# Docker server configuration
DOCKER_SERVER=http://127.0.0.1
DOCKER_PORT=80

# Authentication server configuration
AUTH_SERVER=http://127.0.0.1
AUTH_PORT=80

# Database configuration
# Leave these empty to use SQLite3 (default).
# Provide these values to use MySQL.
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
```

Configure these addresses and ports to match your deployment.

RabbitMQ connection settings must also match the configuration expected by the project's RabbitMQ connection module. Only add RabbitMQ environment variables if that module reads them.

> Keep credentials out of version control. Use a `.env.example` file with placeholder values to document the required configuration.

### 8. Install Dependencies and Start the Server

Run the following commands from the project root:

```bash
# Activate the Python environment.
conda activate cm14008

# Install Node.js dependencies.
npm install

# Confirm that the required services are running.
sudo systemctl is-active docker
sudo systemctl is-active rabbitmq-server

# Start BlindML Server.
node server.js
```

Both service checks should return `active`.

### 9. Access BlindML Server

When using the default service port, open:

- http://localhost:3000
- http://127.0.0.1:3000

For access from another computer, use:

```text
http://<server-ip>:3000
```

Ensure that the application listens on a reachable network interface and that the service port is accessible.

---

## 🛠️ Troubleshooting

### SQLite Native Module Errors

Native modules copied from Windows or macOS may fail on Linux with an error such as:

```text
invalid ELF header
```

Install dependencies directly on the target Linux machine instead of copying `node_modules` from another operating system.

If the project includes `package-lock.json`, reinstall dependencies using the existing lockfile:

```bash
npm ci
```

If no lockfile is available:

```bash
rm -rf node_modules
npm install
```

If the error specifically involves `better-sqlite3`, rebuild it:

```bash
npm rebuild better-sqlite3
```

If native build tools are required:

```bash
sudo apt install -y build-essential python3
npm rebuild better-sqlite3
```

### Missing Node.js Modules

Run the following command from the project root:

```bash
npm install
```

If a required dependency is missing from `package.json`, add the version compatible with your project revision.

### RabbitMQ Connection Errors

Check the service status and recent logs:

```bash
sudo systemctl status rabbitmq-server --no-pager
sudo rabbitmq-diagnostics ping
sudo journalctl -u rabbitmq-server -n 100 --no-pager
```

Confirm that:

- RabbitMQ is running.
- The configured broker address is reachable.
- The AMQP port matches the server configuration.
- The username, password, and virtual host are correct.
- The RabbitMQ user has the required permissions.
- Remote connections are not using the local-only `guest` account.

### Docker Connection Errors

Check the Docker service and available contexts:

```bash
sudo systemctl status docker --no-pager
docker context ls
docker info
```

If `sudo docker info` succeeds but `docker info` fails, check Docker access permissions for the user running BlindML Server.

Verify that the Docker connection settings used by the application point to the intended Docker Engine.
