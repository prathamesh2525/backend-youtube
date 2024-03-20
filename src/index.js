import mongoose from "mongoose"
import { DB_NAME } from "./constants"
import dotenv from "dotenv"
import { app } from "./app"
import { connectDB } from "./db"

dotenv.config({
  path: "./env",
})

connectDB()
  .then(() => {
    app.on("error", (err) => {
      console.log("Error: ", err)
    })
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server ruiing on prort`)
    })
  })
  .catch((e) => {
    console.log("Error: ", error)
  })
