import { Router } from "express"
import { registerUser, check } from "../controllers/user.controller.js"

const router = Router()

router.route("/register").get(check)

router.route("/register").post(registerUser)

export default router
