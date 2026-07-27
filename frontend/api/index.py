import sys
import os

# Override sqlite3 for ChromaDB compatibility on Vercel
try:
    __import__('pysqlite3')
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError:
    # Local Windows development won't need/have pysqlite3-binary
    pass

# Ensure the api directory is in python search path
sys.path.insert(0, os.path.dirname(__file__))

# Import the FastAPI app from main
from main import app
