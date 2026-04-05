import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import demoRouter from "./demo";
import devRouter from "./dev";
import profileRouter from "./profile";
import workoutsRouter from "./workouts";
import mealsRouter from "./meals";
import equipmentRouter from "./equipment";
import measurementsRouter from "./measurements";
import progressRouter from "./progress";
import settingsRouter from "./settings";
import coachRouter from "./coach";
import waterRouter from "./water";
import recoveryRouter from "./recovery";
import userTemplatesRouter from "./user-templates";
import mealFavoritesRouter from "./meal-favorites";
import achievementsRouter from "./achievements";
import subscriptionRouter from "./subscription";
import scanMealRouter from "./scan-meal";
import notificationsRouter from "./notifications";
import xpRouter from "./xp";

const router: IRouter = Router();

router.use(healthRouter);
if (process.env.NODE_ENV !== "production") {
  router.use("/dev", devRouter);
}
router.use("/auth", authRouter);
router.use("/auth/demo", demoRouter);
router.use("/profile", profileRouter);
router.use("/workouts/my-templates", userTemplatesRouter);
router.use("/workouts", workoutsRouter);
router.use("/meals/favorites", mealFavoritesRouter);
router.use("/meals", mealsRouter);
router.use("/equipment", equipmentRouter);
router.use("/measurements", measurementsRouter);
router.use("/progress", progressRouter);
router.use("/settings", settingsRouter);
router.use("/coach", coachRouter);
router.use("/water", waterRouter);
router.use("/recovery", recoveryRouter);
router.use("/achievements", achievementsRouter);
router.use("/subscription", subscriptionRouter);
router.use("/scan-meal", scanMealRouter);
router.use("/notifications", notificationsRouter);
router.use("/xp", xpRouter);

export default router;
