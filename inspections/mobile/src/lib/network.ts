import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function useNetwork() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    NetInfo.fetch().then((s: NetInfoState) => setOnline(!!s.isConnected && s.isInternetReachable !== false));
    const unsub = NetInfo.addEventListener((s: NetInfoState) => {
      setOnline(!!s.isConnected && s.isInternetReachable !== false);
    });
    return () => unsub();
  }, []);

  return { online };
}

// Permet de s'abonner aux changements réseau pour déclencher une sync.
export function onNetworkChange(callback: (online: boolean) => void) {
  return NetInfo.addEventListener((s: NetInfoState) => {
    callback(!!s.isConnected && s.isInternetReachable !== false);
  });
}
