import * as fs from "fs/promises";
import * as path from "path";
import { spawn } from "child_process";
import * as https from "https";
import { ResponseModel } from "../../backend-resources/models/ResponseModel";
import { DatabasePgODBC } from "../../backend-resources/models/DatabasePgODBC";
import "colors";
import apiSupabase from "../../backend-resources/lib/apiSupabase";
import apiArca from "../..//lib/apiArca";
import { UrlWithStringQuery } from "url";
import { obtieneAfipAccesoResponse } from "@/types/authTypes";

export class ArcaAuth {
  static async generateLoginTicketRequest(service: string = "wsfe"): Promise<string> {
    const uniqueId = Math.floor(Date.now() / 1000);
    const generationTime = new Date((uniqueId - 60) * 1000).toISOString();
    const expirationTime = new Date((uniqueId + 36000) * 1000).toISOString();

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
<header>
<uniqueId>${uniqueId}</uniqueId>
<generationTime>${generationTime}</generationTime>
<expirationTime>${expirationTime}</expirationTime>
</header>
<service>${service}</service>
</loginTicketRequest>
    `;

    return xmlContent;
  }

  static async signTokenRequest(xmlContent: string, empresa: number): Promise<Buffer> {
    const url = `/rest/v1/empresas_afip?empresa=eq.1&select=pem,key`;
    const request = await apiSupabase.get(url);
    const response = request.data as any[];

    if (response.length === 0) {
      throw new Error(`Sin datos para la empresa`);
    }

    const { pem, key } = response[0] as any;

    if (!pem || !key) {
      throw new Error(`Certificados digitales incompletos`);
    }

    console.log("Certificados obtenidos desde DB ✓".green);
    console.log("Iniciando firmado con archivos temporales...".yellow);

    // Crear archivos temporales
    const os = await import("os");
    const tmpDir = os.tmpdir();
    const certPath = path.join(tmpDir, `cert-${empresa}-${Date.now()}.pem`);
    const keyPath = path.join(tmpDir, `key-${empresa}-${Date.now()}.key`);

    await fs.writeFile(certPath, pem, "utf8");
    await fs.writeFile(keyPath, key, "utf8");

    return new Promise((resolve, reject) => {
      const openssl = spawn("openssl", [
        "smime",
        "-sign",
        "-signer",
        certPath,
        "-inkey",
        keyPath,
        "-outform",
        "DER",
        "-nodetach",
      ]);

      const outputChunks: Buffer[] = [];
      let errorOutput = "";

      openssl.stdin.write(xmlContent, "utf8");
      openssl.stdin.end();

      openssl.stdout.on("data", (chunk: any) => {
        outputChunks.push(Buffer.from(chunk));
      });

      openssl.stderr.on("data", (chunk: any) => {
        errorOutput += chunk.toString();
      });

      openssl.on("close", async (code) => {
        // Eliminar archivos temporales
        await fs.unlink(certPath);
        await fs.unlink(keyPath);

        const outputBuffer = Buffer.concat(outputChunks as any[]);
        if (code === 0 && outputBuffer.length > 0) {
          console.log("Firmado completado exitosamente ✓".green);
          resolve(outputBuffer);
        } else {
          console.log("Error al firmar:".red);
          console.log(errorOutput.red);
          reject(
            new Error(
              `Error al firmar el loginTicketRequest. Código de salida: ${code}\n${errorOutput}`
            )
          );
        }
      });

      openssl.on("error", (error) => {
        reject(new Error(`Error ejecutando OpenSSL: ${error.message}`));
      });
    });
  }

  static async createSignedTokenRequest(service: string, empresa: number): Promise<Buffer> {
    try {
      const xmlContent = await this.generateLoginTicketRequest(service);

      const signedCMS = await this.signTokenRequest(xmlContent, empresa);

      return signedCMS;
    } catch (error) {
      console.log("Error en el proceso completo:".red);
      console.log(error);
      throw error;
    }
  }

  static async executeLoginCMS(signedCMS: Buffer, empresa: number, modo: string): Promise<any> {
    console.log("------------------------------------".cyan);
    console.log("Ejecutando Login CMS...".cyan);

    try {
      const cmsBase64 = signedCMS.toString("base64");

      const soapRequest = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
<soapenv:Header/>
<soapenv:Body>
    <wsaa:loginCms>
        <wsaa:in>${cmsBase64}</wsaa:in>
    </wsaa:loginCms>
</soapenv:Body>
</soapenv:Envelope>`;

      const url = `/ws/services/LoginCms`;
      const response = await apiArca.post(url, soapRequest, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: '""',
        },
        validateStatus: () => true, // Permite procesar cualquier status
      });

      const responseText =
        typeof response.data === "string" ? response.data : String(response.data);

      // Guardar la respuesta en archivo
      const responsePath = path.join(`C:\\Sys\\certificado\\empresa`, "login-response.xml");
      await fs.writeFile(responsePath, responseText, "utf8");

      const faultMatch = responseText.match(/<faultstring>(.*?)<\/faultstring>/i);
      if (faultMatch) {
        const faultString = faultMatch[1];
        return { code: -1, data: { message: faultString } };
      }

      const loginCmsReturnMatch = responseText.match(
        /<loginCmsReturn>([\s\S]*?)<\/loginCmsReturn>/i
      );

      if (loginCmsReturnMatch) {
        let loginTicketXml = loginCmsReturnMatch[1];
        loginTicketXml = loginTicketXml
          .replace(/<!\[CDATA\[/g, "")
          .replace(/]]>/g, "")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        // Extraer campos del XML embebido
        const sourceMatch = loginTicketXml.match(/<source>(.*?)<\/source>/i);
        const destinationMatch = loginTicketXml.match(/<destination>(.*?)<\/destination>/i);
        const uniqueIdMatch = loginTicketXml.match(/<uniqueId>(.*?)<\/uniqueId>/i);
        const generationTimeMatch = loginTicketXml.match(
          /<generationTime>(.*?)<\/generationTime>/i
        );
        const expirationTimeMatch = loginTicketXml.match(
          /<expirationTime>(.*?)<\/expirationTime>/i
        );
        const tokenMatch = loginTicketXml.match(/<token>(.*?)<\/token>/i);
        const signMatch = loginTicketXml.match(/<sign>(.*?)<\/sign>/i);

        const url = `/rest/v1/rpc/grabar_afipacceso`;
        const payload = {
          p_empresa: empresa,
          p_modo: modo,
          p_source: sourceMatch?.[1],
          p_destination: destinationMatch?.[1],
          p_uniqueid: uniqueIdMatch?.[1],
          p_gentime: generationTimeMatch?.[1],
          p_exptime: expirationTimeMatch?.[1],
          p_token: tokenMatch?.[1],
          p_sign: signMatch?.[1],
        };

        // Puedes descomentar para grabar en Supabase si lo necesitas
        await apiSupabase.post(url, payload);
        // const response = request.data as any[];

        return { code: 1, data: { token: tokenMatch?.[1], sign: signMatch?.[1] } };
      }

      // Si no hay nada reconocible
      console.log("Respuesta inesperada de AFIP".red);
      return { code: -2, data: { message: "Respuesta inesperada de AFIP" } };
    } catch (error) {
      console.log(error);
    }
  }

  static async getTokenAccess(service: string, empresa: number, modo: string): Promise<any> {
    try {
      const url1 = `/rest/v1/empresas?empresa=eq.${empresa}&inha=eq.0`;
      const existeEmpresa = await apiSupabase.get(url1);

      if (!existeEmpresa) {
        return "Empresa no encontrada o inhabilitada";
      }

      const url2 = `/rest/v1/rpc/obtiene_afipacceso`;
      const payload = {
        p_empresa: empresa,
        p_modo: modo,
      };

      const obtieneAfipAcceso = await apiSupabase.post(url2, payload);

      const afipAccesoData = obtieneAfipAcceso.data as obtieneAfipAccesoResponse[] | undefined;

      if (
        afipAccesoData &&
        Array.isArray(afipAccesoData) &&
        afipAccesoData[0]?.status === "valid"
      ) {
        return afipAccesoData[0];
      }

      const signedCMS = await this.createSignedTokenRequest(service, empresa);
      const loginResult = await this.executeLoginCMS(signedCMS, empresa, modo);

      return loginResult;
    } catch (error) {
      console.log("Error en flujo completo:".red);
      console.log(error);
      throw error;
    }
  }
}
