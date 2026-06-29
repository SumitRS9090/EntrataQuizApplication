import os
from datetime import datetime
from pymongo import MongoClient
from pymongo.collection import Collection


def get_mongo_client() -> MongoClient:
    uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
    return MongoClient(uri)


def get_db_name() -> str:
    return os.environ.get("MONGODB_DATABASE", "quizbuilder")


def get_collection(client: MongoClient, collection_name: str = "quiz_results") -> Collection:
    db = client[get_db_name()]
    return db[collection_name]


def init_db(client: MongoClient):
    """Create indexes on the quiz_results collection."""
    col = get_collection(client)
    col.create_index("created_at")   # for sorting history
    col.create_index("id", unique=True)
    print("✓ MongoDB indexes ready")