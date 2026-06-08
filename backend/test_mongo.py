from pymongo import MongoClient
import certifi

uri = "mongodb+srv://admin:admin@cluster0.45t37tr.mongodb.net/?appName=Cluster0"

try:
    print("Testing connection...")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
    info = client.server_info()
    print("Connection SUCCESS:", info.get("version"))
except Exception as e:
    print("Connection FAILED:", e)
