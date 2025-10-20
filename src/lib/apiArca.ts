import axios from "axios";

const apiArca = axios.create({
  baseURL: "https://wsaahomo.afip.gov.ar", // HOMOLOGACION
  timeout: 15000,
  //   baseURL: ""https://wsaa.afip.gov.ar/",     // PRODUCCION
});

export default apiArca;
