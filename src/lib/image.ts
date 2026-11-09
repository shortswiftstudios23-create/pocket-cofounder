import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
const MAX_SIDE = 1280;
/** Resize (never upscale) + JPEG re-encode at 0.7. Re-encoding drops EXIF/GPS on web (canvas) and native; the server strips again anyway. */
export async function compress(uri: string) {
  const probe = await ImageManipulator.manipulateAsync(uri, []);
  const longest = Math.max(probe.width, probe.height);
  const actions = longest > MAX_SIDE ? [{ resize: probe.width >= probe.height ? { width: MAX_SIDE } : { height: MAX_SIDE } }] : [];
  return ImageManipulator.manipulateAsync(uri, actions, { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
}
export async function pickImage(source: 'camera' | 'library'): Promise<string | null> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? 'Camera permission is off.' : 'Photo permission is off.');
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
  const r = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  return r.canceled ? null : r.assets[0].uri;
}
/** Compress, then upload to the private `proofs` bucket under the user's folder. Returns the storage path. */
export async function uploadProofImage(uid: string, uri: string): Promise<string> {
  const c = await compress(uri);
  const bin = atob(c.base64!); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('proofs').upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}
