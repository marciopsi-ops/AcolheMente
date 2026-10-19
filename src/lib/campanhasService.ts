import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { CampanhaMesData, CampanhasConfigState } from "../types/campanhas";
import { CATALOGO_CAMPANHAS_PADRAO, CONFIG_CAMPANHAS_INICIAL } from "../data/campanhasCatalog";

const STORAGE_KEY = "acolhemente_campanhas_banner_config";
const FIRESTORE_COLLECTION = "configuracoes";
const FIRESTORE_DOC = "campanhas_banner";

export function getLocalCampanhasConfig(): CampanhasConfigState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...CONFIG_CAMPANHAS_INICIAL,
        ...parsed,
        customizacoes: {
          ...CONFIG_CAMPANHAS_INICIAL.customizacoes,
          ...(parsed.customizacoes || {}),
        },
      };
    }
  } catch (err) {
    console.warn("Falha ao carregar config local de campanhas:", err);
  }
  return CONFIG_CAMPANHAS_INICIAL;
}

export function saveLocalCampanhasConfig(config: CampanhasConfigState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("campanhas-config-updated", { detail: config }));
  } catch (err) {
    console.warn("Falha ao salvar config local de campanhas:", err);
  }
}

export async function fetchCampanhasConfig(): Promise<CampanhasConfigState> {
  const local = getLocalCampanhasConfig();
  if (!db) return local;

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remote = snap.data() as Partial<CampanhasConfigState>;
      const merged: CampanhasConfigState = {
        ...CONFIG_CAMPANHAS_INICIAL,
        ...remote,
        customizacoes: {
          ...CONFIG_CAMPANHAS_INICIAL.customizacoes,
          ...(remote.customizacoes || {}),
        },
      };
      saveLocalCampanhasConfig(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Falha ao buscar config remota de campanhas, usando local:", err);
  }
  return local;
}

export async function saveCampanhasConfig(config: CampanhasConfigState): Promise<void> {
  // 1. Salva localmente de imediato
  saveLocalCampanhasConfig(config);

  // 2. Salva no Firestore
  if (!db) return;
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn("Falha ao salvar config de campanhas no Firestore:", err);
    // Mesmo com erro de permissão no Firestore, o localStorage mantém salvo
  }
}

export function subscribeCampanhasConfig(callback: (config: CampanhasConfigState) => void): () => void {
  // Callback imediato com dados locais
  callback(getLocalCampanhasConfig());

  // Listener para eventos locais entre janelas/componentes
  const handleLocalUpdate = (e: any) => {
    if (e.detail) {
      callback(e.detail);
    } else {
      callback(getLocalCampanhasConfig());
    }
  };
  window.addEventListener("campanhas-config-updated", handleLocalUpdate);

  // Listener em tempo real do Firestore se db disponível
  let unsubFirestore: (() => void) | null = null;
  if (db) {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
      unsubFirestore = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const remote = snap.data() as Partial<CampanhasConfigState>;
          const merged: CampanhasConfigState = {
            ...CONFIG_CAMPANHAS_INICIAL,
            ...remote,
            customizacoes: {
              ...CONFIG_CAMPANHAS_INICIAL.customizacoes,
              ...(remote.customizacoes || {}),
            },
          };
          saveLocalCampanhasConfig(merged);
          callback(merged);
        }
      }, (err) => {
        console.warn("Aviso de snapshot de campanhas (modo offline ou sem permissão):", err);
      });
    } catch (err) {
      console.warn("Falha ao registrar snapshot Firestore de campanhas:", err);
    }
  }

  return () => {
    window.removeEventListener("campanhas-config-updated", handleLocalUpdate);
    if (unsubFirestore) unsubFirestore();
  };
}

export function resolveCampanhaAtiva(config: CampanhasConfigState): CampanhaMesData | null {
  if (!config.bannerAtivo) {
    return null;
  }

  let mesAtivo = 9;
  if (config.modoExibicao === "automatico") {
    mesAtivo = new Date().getMonth() + 1; // 1 a 12
  } else {
    mesAtivo = config.mesManual || 9;
  }

  const padrao = CATALOGO_CAMPANHAS_PADRAO.find((c) => c.mes === mesAtivo) || CATALOGO_CAMPANHAS_PADRAO[8];
  const custom = config.customizacoes?.[mesAtivo] || {};

  return {
    ...padrao,
    ...custom,
  };
}

export function getCampanhaDoMes(mes: number, config?: CampanhasConfigState): CampanhaMesData {
  const cfg = config || getLocalCampanhasConfig();
  const padrao = CATALOGO_CAMPANHAS_PADRAO.find((c) => c.mes === mes) || CATALOGO_CAMPANHAS_PADRAO[8];
  const custom = cfg.customizacoes?.[mes] || {};
  return {
    ...padrao,
    ...custom,
  };
}
