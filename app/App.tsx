import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';

interface FuelStation {
  id: number;
  adresse: string;
  ville: string;
  sp98_prix: number;
}

export default function App() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCheapestSP98 = async () => {
    try {
      // Using 10.0.2.2 for Android Emulator to reach local host
      const response = await fetch('http://10.0.2.2:8080/api/fuel/sp98/cheapest?limit=10');
      const data = await response.json();
      setStations(data.stations);
    } catch (error) {
      console.error('Error fetching fuel data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheapestSP98();
  }, []);

  const renderStation = ({ item }: { item: FuelStation }) => (
    <View style={styles.card}>
      <Text style={styles.price}>{item.sp98_prix.toFixed(3)} €</Text>
      <Text style={styles.address}>{item.adresse}</Text>
      <Text style={styles.city}>{item.ville}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>⛽ SP98 Cheapest</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00ff00" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={stations}
          renderItem={renderStation}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark mode by default for bikers
  },
  header: {
    padding: 20,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff00', // Neon green for contrast
  },
  list: {
    padding: 10,
  },
  card: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#00ff00',
    // Thick-glove targets - generous padding and size
    minHeight: 100,
  },
  price: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  address: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 5,
  },
  city: {
    fontSize: 14,
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
