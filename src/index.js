import dotenv from "dotenv"
import { app } from "./app.js"
import { connectDB } from "./db/index.js"

const result = dotenv.config({
  path: "./.env",
})

if (result.error) {
  console.log("from index.js root file:", result.error)
}

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
