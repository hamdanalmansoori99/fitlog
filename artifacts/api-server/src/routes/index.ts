import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import workoutsRouter from "./workouts";
import mealsRouter from "./meals";
import equipmentRouter from "./equipment";
import measurementsRouter from "./measurements";
import progressRouter from "./progress";
import settingsRouter from "./settings";
import coachRouter from "./coach";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/workouts", workoutsRouter);
router.use("/meals", mealsRouter);
router.use("/equipment", equipmentRouter);
router.use("/measurements", measurementsRouter);
router.use("/progress", progressRouter);
router.use("/settings", settingsRouter);
router.use("/coach", coachRouter);

export default router;
