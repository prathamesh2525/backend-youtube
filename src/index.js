import dotenv from "dotenv"
import { app } from "./app.js"
import { connectDB } from "./db/index.js"

dotenv.config({
  path: "./.env",
})

connectDB()
  .then(() => {
    app.on("error", (err) => {
      console.log("Error: ", err)
    })
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server running on port http://localhost:${process.env.PORT}`)
    })
  })
  .catch((e) => {
    console.log("Error: ", error)
  })
