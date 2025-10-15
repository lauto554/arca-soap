export type obtieneAfipAccesoResponse = {
  status: "valid" | "expired" | "not_found";
  token: string | null;
  sign: string | null;
  expira: string | null;
};
