import { Request, Response } from "express";
import { ResponseModel } from "../backend-resources/models/ResponseModel";
import { DatabasePgODBC } from "../backend-resources/models/DatabasePgODBC";
import { obtieneAfipAccesoResponse } from "@/types/authTypes";
import { ArcaAuth } from "@/modules/arca/ArcaAuth";
import { validateMethod } from "../backend-resources/utils";
import apiSupabase from "../backend-resources/models/supabase/apiSupabase";
import axios from "axios";
import "colors";

export class ArcaAuthController {
  static async loginCMS(req: Request, res: Response): Promise<void> {
    try {
      if (!validateMethod(req, res, "POST")) return;

      const { empresa, modo } = req.params;

      const existeEmpresa = await DatabasePgODBC.query(
        "SELECT 1 as existe FROM empresas e WHERE e.empresa=? AND e.inha=0;",
        [empresa]
      );

      if (existeEmpresa.count === 0) {
        const response = ResponseModel.create("error", 404, "Empresa no encontrada o inhabilitada");
        res.status(404).json(response);
        return;
      }

      const obtieneAfipAcceso = await DatabasePgODBC.query(
        "SELECT * FROM obtiene_afipacceso(?, ?);",
        [empresa, modo]
      );

      const afipAcceso = obtieneAfipAcceso[0] as obtieneAfipAccesoResponse;

      if (afipAcceso.status === "valid") {
        res.status(200).json(ResponseModel.create("success", 200, "loginCMS OK", afipAcceso));
        return;
      }

      // const getTokenSign = await ArcaAuth.getTokenAccess(empresa, modo);

      const response = ResponseModel.create("error", 404, "Sin integracion con ARCA");

      res.json(response);
    } catch (error) {
      const response = ResponseModel.create("error", 500, "Error en loginCMS", { error });
      res.status(500).json(response);
    }
  }
}
