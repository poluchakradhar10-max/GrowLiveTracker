import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
}

declare global {
    var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        // Debug logging to see what URI is actually being used
        console.log('DEBUG: Connecting to MongoDB with URI:', MONGODB_URI.replace(/:([^:@]+)@/, ':****@'));

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
            console.log('DEBUG: MongoDB Connected Successfully within Promise');
            return mongooseInstance.connection;
        }).catch(err => {
            console.error('DEBUG: MongoDB Connection Promise Rejected:', err);
            throw err;
        });
    }

    try {
        cached.conn = await cached.promise;
        console.log('MongoDB connected successfully');
    } catch (e) {
        cached.promise = null;
        console.error('MongoDB connection error:', e);
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
