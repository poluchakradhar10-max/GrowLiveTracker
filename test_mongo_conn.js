const mongoose = require('mongoose');

const uri = "mongodb://root:password@localhost:27017/growlivetracker?authSource=admin";

async function run() {
    try {
        await mongoose.connect(uri);
        console.log("Connected successfully to MongoDB!");
        await mongoose.connection.close();
    } catch (error) {
        console.error("Connection failed:", error);
    }
}

run();
