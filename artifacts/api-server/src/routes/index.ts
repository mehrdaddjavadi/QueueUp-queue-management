import { Router, type IRouter } from "express";
import healthRouter from "./health";
import queueupRouter from "./queueup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(queueupRouter);

export default router;
