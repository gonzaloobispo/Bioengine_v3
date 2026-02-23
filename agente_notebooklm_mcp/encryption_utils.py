
import os
import json
from cryptography.fernet import Fernet

# Ruta para la llave y el registro
KEY_FILE = os.path.join(os.path.dirname(__file__), "secret.key")
RECORDS_FILE = os.path.join(os.path.dirname(__file__), "login_records.enc")

def get_or_create_key():
    if not os.path.exists(KEY_FILE):
        key = Fernet.generate_key()
        with open(KEY_FILE, "wb") as f:
            f.write(key)
    else:
        with open(KEY_FILE, "rb") as f:
            key = f.read()
    return key

def encrypt_record(data):
    key = get_or_create_key()
    f = Fernet(key)
    json_data = json.dumps(data).encode()
    encrypted = f.encrypt(json_data)
    with open(RECORDS_FILE, "ab") as file:
        file.write(encrypted + b"\n")

def decrypt_records():
    if not os.path.exists(RECORDS_FILE):
        return []
    key = get_or_create_key()
    f = Fernet(key)
    records = []
    with open(RECORDS_FILE, "rb") as file:
        for line in file:
            if line.strip():
                try:
                    decrypted = f.decrypt(line.strip())
                    records.append(json.loads(decrypted.decode()))
                except Exception:
                    continue
    return records
