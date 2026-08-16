/**
 * expire-parking-broadcasts — TTL sweep cron.
 * Trigger: hosted pg_cron + pg_net (see docs/archive/operations/scheduled-jobs-and-testing.md).
 */

import {
  runExpireParkingBroadcasts,
  verifyParkingBroadcastExpireCronSecret,
} from '../_shared/parkingBroadcastExpireCron.ts';
import { serveCronPost } from '../_shared/serveEdge.ts';

serveCronPost(
  'expire-parking-broadcasts',
  verifyParkingBroadcastExpireCronSecret,
  runExpireParkingBroadcasts
);
