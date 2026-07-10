import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"
import logger from "../utils/logger.js"

const connectDB = async () => {
    try {
        const connectionINT = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
        })
        logger.info(`Connected to database ${connectionINT.connection.host}`);
    } catch (error) {
        logger.error("Error in connecting to the database: %s", error.stack || error.message || error);
        process.exit(1)
    }
}

export default connectDB