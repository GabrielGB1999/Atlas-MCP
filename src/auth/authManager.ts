import axios, { AxiosInstance } from "axios";
import { Config } from "../config";
import { Logger } from "../util/logger";
import { SigninRequest, SigninResponse } from "../atlasTypes";

/**
 * Decodes the `exp` claim (seconds since epoch) out of a JWT without
 * verifying the signature — verification is the API's job; the MCP only
 * needs to know when to refresh.
 */
function decodeJwtExpiryMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export class AuthManager {
  private accessToken: string | null = null;
  private expiresAtMs: number | null = null;
  private signinPromise: Promise<string> | null = null;

  constructor(
    private readonly config: Config,
    private readonly logger: Logger,
    private readonly httpClient: AxiosInstance,
  ) {}

  /** Returns a token guaranteed valid for at least the configured buffer window. */
  async getToken(): Promise<string> {
    if (this.accessToken && this.expiresAtMs !== null) {
      const bufferMs = this.config.jwtExpiryBufferMinutes * 60 * 1000;
      if (Date.now() < this.expiresAtMs - bufferMs) {
        return this.accessToken;
      }
      this.logger.info("JWT nearing expiry, refreshing preemptively");
    }
    return this.signin();
  }

  /** Forces a fresh signin, e.g. after a 401. Concurrent callers share one signin. */
  async refresh(): Promise<string> {
    return this.signin();
  }

  private signin(): Promise<string> {
    if (this.signinPromise) {
      return this.signinPromise;
    }
    this.signinPromise = this.doSignin().finally(() => {
      this.signinPromise = null;
    });
    return this.signinPromise;
  }

  private async doSignin(): Promise<string> {
    this.logger.info("Signing in to Atlas API", { email: this.config.apiEmail });
    const body: SigninRequest = {
      email: this.config.apiEmail,
      password: this.config.apiPassword,
      type: "client",
    };
    try {
      const response = await this.httpClient.post<SigninResponse>("/auth/signin", body);
      const token = response.data.accessToken;
      if (!token) {
        throw new Error("Signin response did not contain an accessToken");
      }
      this.accessToken = token;
      this.expiresAtMs = decodeJwtExpiryMs(token);
      this.logger.info("Signin succeeded", {
        expiresAt: this.expiresAtMs ? new Date(this.expiresAtMs).toISOString() : "unknown",
      });
      return token;
    } catch (err) {
      this.accessToken = null;
      this.expiresAtMs = null;
      if (axios.isAxiosError(err)) {
        this.logger.error("Signin failed", {
          status: err.response?.status,
          data: err.response?.data,
        });
      } else {
        this.logger.error("Signin failed", { error: String(err) });
      }
      throw new Error("Failed to authenticate with Atlas API");
    }
  }
}
