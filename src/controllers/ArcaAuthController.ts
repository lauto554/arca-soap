import { Request, Response } from "express";
import { ResponseModel } from "../backend-resources/models/ResponseModel";
import { DatabasePgODBC } from "../backend-resources/models/DatabasePgODBC";
import { obtieneAfipAccesoResponse } from "@/types/authTypes";
import { ArcaAuth } from "../modules/arca/ArcaAuth";
import { validateMethod } from "../backend-resources/utils";
import "colors";

export class ArcaAuthController {
  static async obtenerAfipAcceso(req: Request, res: Response): Promise<void> {
    try {
      if (!validateMethod(req, res, "GET")) return;

      const { empresa, modo } = req.params;
      const empresaNum = Number(empresa);

      const result = await ArcaAuth.getTokenAccess("wsfe", empresaNum, modo);

      if (result.code === -1) {
        res.json(ResponseModel.create("success", 204, `${result.data.message}`));
        return;
      }

      res.json(ResponseModel.create("success", 200, "obtenerAfipAcceso OK", result));
    } catch (error) {
      const response = ResponseModel.create("error", 500, "Error en obtenerAfipAcceso", { error });
      res.status(500).json(response);
    }
  }
}
