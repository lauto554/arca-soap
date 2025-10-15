import * as fs from "fs/promises";
import * as path from "path";
import { spawn } from "child_process";
import * as https from "https";
import { ResponseModel } from "../../backend-resources/models/ResponseModel";
import { DatabasePgODBC } from "../../backend-resources/models/DatabasePgODBC";
import "colors";

export class ArcaAuth {
  static async getTokenAccess(
    service: string,
    empresa: number,
    isProduction: boolean = false
  ): Promise<any> {
    try {
      console.log("====================================".magenta);
      console.log("INICIANDO FLUJO COMPLETO DE AFIP AUTH".magenta);
      console.log("====================================".magenta);

      // Paso 1: Generar y firmar el TRA
      const signedCMS = await this.createSignedTokenRequest(service, empresa);

      // Paso 2: Ejecutar Login CMS
      const loginResult = await this.executeLoginCMS(signedCMS, empresa, isProduction);

      // Paso 3: Guardar resultado en archivo de texto
      const resultPath = path.join(`C:\\Sys\\certificado\\${empresa}`, "auth-result.txt");
      const cmsBase64 = signedCMS.toString("base64");
      const resultText = `
          AFIP Authentication Result
          =========================
          Fecha: ${new Date().toISOString()}
          Empresa: ${empresa}
          Servicio: ${service}
          Ambiente: ${isProduction ? "PRODUCCIÓN" : "HOMOLOGACIÓN"}

          LOGINRESULT: ${loginResult || "N/A"}

          TOKEN: ${loginResult.data?.token || "N/A"}
          SIGN: ${loginResult.data?.sign || "N/A"}
          EXPIRATION: ${loginResult.data?.expirationTime || "N/A"}

          Status: ${loginResult.success ? "SUCCESS" : "ERROR"}
          Message: ${loginResult.message || "OK"}

          SIGNED CMS (Base64):
          ${cmsBase64}
      `;

      await fs.writeFile(resultPath, resultText, "utf8");
      console.log(`Resultado guardado en: ${resultPath}`.green);

      console.log("====================================".magenta);
      console.log("FLUJO COMPLETO FINALIZADO ✓".magenta);
      console.log("====================================".magenta);

      return loginResult;
    } catch (error) {
      console.log("Error en flujo completo:".red);
      console.log(error);
      throw error;
    }
  }

  static async createSignedTokenRequest(service: string, empresa: number): Promise<Buffer> {
    try {
      // Generar el XML
      const xmlContent = await this.generateLoginTicketRequest(service);

      // Firmarlo directamente en memoria
      const signedCMS = await this.signTokenRequest(xmlContent, empresa);

      return signedCMS;
    } catch (error) {
      console.log("Error en el proceso completo:".red);
      console.log(error);
      throw error;
    }
  }

