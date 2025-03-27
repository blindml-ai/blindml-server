from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request, Response, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import os
import base64
import httpx
from typing import Optional
from tempfile import TemporaryDirectory
from shutil import unpack_archive
from pathlib import Path
from concrete.ml.deployment import FHEModelClient, FHEModelDev, FHEModelServer
import asyncio
import nest_asyncio
import json
from shutil import copy
import traceback
import shutil
import random


nest_asyncio.apply()
app = FastAPI()
security = HTTPBearer()

CONTAINER_ID = os.getenv("CONTAINER_ID")
MODEL_ID = os.getenv("MODEL_ID")
CONTAINER_PORT = 80  # Default
SERVER_PORT = os.getenv("SERVER_PORT")
AUTH_SERVER_URL = os.getenv("AUTH_SERVER_URL")
CLIENTZIP_BASE64 = os.getenv("CLIENT_ZIP")
SERVERZIP_BASE64 = os.getenv("SERVER_ZIP")

PYTHON_VERSION = os.getenv("PYTHON_VERSION")
LIBRARY_NAME = os.getenv("LIBRARY_NAME")
LIBRARY_VERSION = os.getenv("LIBRARY_VERSION")

OUTPUT_DIR = "/app/output"
#OUTPUT_DIR = "/Users/jhb/BlindMLServer/libraries/concreteml/test/output"


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    apikey = credentials.credentials
    headers = {"Authorization": f"Bearer {apikey}"}
    body = {"ModelId": MODEL_ID, "ContainerId": CONTAINER_ID}
    async with httpx.AsyncClient() as client:
        response = await client.post(AUTH_SERVER_URL, headers=headers, json=body)
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")
        data = response.json()
        if not data.get("result"):
            raise HTTPException(status_code=401, detail="Authentication failed")
        return True


def save_base64_zip(encoded_str, output_dir, output_filename):
    output_dir_path = Path(output_dir)
    output_dir_path.mkdir(parents=True, exist_ok=True)
    zip_bytes = base64.b64decode(encoded_str)
    zip_path = output_dir_path / output_filename
    with open(zip_path, "wb") as zip_file:
        zip_file.write(zip_bytes)
    return str(zip_path)


def ensure_zip_file(encoded_str, output_dir, output_filename):
    output_path = Path(output_dir) / output_filename
    if not output_path.exists():
        output_path.parent.mkdir(parents=True, exist_ok=True)
        zip_bytes = base64.b64decode(encoded_str)
        with open(output_path, "wb") as zip_file:
            zip_file.write(zip_bytes)
    return output_path


@app.get("/")
async def mainget():
    return Response(f"This container id is {CONTAINER_ID}")


@app.post("/")
async def mainpost():
    return Response(f"This container id is {CONTAINER_ID}")


@app.post("/test")
async def test():
    return Response(f"Hello World! This container id is {CONTAINER_ID}")


# 초기화
@app.post("/init")
async def init():
    try:
        # Paths to client.zip and server.zip
        client_zip_path = Path(OUTPUT_DIR) / "client.zip"
        server_zip_path = Path(OUTPUT_DIR) / "server.zip"

        # Check if files exist
        if not client_zip_path.exists() or not server_zip_path.exists():
            raise HTTPException(status_code=500, detail="Required zip files not found in OUTPUT_DIR.")

        # Create a temporary directory
        tmp_base = "/app/tmp"
        random_id = random.randint(1000, 9999)  # 4-digit random number
        tmpdirname = f"{tmp_base}_{random_id}"
        tmp_path = Path(tmpdirname)
        tmp_path.mkdir(parents=True, exist_ok=True)
        os.chmod(tmp_path, 0o777)
        print(f"Temporary folder created at {tmpdirname}")

        # Copy files into the temporary directory
        try:
            shutil.copy(client_zip_path, tmpdirname)
            shutil.copy(server_zip_path, tmpdirname)
            print("Files copied successfully.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to copy files: {str(e)}")


        client_zip_path = ensure_zip_file(CLIENTZIP_BASE64, OUTPUT_DIR, "client.zip")
        with open(client_zip_path, "rb") as f:
            client_zip_bytes = f.read()

            headers = {
                "X-Python-Version": PYTHON_VERSION,
                "X-Library-Name": LIBRARY_NAME,
                "X-Library-Version" : LIBRARY_VERSION
            }

        return Response(content=client_zip_bytes, media_type="application/zip", headers=headers)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/predict")
async def predict(
        request: Request,
        encrypted_data: Optional[UploadFile] = File(None),
        evaluation_key: Optional[UploadFile] = File(None),
        extra_field: Optional[str] = Form(None)
):

    tmp_base = "/app/tmp"
    random_id = random.randint(1000, 9999)  # 4자리 랜덤 숫자
    tmpdirname = f"{tmp_base}_{random_id}"
    tmp_path = Path(tmpdirname)

    try:
        # 디렉터리 수동 생성
        tmp_path.mkdir(parents=True, exist_ok=True)
        os.chmod(tmp_path, 0o777)
        print("Temporary folder is generated:", tmp_path)

        # 요청이 JSON인 경우 처리
        if request.headers.get("Content-Type", "").startswith("application/json"):
            body = await request.json()
            print("Received JSON body:", body)
            return JSONResponse({"message": "JSON data received", "data": body})

        # 요청이 multipart/form-data인 경우 처리
        if encrypted_data and evaluation_key:
            # 암호화 데이터 및 평가 키 저장
            encrypted_data_path = tmp_path / encrypted_data.filename
            evaluation_key_path = tmp_path / evaluation_key.filename

            with open(encrypted_data_path, "wb") as f:
                f.write(await encrypted_data.read())

            with open(evaluation_key_path, "wb") as f:
                f.write(await evaluation_key.read())

            # Ensure server.zip is present
            server_zip_path = Path(OUTPUT_DIR) / "server.zip"
            client_zip_path = Path(OUTPUT_DIR) / "client.zip"
            if not server_zip_path.exists():
                raise HTTPException(status_code=500, detail="Server model zip not found.")

            # Unpack server zip
            try:
                # 파일 복사
                copy(server_zip_path, tmpdirname)
                copy(client_zip_path, tmpdirname)

                # 복사된 파일이 존재하는지 확인
                server_file_copied = os.path.exists(os.path.join(tmpdirname, os.path.basename(server_zip_path)))
                client_file_copied = os.path.exists(os.path.join(tmpdirname, os.path.basename(client_zip_path)))

                if not (server_file_copied and client_file_copied):
                    raise HTTPException(status_code=500, detail="File copy did not complete successfully.")

                print("Files copied successfully.")

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to copy files: {str(e)}")


            # Run FHE model
            try:
                fhe_model_server = FHEModelServer(tmpdirname)
                with open(encrypted_data_path, "rb") as enc_data, open(evaluation_key_path, "rb") as eval_key:
                    input_data = base64.b64decode(enc_data.read())
                    encrypted_prediction = fhe_model_server.run(input_data, eval_key.read())

            except Exception as error:
                print(traceback.format_exc())
                raise HTTPException(status_code=500, detail=f"Failed to run FHEModelServer: {str(error)}")

            # Base64 인코딩된 결과 반환
            return JSONResponse({"data": base64.b64encode(encrypted_prediction).decode()})

        raise HTTPException(status_code=400, detail="Invalid request format")
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        # 임시 디렉터리 삭제
        if tmp_path.exists():
            #shutil.rmtree(tmp_path)
            print(f"Temporary folder {tmp_path} has been removed.")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=CONTAINER_PORT)