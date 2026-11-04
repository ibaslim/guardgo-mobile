import { useState } from 'react';
import { View } from 'react-native';
import { useWatch, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import * as Location from 'expo-location';

import { FormTextField } from '@/components/form/form-fields';
import { Button } from '@/components/ui/button';
import { MapPicker } from '@/components/ui/map-picker';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';

export type CoordinatesFieldProps<T extends FieldValues> = {
  // `any` for the context and parsed-output types, like the other connected fields.
  control: Control<T, any, any>;
  latitudeName: FieldPath<T>;
  longitudeName: FieldPath<T>;
  /** Called with the new coordinates (as text, 6 decimals) from the map or the device location. */
  onPick: (latitude: string, longitude: string) => void;
  /** Help text under the title. */
  description?: string;
  /** Focus moves here after the longitude field. */
  onDone?: () => void;
};

/**
 * Latitude and longitude with three ways to set them: the phone's location, a Google map, or typing.
 * Used for operational sites and for a guard's home location.
 */
export function CoordinatesField<T extends FieldValues>({
  control,
  latitudeName,
  longitudeName,
  onPick,
  description,
  onDone,
}: CoordinatesFieldProps<T>) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string>();
  const [mapOpen, setMapOpen] = useState(false);
  const latitude = useWatch({ control, name: latitudeName });
  const longitude = useWatch({ control, name: longitudeName });
  const lat = Number(latitude);
  const lng = Number(longitude);
  const initialPin = latitude && longitude && Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;

  async function useCurrentLocation() {
    setLocating(true);
    setLocationError(undefined);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setLocationError('Location permission was denied. Allow it in Settings, or type the coordinates.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      onPick(coords.latitude.toFixed(6), coords.longitude.toFixed(6));
    } catch {
      setLocationError('Could not get your location. Turn on location services, or type the coordinates.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View className="gap-4">
      <Text variant="label">Coordinates</Text>
      {description ? <Text tone="secondary">{description}</Text> : null}
      <Button title="Choose on map" variant="outline" icon={ICONS.location} onPress={() => setMapOpen(true)} />
      <Button
        title="Use my current location"
        variant="secondary"
        icon={ICONS.location}
        loading={locating}
        onPress={useCurrentLocation}
      />
      <MapPicker
        visible={mapOpen}
        initial={initialPin}
        onClose={() => setMapOpen(false)}
        onConfirm={(pin) => {
          onPick(pin.latitude.toFixed(6), pin.longitude.toFixed(6));
          setMapOpen(false);
        }}
      />
      {locationError ? <Text tone="muted">{locationError}</Text> : null}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormTextField
            control={control}
            name={latitudeName}
            label="Latitude"
            placeholder="43.6532"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            returnKeyType="next"
            submitBehavior="submit"
          />
        </View>
        <View className="flex-1">
          <FormTextField
            control={control}
            name={longitudeName}
            label="Longitude"
            placeholder="-79.3832"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onDone}
          />
        </View>
      </View>
    </View>
  );
}
