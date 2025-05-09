import SHA256 from 'crypto-js/sha256';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


const DecodeScreen = () => {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const getHashedDeviceId = () => {
      if (Platform.OS === 'web') {
        let storedId = localStorage.getItem('web_device_id');
        if (!storedId) {
          const rawId = navigator.userAgent + navigator.language + screen.width + screen.height + new Date().getTimezoneOffset();
          const hashed = SHA256(rawId).toString().slice(0, 10);
          localStorage.setItem('web_device_id', hashed);
          return hashed;
        }
        return storedId;
      }
    
      const uniqueId = Device.osBuildId ?? Device.modelId ?? Device.model;
      const hashedId = SHA256(uniqueId).toString();
      return hashedId.slice(0, 10);
    };
    

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission denied!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });

        if (!result.canceled && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
            setMessage(null);
        }
    };

    const handleDecode = async () => {
        if (!imageUri) {
            alert('Please select an image');
            return;
        }

        setLoading(true);
        setMessage(null);

        const fileName = imageUri.split('/').pop();
        const fileType = fileName?.split('.').pop();

        const formData = new FormData();
        if (Platform.OS === 'web') {
          const res = await fetch(imageUri);
          const blob = await res.blob();
          const mime = blob.type || 'image/jpeg';
        
          const file = new File([blob], fileName ?? 'image.jpg', { type: mime });
          formData.append('image', file);
        } else {
          formData.append('image', {
            uri: imageUri,
            name: fileName,
            type: fileType === 'png' ? 'image/png' : 'image/jpeg',
          } as any);
        }
        
        formData.append('device_id', getHashedDeviceId());

        try {
          const response = await fetch('https://hacksheild-backend.onrender.com/decode', {
            method: 'POST',
            body: formData,
          });
          

            const data = await response.json();
            if (data.success && data.secret) {
                setMessage(`Message: ${data.secret}`);
            } else {
                alert(data.message || 'Decoding failed.');
            }
        } catch (error) {
            console.error('🔥 Decode error:', error);
            alert('Server error while decoding.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={imageUri ? styles.container : styles.centeredContainer}>
            <Text style={styles.title}>🔍 Decode Secret</Text>

            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Text style={styles.uploadText}>{imageUri ? 'Change Image' : 'Upload Image'}</Text>
            </TouchableOpacity>

            {imageUri && (
                <>
                    <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
                    <Text style={styles.deviceId}>
                        Your ID: <Text style={{ color: '#facc15' }}>{getHashedDeviceId()}</Text>
                    </Text>

                    <TouchableOpacity style={styles.decodeButton} onPress={handleDecode}>
                        <Text style={styles.decodeText}>Verify Block</Text>
                    </TouchableOpacity>
                </>
            )}

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#facc15" />
                    <Text style={styles.loadingText}>Processing...</Text>
                </View>
            )}

            {message && (
                <View style={styles.result}>
                    <Text style={styles.resultText}>{message}</Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 16,
    },

    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 20,
    },
    uploadButton: {
        backgroundColor: '#facc15',
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 20,
        width: 220,
    },
    uploadText: {
        color: 'black',
        fontWeight: '600',
        fontSize: 18,
        textAlign: 'center',
    },
    image: {
        width: '100%',
        height: undefined,
        aspectRatio: 1,
        borderRadius: 12,
        marginBottom: 16,
    },
    deviceId: {
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 16,
    },
    decodeButton: {
        backgroundColor: '#3b82f6',
        paddingVertical: 12,
        borderRadius: 12,
    },
    decodeText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 18,
        textAlign: 'center',
        width: 220,

    },
    result: {
        marginTop: 30,
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 12,
    },
    resultText: {
        color: '#facc15',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    centeredContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 16,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },

    loadingText: {
        marginTop: 16,
        color: '#facc15',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },


});

export default DecodeScreen;
