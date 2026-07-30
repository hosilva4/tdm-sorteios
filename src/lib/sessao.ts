import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const NOME_COOKIE = "tdm_sessao";
const DURACAO_DIAS = 30;

function segredo(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado");
  return new TextEncoder().encode(s);
}

export async function criarSessao(usuarioId: string): Promise<void> {
  const token = await new SignJWT({ sub: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_DIAS}d`)
    .sign(segredo());

  const jar = await cookies();
  jar.set(NOME_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_DIAS * 24 * 60 * 60,
  });
}

/** Retorna o id do usuário logado, ou null. */
export async function usuarioDaSessao(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(NOME_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  jar.delete(NOME_COOKIE);
}

export const COOKIE_SESSAO = NOME_COOKIE;
