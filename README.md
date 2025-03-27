# BlindML Server

**BlindML** is an open-source MLOps platform powered by **Fully Homomorphic Encryption (FHE)**  
It enables secure, lightweight, and fast deployment of AI models — without ever decrypting your data.


## ✨ What is BlindML Server?

**BlindML Server** is a Node.js backend for running AI inference on encrypted data using FHE (Fully Homomorphic Encryption).  
It supports secure model inference through a simple API, without decrypting user data.  
Uploaded models are automatically deployed in Docker containers for easy management and scaling.



> 📡 Model inference is requested via [**BlindML Client**](https://github.com/blindml-ai/blindml-client)





## 🚀 Key Features

- **Privacy-preserving AI inference** using Fully Homomorphic Encryption  
- **Lightweight** and **fast** server optimized for encrypted data handling  
- Easy integration with Python clients via **BlindML Client**  
- Developer-friendly: simple to deploy, easy to customize  
- Works seamlessly in secure environments where data must remain encrypted  





## 🖥️ Supported Environments

| OS        | Support |
|-----------|---------|
| Windows   | ❌ Not supported |
| macOS     | ❌ Not supported |
| Linux     | ✅ Fully supported |

> Note:  
> If Docker is installed on Linux and communicate with blindml-server remotely, it can also be used on Windows and macOS environments.




## 🔐 Supported FHE Libraries

BlindML Server supports multiple FHE libraries for encrypted inference:

| Library | Description |
|---------|-------------|
| [**concrete-ml**](https://github.com/zama-ai/concrete-ml) (by Zama) | Open-source FHE library that converts PyTorch models into FHE-compatible formats. |
| **CSEM** (soon) | A fast FHE inference engine that supports 100+ machine learning functions, optimized for performance and flexibility.|

> After starting the BlindML server, you can choose the FHE library to use when deploying your model.


---


## 🧰 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Docker](https://www.docker.com/)
- [Python 3.8](https://www.python.org/)
- [Node.js ≥ 22.10](https://nodejs.org/)

### Edit your .env file

To run this server, edit the `.env` file in the root directory.
If the .env file is not modified, the application will run with the following default configuration."

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
# If values are provided, the project will use MySQL.
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
```
### ⚙Installation

```bash
# 1. Clone the repository
git clone https://github.com/blindml-ai/blindml-server.git
cd blindml-server

# 2. Install dependencies
npm install

# 3. Start the server
node server.js