  static async executeLoginCMS(
    signedCMS: Buffer,
    empresa: number,
    isProduction: boolean = false
  ): Promise<any> {
    console.log("------------------------------------".cyan);
    console.log("Ejecutando Login CMS...".cyan);

    try {
      // Convertir el CMS firmado a Base64
      const cmsBase64 = signedCMS.toString("base64");

      // Construir el request SOAP
      const soapRequest = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
<soapenv:Header/>
<soapenv:Body>
    <wsaa:loginCms>
        <wsaa:in>${cmsBase64}</wsaa:in>
    </wsaa:loginCms>
</soapenv:Body>
</soapenv:Envelope>`;

      // Endpoint según ambiente
      const endpoint = isProduction
        ? "https://wsaa.afip.gov.ar/ws/services/LoginCms"
        : "https://wsaahomo.afip.gov.ar/ws/services/LoginCms";

      console.log(`Endpoint: ${endpoint}`.cyan);
      console.log(`CMS Base64 Length: ${cmsBase64.length}`.cyan);
      console.log("SOAP Request:".cyan);
      console.log(soapRequest.gray);
      console.log("Enviando petición SOAP...".cyan);

      // Realizar la petición HTTP
      const responseText = await this.makeHttpsRequest(endpoint, soapRequest);

      // Guardar la respuesta en archivo
      const responsePath = path.join(`C:\\Sys\\certificado\\${empresa}`, "login-response.xml");
      await fs.writeFile(responsePath, responseText, "utf8");
      console.log(`Respuesta guardada en: ${responsePath}`.green);

      // Parsear la respuesta
      const result = await this.parseLoginResponse(responseText);

      console.log("Login CMS completado ✓".green);
      console.log("------------------------------------".cyan);

      return result;
    } catch (error) {
      console.log("Error en Login CMS:".red);
      console.log(error);
      throw error;
    }
  }

  static async generateLoginTicketRequest(service: string = "wsfe"): Promise<string> {
    // Generar uniqueId usando timestamp actual
    const uniqueId = Math.floor(Date.now() / 1000);

    // Tiempo de generación: 1 minuto antes de ahora
    const generationTime = new Date((uniqueId - 60) * 1000).toISOString();

    // Tiempo de expiración: 10 horas después
    const expirationTime = new Date((uniqueId + 36000) * 1000).toISOString();

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
<header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime}</generationTime>
    <expirationTime>${expirationTime}</expirationTime>
</header>
<service>${service}</service>
</loginTicketRequest>`;

    console.log("------------------------------------".blue);
    console.log("Generated XML Token Request:".blue);
    console.log(xmlContent);
    console.log("------------------------------------".blue);

    return xmlContent;
  }

  static async signTokenRequest(xmlContent: string, empresa: number): Promise<Buffer> {
    console.log("------------------------------------".yellow);
    console.log("Obteniendo certificados desde DB...".yellow);

    const obtienePemKey = await DatabasePgODBC.query(
      "SELECT ea.pem, ea.key FROM empresas_afip ea WHERE ea.empresa=?;",
      [3]
    );

    if (obtienePemKey.count === 0) {
      throw new Error(`Sin datos para la empresa`);
    }

    const { pem, key } = obtienePemKey[0] as any;

    if (!pem || !key) {
      throw new Error(`Certificados digitales incompletos`);
    }

    console.log("Certificados obtenidos desde DB ✓".green);
    console.log("Iniciando firmado con datos en memoria...".yellow);

    // Firmar usando OpenSSL con datos en memoria (sin archivos)
    return new Promise((resolve, reject) => {
      const openssl = spawn("openssl", [
        "smime",
        "-sign",
        "-signer",
        "/dev/stdin", // Certificado desde stdin
        "-inkey",
        "/dev/stdin", // Key desde stdin
        "-outform",
        "DER",
        "-nodetach",
      ]);

      const outputChunks: Buffer[] = [];
      let errorOutput = "";

      // Enviar certificado, key y contenido al proceso OpenSSL
      let inputData = pem + "\n" + key + "\n" + xmlContent;
      openssl.stdin.write(inputData, "utf8");
      openssl.stdin.end();

      // Capturar la salida firmada
      openssl.stdout.on("data", (chunk: any) => {
        outputChunks.push(Buffer.from(chunk));
      });

      // Capturar errores
      openssl.stderr.on("data", (chunk: any) => {
        errorOutput += chunk.toString();
      });

      // Manejar el cierre del proceso
      openssl.on("close", (code) => {
        const outputBuffer = Buffer.concat(outputChunks as any[]);
        if (code === 0 && outputBuffer.length > 0) {
          console.log("Firmado completado exitosamente ✓".green);
          console.log(outputBuffer);
          console.log("------------------------------------".yellow);
          resolve(outputBuffer);
        } else {
          console.log("Error al firmar:".red);
          console.log(errorOutput.red);
          reject(new Error(`Error al firmar el loginTicketRequest. Código de salida: ${code}`));
        }
      });

      openssl.on("error", (error) => {
        reject(new Error(`Error ejecutando OpenSSL: ${error.message}`));
      });
    });
  }

  static async makeHttpsRequest(endpoint: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: '""',
          "Content-Length": Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          console.log(`Status Code: ${res.statusCode}`.yellow);
          console.log(`Response Length: ${data.length} bytes`.yellow);

          // En SOAP, incluso los errores (faults) vienen como 200 o 500 con XML válido
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 600 && data.length > 0) {
            // Si es 500 pero tiene contenido XML, probablemente sea un SOAP Fault válido
            if ((res.statusCode === 500 && data.includes("<soap")) || data.includes("<soapenv:")) {
              console.log("Recibido SOAP Fault (Error 500 con contenido XML válido)".yellow);
              resolve(data);
            } else if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              console.log("Response preview:".red);
              console.log(data.substring(0, 500).red);
              reject(new Error(`HTTP Error: ${res.statusCode} ${res.statusMessage}`));
            }
          } else {
            reject(
              new Error(`HTTP Error: ${res.statusCode} ${res.statusMessage} - No response data`)
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Request error: ${error.message}`));
      });

      req.write(body);
      req.end();
    });
  }

  static async parseLoginResponse(responseXml: string): Promise<any> {
    try {
      // Buscar fault en la respuesta
      const faultMatch =
        responseXml.match(/<soap:Fault>[\s\S]*?<\/soap:Fault>/i) ||
        responseXml.match(/<soapenv:Fault>[\s\S]*?<\/soapenv:Fault>/i);

      if (faultMatch) {
        // Extraer faultcode y faultstring - mejorado para manejar namespaces
        const faultcodeMatch = responseXml.match(/<faultcode[^>]*>(.*?)<\/faultcode>/i);
        const faultcode = faultcodeMatch?.[1] || "Unknown fault";
        const faultstring =
          responseXml.match(/<faultstring>(.*?)<\/faultstring>/i)?.[1] || "Unknown error";

        console.log(`Fault Code: ${faultcode}`.red);
        console.log(`Fault String: ${faultstring}`.red);

        if (
          faultcode.includes("alreadyAuthenticated") ||
          faultcode.includes("coe.alreadyAuthenticated")
        ) {
          console.log("Usuario ya autenticado - usando sesión existente".yellow);
          return ResponseModel.create("success", 204, faultstring);
        }

        throw new Error(`SOAP Fault - ${faultcode}: ${faultstring}`);
      }

      // Buscar loginCmsReturn
      const loginCmsReturnMatch = responseXml.match(
        /<loginCmsReturn>([\s\S]*?)<\/loginCmsReturn>/i
      );

      if (loginCmsReturnMatch) {
        let loginTicketXml = loginCmsReturnMatch[1];

        // Decodificar entidades HTML del XML embebido
        loginTicketXml = loginTicketXml
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        console.log("XML decodificado:".blue);
        console.log(loginTicketXml.substring(0, 200) + "...".blue);

        // Parsear el XML embebido
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

        const result = {
          success: true,
          data: {
            token: tokenMatch?.[1],
            sign: signMatch?.[1],
            source: sourceMatch?.[1],
            destination: destinationMatch?.[1],
            uniqueId: uniqueIdMatch?.[1],
            generationTime: generationTimeMatch?.[1],
            expirationTime: expirationTimeMatch?.[1],
          },
        };

        console.log("Tokens extraídos:".green);
        console.log(`Token: ${result.data.token}`.green);
        console.log(`Sign: ${result.data.sign}`.green);
        console.log(`Expira: ${result.data.expirationTime}`.green);

        return result;
      }

      throw new Error("Respuesta inesperada de AFIP - No se encontró loginCmsReturn");
    } catch (error) {
      console.log("Error parseando respuesta:".red);
      console.log(error);
      throw error;
    }
  }
}
