import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, Animated } from 'react-native';

const BlockExplorer = () => {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [refreshing, setRefreshing] = useState(false);

  const fetchBlocks = async () => {
    try {
      const response = await fetch('http://192.168.60.169:5000/blocks');
      const data = await response.json();
      if (data.success) {
        setBlocks(data.blocks);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      } else {
        alert('Failed to fetch blocks');
      }
    } catch (error) {
      console.error('🔥 Fetch error:', error);
      alert('Server error while fetching blocks');
    } finally {
      setLoading(false);
    }
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBlocks();
    setRefreshing(false);
  };
  useEffect(() => {
    fetchBlocks(); // fetch initially
  
    const interval = setInterval(() => {
      fetchBlocks();
    }, 5000); // every 5 seconds
  
    return () => clearInterval(interval);
  }, []);
  

  const renderItem = ({ item, index }) => (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}> 
      <Text style={styles.blockTitle}>📦 Block #{blocks.length - index}</Text>
      <View style={styles.row}><Text style={styles.label}>Hash:</Text><Text style={styles.value}>{item.hash?.slice(0, 12)}...</Text></View>
      <View style={styles.row}><Text style={styles.label}>Device ID:</Text><Text style={styles.value}>{item.device_id}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Recipient:</Text><Text style={styles.value}>{item.recipient}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Timestamp:</Text><Text style={styles.value}>{item.timestamp?.split('T')[0] || '—'}</Text></View>
      <View style={styles.statusBox}><Text style={styles.status}>✅ Valid Block</Text></View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#facc15" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
  data={blocks}
  renderItem={renderItem}
  keyExtractor={(item, index) => item.hash + index}
  contentContainerStyle={{ padding: 16 }}
  onRefresh={handleRefresh}
  refreshing={refreshing}
/>

      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    transform: [{ scale: 1 }],
  },
  blockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#facc15',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusBox: {
    marginTop: 12,
    padding: 6,
    backgroundColor: '#064e3b',
    borderRadius: 8,
    alignItems: 'center',
  },
  status: {
    color: '#10b981',
    fontWeight: '700',
  },
});

export default BlockExplorer;