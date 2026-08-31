import Studio from "@/components/Studio";
import {
  getDisclosure,
  getMeasurementDisclosure,
  type ProcessingDisclosure,
} from "@/lib/compliance/disclosure";
import { measurementProviderName } from "@/lib/measure/config";
import { getProvider } from "@/lib/tryon";

/**
 * Read at request time, not build time. Prerendering would bake in whichever
 * provider was configured on the build machine, so deploying with a different
 * `TRYON_PROVIDER` than you built with would show consent copy describing a
 * provider that is not running — the precise drift this module exists to stop.
 */
export const dynamic = "force-dynamic";

/**
 * A server component so the processing facts are resolved where
 * `TRYON_PROVIDER` is readable, and arrive in the client as props. The
 * alternative — fetching them — would leave the consent copy briefly absent on
 * a panel whose whole job is to state what happens before anything happens.
 */
export default function Home() {
  const measurementProvider = measurementProviderName();
  return (
    <Studio
      disclosure={resolveDisclosure()}
      measurementDisclosure={resolveMeasurementDisclosure(measurementProvider)}
      measurementProvider={measurementProvider}
    />
  );
}

/** Same contract as `resolveDisclosure`: never throws, closes the path instead. */
function resolveMeasurementDisclosure(provider: string): ProcessingDisclosure | null {
  try {
    return getMeasurementDisclosure(provider);
  } catch (error) {
    console.error(
      "[compliance] no measurement disclosure available; photo path disabled:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Never throws. A misconfigured provider should not take down the page — but it
 * must close the photo path, because consent cannot be asked for processing we
 * are unable to describe. `ConsentGate` renders that state.
 */
function resolveDisclosure(): ProcessingDisclosure | null {
  try {
    return getDisclosure(getProvider().name);
  } catch (error) {
    console.error(
      "[compliance] no processing disclosure available; photo path disabled:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
