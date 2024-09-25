import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { WebView } from 'react-native-webview';
import * as Network from 'expo-network';

const db = SQLite.openDatabase('videomngr.db');

export default function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideoForDevice = async () => {
      try {
        // Obter o IP do dispositivo
        const ip = await Network.getIpAddressAsync();

        if (!ip) {
          throw new Error('Não foi possível obter o IP do dispositivo');
        }

        // Buscar o número da filial com base no IP
        db.transaction(tx => {
          tx.executeSql(
            'SELECT nroempresa FROM filiais WHERE faixaip = ?',
            [ip],
            (txObj, { rows }) => {
              if (rows.length > 0) {
                const nroempresa = rows._array[0].nroempresa;

                // Buscar o vídeo ativo correspondente à filial
                tx.executeSql(
                  `SELECT url FROM videos 
                   WHERE nroempresa = ? 
                   AND ativo = 1 
                   AND periodoini <= date('now') 
                   AND periodofim >= date('now')`,
                  [nroempresa],
                  (txObj, { rows }) => {
                    if (rows.length > 0) {
                      setVideoUrl(rows._array[0].url);
                    } else {
                      setError('Nenhum vídeo ativo encontrado para esta filial');
                    }
                    setLoading(false);
                  },
                  (txObj, error) => {
                    console.error('Erro ao buscar vídeo:', error);
                    setError('Erro ao buscar vídeo');
                    setLoading(false);
                  }
                );
              } else {
                setError('Filial não encontrada para este IP');
                setLoading(false);
              }
            },
            (txObj, error) => {
              console.error('Erro ao buscar filial:', error);
              setError('Erro ao buscar filial');
              setLoading(false);
            }
          );
        });
      } catch (err) {
        console.error('Erro ao buscar vídeo:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchVideoForDevice();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Erro: {error}</Text>
      </View>
    );
  }

  if (!videoUrl) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Nenhum vídeo disponível</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <WebView source={{ uri: videoUrl }} style={{ flex: 1 }} />
    </View>
  );
}
