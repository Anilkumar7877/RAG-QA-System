import chromadb

client = chromadb.PersistentClient(path="./chroma_db")

collections = client.list_collections()
print(f"Total collections: {len(collections)}\n")

for col in collections:
    count = col.count()
    print(f"Collection: {col.name} → {count} chunks")
    
    # Show sample chunk from each collection
    sample = col.get(limit=1)
    if sample["documents"]:
        print(f"  Sample: {sample['documents'][0][:150]}...")
        print(f"  Source: {sample['metadatas'][0].get('source', 'unknown')}")
    print()