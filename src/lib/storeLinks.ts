import { Linking } from "react-native";

export interface Store {
  id: string;
  label: string;
  searchUrl: (query: string) => string;
}

export const STORES: Store[] = [
  {
    id: "trendyol",
    label: "Trendyol",
    searchUrl: (q) => `https://www.trendyol.com/sr?q=${q}`,
  },
  {
    id: "hepsiburada",
    label: "Hepsiburada",
    searchUrl: (q) => `https://www.hepsiburada.com/ara?q=${q}`,
  },
  {
    id: "ikea",
    label: "IKEA",
    searchUrl: (q) => `https://www.ikea.com.tr/arama?k=${q}`,
    },
];

export function openStore(store: Store, searchTerm: string) {
  const term = searchTerm.trim();

  if (!term) {
    console.warn("search term is empty!");
    return;
  }

  const url = store.searchUrl(encodeURIComponent(term));

  console.log("Search term:", term);
  console.log("URL:", url);

  Linking.openURL(url).catch((error) => {
    console.error("Store couldn't open:", error);
  });
}