import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";
import firebaseConfig from "../../firebase-applet-config.json";

// In-memory token storage (never persist access token in localStorage for security)
let cachedDriveAccessToken: string | null = null;
let cachedDriveUserEmail: string | null = null;

export interface GoogleDriveUser {
  email: string;
  name?: string;
  picture?: string;
}

export interface GoogleDriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
}

/**
 * Initializes or requests a Google OAuth Access Token with the drive.file scope.
 * Supports Google Identity Services (GIS) token client if available, with fallback to Firebase signInWithPopup.
 */
export async function connectGoogleDrive(): Promise<{ accessToken: string; email: string }> {
  // If we already have a valid cached token and user email in memory, return it
  if (cachedDriveAccessToken && cachedDriveUserEmail) {
    return { accessToken: cachedDriveAccessToken, email: cachedDriveUserEmail };
  }

  // Attempt 1: Google Identity Services (GIS) Token Client (cleanest, doesn't interfere with current Firebase session)
  const gisAvailable = typeof window !== "undefined" && (window as any).google?.accounts?.oauth2;
  const oauthClientId = (firebaseConfig as any)?.oAuthClientId;

  if (gisAvailable && oauthClientId) {
    try {
      const tokenPromise = new Promise<{ accessToken: string; email: string }>((resolve, reject) => {
        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: oauthClientId,
            scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
            callback: async (tokenResponse: any) => {
              if (tokenResponse.error) {
                reject(new Error(`Erro de autenticação Google: ${tokenResponse.error}`));
                return;
              }
              const accessToken = tokenResponse.access_token;
              cachedDriveAccessToken = accessToken;

              // Fetch user profile email
              let email = auth.currentUser?.email || "";
              try {
                const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (userRes.ok) {
                  const userData = await userRes.json();
                  email = userData.email || email;
                }
              } catch (e) {
                console.warn("Não foi possível buscar e-mail da conta Google via userinfo:", e);
              }

              cachedDriveUserEmail = email;
              resolve({ accessToken, email });
            },
          });

          client.requestAccessToken({ prompt: "consent" });
        } catch (err) {
          reject(err);
        }
      });

      return await tokenPromise;
    } catch (gisError) {
      console.warn("Falha no Google Identity Services, tentando via Firebase Auth popup:", gisError);
    }
  }

  // Attempt 2: Firebase Auth signInWithPopup with GoogleAuthProvider
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/drive.file");
  provider.addScope("https://www.googleapis.com/auth/userinfo.email");
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error("Não foi possível obter o token de acesso do Google Drive.");
  }

  cachedDriveAccessToken = credential.accessToken;
  cachedDriveUserEmail = result.user?.email || auth.currentUser?.email || "usuario@google.com";

  return {
    accessToken: cachedDriveAccessToken,
    email: cachedDriveUserEmail,
  };
}

/**
 * Returns currently cached Google Drive access token, if any.
 */
export function getCachedDriveAccessToken(): string | null {
  return cachedDriveAccessToken;
}

/**
 * Returns currently connected Google Drive user email, if any.
 */
export function getCachedDriveUserEmail(): string | null {
  return cachedDriveUserEmail;
}

/**
 * Disconnects the in-memory Google Drive session.
 */
export function disconnectGoogleDrive(): void {
  cachedDriveAccessToken = null;
  cachedDriveUserEmail = null;
}

/**
 * Uploads a file directly to the user's Google Drive via multipart REST API v3.
 * Uses the restricted drive.file scope so the app only accesses its own created files.
 */
export async function uploadFileToGoogleDrive(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string = "application/json"
): Promise<GoogleDriveUploadResult> {
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: "Backup de Segurança e Custódia Documental - Instituto Elo Psicologia",
  };

  const boundary = "-------EloBackupBoundary" + Math.random().toString(36).substring(2);
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelim;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    let errorDetails = "";
    try {
      const errJson = await response.json();
      errorDetails = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetails = await response.text();
    }

    if (response.status === 401) {
      // Invalidate expired token
      cachedDriveAccessToken = null;
      throw new Error("Sessão do Google Drive expirada. Por favor, conecte-se novamente.");
    }

    throw new Error(`Falha no upload para o Google Drive (${response.status}): ${errorDetails}`);
  }

  const result: GoogleDriveUploadResult = await response.json();
  return result;
}
