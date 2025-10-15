import { Request, Response } from "express";
import { ResponseModel } from "../backend-resources/models/ResponseModel";
import apiSupabase from "../backend-resources/models/supabase/apiSupabase";
import { validateMethod } from "../backend-resources/utils";
import { DatabasePgODBC } from "../backend-resources/models/DatabasePgODBC";
import "colors";

export class TestsController {
  static async root(req: Request, res: Response): Promise<void> {
    if (!validateMethod(req, res, "GET")) return;

    const response = ResponseModel.create("success", 200, "working!", {
      timestamp: new Date().toISOString(),
    });

    res.json(response);
  }

  static async health(req: Request, res: Response): Promise<void> {
    if (!validateMethod(req, res, "GET")) return;

    const response = ResponseModel.create("success", 200, "OK", {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });

    res.json(response);
  }

  static async dbTest(req: Request, res: Response): Promise<void> {
    if (!validateMethod(req, res, "GET")) return;

    try {
      const result = await DatabasePgODBC.query(
        "SELECT version() as version, current_timestamp as now"
      );

      const response = ResponseModel.create("success", 200, "db-test OK", {
        result: result[0],
      });

      res.json(response);
    } catch (error) {
      console.log(`Error en test de DB: ${error}`.red);

      const response = ResponseModel.create("error", 500, "Error de conexión a base de datos", {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      res.status(500).json(response);
    }
  }

  static async errorTest(req: Request, res: Response): Promise<void> {
    if (!validateMethod(req, res, "GET")) return;

    throw new Error("Error de prueba");
  }

  static async testPEM(req: Request, res: Response): Promise<void> {
    try {
      if (!validateMethod(req, res, "GET")) return;

      console.log("Iniciando test de ArcaAuth...".cyan);
      const empresa = 2;

      const obtienePemKey = await DatabasePgODBC.query(
        "SELECT ea.pem,ea.key FROM empresas_afip ea WHERE ea.empresa=?;",
        [empresa]
      );

      if (obtienePemKey.count === 0) {
        res.json(ResponseModel.create("error", 404, "Sin datos para la empresa"));
        return;
      }

      console.log("------------------------------------".yellow);
      console.log(obtienePemKey);
      console.log("------------------------------------".yellow);

      res.json(ResponseModel.create("success", 200, "testPEM OK", obtienePemKey[0]));
    } catch (error) {
      console.log("Error en test de ArcaAuth:".red);
      console.log(error);
    }
  }

  static async testSupabase(req: Request, res: Response): Promise<void> {
    if (!validateMethod(req, res, "GET")) return;
    try {
      const url = `/rest/v1/rpc/obtiene_afipacceso`;
      const payload = {
        p_empresa: 1,
        p_modo: "homo",
      };

      const request = await apiSupabase.post(url, payload);

      const response = request.data as any[];

      res.json(ResponseModel.create("success", 200, "testSupabase OK", response[0]));
    } catch (error: any) {
      const response = ResponseModel.create("error", 500, "Error en testSupabase", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(response);
    }
  }
}
