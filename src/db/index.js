import mongoose from "mongoose"

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    )
    console.log(`\n MongoDB connected!! DB Host:${connectionInstance}`)
  } catch (error) {
    console.log("MONGODB connection error", error)
    process.exit(1)
  }
}

export { connectDB }
