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
 * The two things a guard does with a site: get directions to it, and check how far away they are. The
 * phone's location is read only when that button is pressed. Renders nothing for a site with no address.
 */
export function SiteActions({ site }: { site: RequestDetail['site'] }) {
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

  if (!destination) return null;

  return (
    <View className="gap-2">
      <View className="flex-row gap-3">
        {hasPoint ? (
          <View className="flex-1">
            <Button title="How far am I?" variant="secondary" loading={checking} onPress={checkDistance} />
          </View>
        ) : null}
        {/* Directions is the main thing to do with a site, so it is the primary button, on the right. */}
        <View className="flex-1">
          <Button title="Directions" icon={ICONS.location} onPress={openMaps} />
        </View>
      </View>
      {away ? (
        <Text variant="small" tone="secondary" className="text-center" accessibilityLiveRegion="polite">
          You are about {away} from the site
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Where the guard has to be: the site's address, then directions and a distance check. Shared by the job
 * (offer) details and the shift details, so both show the same thing.
 */
export function SiteCard({ site, name, title = 'Site' }: { site: RequestDetail['site']; name: string; title?: string }) {
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
      <SiteActions site={site} />
    </View>
  );
}
