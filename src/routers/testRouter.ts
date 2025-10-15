import { Router } from "express";
import { TestsController } from "../controllers/TestsController";

const testRouter = Router();

testRouter.all("/", TestsController.root);
testRouter.all("/health", TestsController.health);
testRouter.all("/db-test", TestsController.dbTest);
testRouter.all("/error-test", TestsController.errorTest);
testRouter.all("/testSupabase", TestsController.testSupabase);
testRouter.all("/testPEM", TestsController.testPEM);

export default testRouter;
