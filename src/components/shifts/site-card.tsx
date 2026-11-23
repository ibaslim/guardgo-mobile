import * as Location from 'expo-location';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { InfoCard } from '@/components/ui/info-card';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { toast } from '@/services/toast';
import type { RequestDetail } from '@/types/request';
import { distanceMeters, distanceText } from '@/utils/distance';

/**
 * Where the guard has to be: the site's address, a button to show it on the map, and a button to check
 * how far the guard is from it. The phone's location is read only when that button is pressed. Shared by
 * the job (offer) details and the shift details, so both show the same thing.
 */
export function SiteCard({ site, name, title = 'Site' }: { site: RequestDetail['site']; name: string; title?: string }) {
  const [checking, setChecking] = useState(false);
  const [away, setAway] = useState<string | null>(null);

  const latitude = Number(site.latitude);
  const longitude = Number(site.longitude);
  const hasPoint = site.latitude !== '' && site.longitude !== '' && Number.isFinite(latitude) && Number.isFinite(longitude);
  const destination = hasPoint ? `${latitude},${longitude}` : site.address;

  const openMaps = () => {
    if (!destination) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`).catch(() =>
      toast.failure("Couldn't open the maps app.")
    );
  };

  const checkDistance = async () => {
    setChecking(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        toast.failure('Allow location in Settings to see how far you are.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setAway(distanceText(distanceMeters(coords, { latitude, longitude })));
    } catch {
      toast.failure("Couldn't get your location. Turn on location services and try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <View className="gap-3">
      <InfoCard
        title={title}
        rows={[
          { label: 'Site', value: name },
          { label: 'Address', value: site.address },
          { label: 'Site contact', value: site.contact },
        ]}
      />
      {destination ? <Button title="Show on map" variant="secondary" icon={ICONS.location} onPress={openMaps} /> : null}
      {hasPoint ? (
        <View className="gap-2">
          <Button title="How far am I?" variant="outline" loading={checking} onPress={checkDistance} />
          {away ? (
            <Text tone="secondary" className="text-center" accessibilityLiveRegion="polite">
              You are about {away} from the site.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
