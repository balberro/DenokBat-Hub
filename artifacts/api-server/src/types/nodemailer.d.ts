/** Hasta que `pnpm install` instale nodemailer en el workspace. */
declare module "nodemailer" {
  export function createTransport(opts: unknown): {
    sendMail(opts: unknown): Promise<unknown>;
  };
}
