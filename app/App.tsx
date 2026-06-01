import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';

interface FuelStation {
  id: number;
  adresse: string;
  ville: string;
  sp98_prix?: number;
  sp95_prix?: number;
  e10_prix?: number;
}

type FuelType = 'sp98' | 'sp95' | 'e10';

export default function App() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fuelType, setFuelType] = useState<FuelType>('sp98');

  const fetchCheapestFuel = async (type: FuelType) => {
    setLoading(true);
    try {
      const response = await fetch(`http://10.0.2.2:8080/api/fuel/cheapest?type=${type}&limit=10`);
      const data = await response.json();
      setStations(data.stations);
    } catch (error) {
      console.error('Error fetching fuel data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheapestFuel(fuelType);
  }, [fuelType]);

  const renderStation = ({ item }: { item: FuelStation }) => {
    const price = item[`${fuelType}_prix` as keyof FuelStation];
    return (
      <View style={styles.card}>
        <Text style={styles.price}>{price ? (price as number).toFixed(3) : 'N/A'} €</Text>
        <Text style={styles.address}>{item.adresse}</Text>
        <Text style={styles.city}>{item.ville}</Text>
      </View>
    );
  };

  const FuelButton = ({ type, label }: { type: FuelType; label: string }) => (
    <TouchableOpacity
      style={[styles.fuelButton, fuelType === type && styles.activeButton]}
      onPress={() => setFuelType(type)}
    >
      <Text style={[styles.buttonText, fuelType === type && styles.activeText]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>⛽ NomadRide Fuel</Text>
        <View style={styles.selector}>
          <FuelButton type="sp98" label="SP98" />
          <FuelButton type="sp95" label="SP95" />
          <FuelButton type="e10" label="E10" />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00ff00" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={stations}
          renderItem={renderStation}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No stations found for this fuel type.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
    color: '#00ff00',
    marginBottom: 15,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  fuelButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#00ff00',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activeText: {
    color: '#000',
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
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
});
