"use server"
import clientPromise from "../../lib/mongodb"

// Get all available databases
export async function getDatabases() {
  try {
    console.log("Fetching available databases...")
    const client = await clientPromise
    const adminDb = client.db("admin")

    // List all databases
    const dbs = await adminDb.admin().listDatabases()

    // Filter out system databases and return only database names
    const dbNames = dbs.databases.filter((db) => !["admin", "local", "config"].includes(db.name)).map((db) => db.name)

    console.log(`Found ${dbNames.length} databases:`, dbNames)
    return dbNames
  } catch (error) {
    console.error("Error fetching databases:", error)
    return []
  }
}

// Get all collections for a specific database
export async function getCollections(dbName: string) {
  try {
    console.log(`Fetching collections for database: ${dbName}`)
    const client = await clientPromise
    const db = client.db(dbName)

    // List all collections
    const collections = await db.listCollections().toArray()

    // Filter out subsector collections
    const filteredCollections = collections.map((col) => col.name).filter((name) => !name.includes("subsector"))

    console.log(`Found ${filteredCollections.length} collections in ${dbName}:`, filteredCollections)
    return filteredCollections
  } catch (error) {
    console.error(`Error fetching collections for ${dbName}:`, error)
    return []
  }
}

// Get data from a specific collection with pagination
export async function getCollectionData(dbName: string, collectionName: string, page = 1, limit = 20) {
  try {
    console.log(`Fetching data from ${dbName}.${collectionName}, page=${page}, limit=${limit}`)
    const client = await clientPromise
    const db = client.db(dbName)
    const collection = db.collection(collectionName)

    // Calculate skip value for pagination
    const skip = (page - 1) * limit

    // Get total count
    const total = await collection.countDocuments()

    // Get data with pagination
    const data = await collection.find({}).sort({ _id: -1 }).skip(skip).limit(limit).toArray()

    // Convert MongoDB documents to plain objects
    const serializedData = data.map((item) => ({
      ...item,
      _id: item._id.toString(),
    }))

    console.log(`Fetched ${serializedData.length} documents from ${dbName}.${collectionName}`)

    // Calculate total pages
    const pages = Math.ceil(total / limit)

    return {
      data: serializedData,
      pagination: {
        total,
        pages,
        currentPage: page,
        limit,
      },
    }
  } catch (error) {
    console.error(`Error fetching data from ${dbName}.${collectionName}:`, error)
    return {
      data: [],
      pagination: {
        total: 0,
        pages: 0,
        currentPage: page,
        limit,
      },
    }
  }
}
