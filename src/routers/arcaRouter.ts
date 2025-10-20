import { Router, Request, Response } from "express";
import { ArcaAuthController } from "../controllers/ArcaAuthController";
import { validateEmpresaModo } from "../middleware";
import "colors";

const arcaRouter = Router();

arcaRouter.all(
  "/obtenerAfipAcceso/:empresa/:modo",
  validateEmpresaModo,
  ArcaAuthController.obtenerAfipAcceso
);

export default arcaRouter;
