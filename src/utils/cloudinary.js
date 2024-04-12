import { v2 as cloudinary } from "cloudinary"
import fs from "fs"
import dotenv from "dotenv"


// had to configure the dotenv one more time here bcoz variable were not accessible before it
dotenv.config({
  path: './.env'
})

// Configure Cloudinary

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
})

const uploadOnCloudinary = async (localFilePath) => {
  console.log("Uploading on Cloudinary...")

  try {
    // Check if localFilePath exists
    if (!localFilePath) {
      throw new Error("File path is missing")
    }

    // Upload the file on Cloudinary
    const res = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    })
    console.log("output: ", res)

    // File has been uploaded successfully
    console.log("File is uploaded on Cloudinary!", res.url)

    // Remove the locally saved temporary file
    fs.unlinkSync(localFilePath)

    return res
  } catch (error) {
    // Handle upload error
    console.error("Error uploading file to Cloudinary:", error.message)
    // Remove the locally saved temporary file if an error occurs
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath)
    }
    throw error // Re-throw the error for further handling
  }
}

export { uploadOnCloudinary }
