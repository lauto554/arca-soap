import { Router, Request, Response } from "express";
import { ArcaAuthController } from "../controllers/ArcaAuthController";
import { validateEmpresaModo } from "../middleware";
import "colors";

const arcaRouter = Router();

arcaRouter.all("/loginCMS/:empresa/:modo", validateEmpresaModo, ArcaAuthController.loginCMS);

export default arcaRouter;
