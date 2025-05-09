import SHA256 from 'crypto-js/sha256';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';



const EncodeScreen = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [to, setTo] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [savedUri, setSavedUri] = useState<string | null>(null);
  


  const getHashedDeviceId = () => {
    if (Platform.OS === 'web') {
      // Check localStorage for existing ID
      let storedId = localStorage.getItem('web_device_id');
      if (!storedId) {
        const rawId = navigator.userAgent + navigator.language + screen.width + screen.height + new Date().getTimezoneOffset();
        const hashed = SHA256(rawId).toString().slice(0, 10);
        localStorage.setItem('web_device_id', hashed);
        return hashed;
      }
      return storedId;
    }
  
    // Native (mobile) fallback
    const uniqueId = Device.osBuildId ?? Device.modelId ?? Device.model;
    const hashedId = SHA256(uniqueId).toString();
    return hashedId.slice(0, 10);
  };
  
  

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri || !to || !secret) {
      alert('Please fill in all fields and upload an image.');
      return;
    }
  
    setLoading(true);
    const fileName = imageUri.split('/').pop();
    const fileType = fileName?.split('.').pop();
    const formData = new FormData();
  
    try {
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
  
      formData.append('recipient', to);
      formData.append('device_id', getHashedDeviceId());
      formData.append('secret', secret);
  
      const response = await fetch('https://hacksheild-backend.onrender.com/encode', {
        method: 'POST',
        body: formData,
      });
  
      const data = await response.json();
  
      if (data.success && data.image_base64) {
        if (Platform.OS !== 'web') {
          const permission = await MediaLibrary.requestPermissionsAsync();
          if (!permission.granted) {
            alert('Permission to save image denied.');
            return;
          }
  
          const fileUri = FileSystem.documentDirectory + `block_${Date.now()}.encoded.png`;
  
          await FileSystem.writeAsStringAsync(fileUri, data.image_base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
  
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          await MediaLibrary.createAlbumAsync('gallery', asset, false);
  
          setSavedUri(fileUri);
          setShowModal(true);
        }
  
        alert('Message encoded successfully!');
        if (Platform.OS === 'web' && data.image_base64) {
          const link = document.createElement('a');
          link.href = `data:image/png;base64,${data.image_base64}`;
          link.download = `block_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        alert('Encoding failed.');
      }
    } catch (error) {
      console.error('🔥 Error saving:', error);
      alert('Server error occurred.');
    } finally {
      setLoading(false);
    }
  };
  



  return (

    <ScrollView contentContainerStyle={imageUri ? styles.container : styles.centeredContainer}>
      <View style={styles.headerContainer}>
        {!imageUri && (
          <>
            <Text style={styles.title}>🛡️ Hack Shield</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Text style={styles.uploadText}>{imageUri ? 'Change Image' : 'Upload Image'}</Text>
            </TouchableOpacity>
          </>
        )}

      </View>



      {imageUri && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Block:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter recipient name"
              placeholderTextColor="#aaa"
              value={to}
              onChangeText={setTo}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Encrypted Payload:</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Enter secret message"
              placeholderTextColor="#aaa"
              value={secret}
              onChangeText={setSecret}
              multiline
            />
          </View>

          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#facc15" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}


          <Text style={styles.deviceId}>
            Your Block ID: <Text style={{ color: '#facc15' }}>{getHashedDeviceId()}</Text>
          </Text>

          <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
            <Text style={styles.uploadText}>Change Image</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Mine & Embed Block</Text>
          </TouchableOpacity>
          {showModal && savedUri && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>✅ Block Mined & Saved</Text>
      <TouchableOpacity
        style={styles.modalButton}
        onPress={async () => {
          const Sharing = await import('expo-sharing');
          if (!(await Sharing.isAvailableAsync())) {
            alert('Sharing not available');
            return;
          }
          await Sharing.shareAsync(savedUri);
        }}
      >
        <Text style={styles.modalButtonText}>📤 Share Image</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          setShowModal(false);
          setTo('');
          setSecret('');
          setImageUri(null);
          setSavedUri(null);
        }}
      >
        <Text style={styles.modalClose}>❌ Close</Text>
      </TouchableOpacity>
    </View>
  </View>
)}


        </>
        
      )}

    </ScrollView>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
    paddingTop: 60,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginRight: 2,
    paddingRight: 1,
  },
  uploadButton: {
    backgroundColor: '#facc15',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    width: 220, // ✅ Fixed width
  },

  uploadText: {
    color: 'black',
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#facc15',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
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
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
  headerContainer: (showTitle: boolean) => ({
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: showTitle ? 60 : 0,
    marginBottom: showTitle ? 30 : 10,
  }),

  centeredContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 16,
  },
  changeImageButton: {
    backgroundColor: '#facc15',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
    width: '100%',
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
    zIndex: 999, // Ensure it’s above everything
  },

  loadingText: {
    marginTop: 16,
    color: '#facc15',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    color: '#facc15',
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 12,
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  modalClose: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  

});


export default EncodeScreen;
